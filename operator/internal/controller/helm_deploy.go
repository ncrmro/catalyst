/*
Copyright 2025.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/release"
	"helm.sh/helm/v3/pkg/storage/driver"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/discovery/cached/memory"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/restmapper"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
	logf "sigs.k8s.io/controller-runtime/pkg/log"

	catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

// ReconcileHelmMode handles the reconciliation for Helm deployment mode.
func (r *EnvironmentReconciler) ReconcileHelmMode(ctx context.Context, env *catalystv1alpha1.Environment, project *catalystv1alpha1.Project, namespace string, template *catalystv1alpha1.EnvironmentTemplate) (bool, error) {
	log := logf.FromContext(ctx)

	if template == nil {
		return false, fmt.Errorf("helm template is required")
	}

	// Prepare chart source (local path or clone from git)
	chartPath, cleanup, err := r.prepareChartSource(ctx, env, project, template)
	if err != nil {
		log.Error(err, "Failed to prepare chart source")
		if cleanup != nil {
			cleanup()
		}
		return false, err
	}
	if cleanup != nil {
		defer cleanup()
	}

	// Initialize Helm Action Config
	// We need to construct a REST Client Getter from the controller's config
	cfg := r.Config
	if cfg == nil {
		return false, fmt.Errorf("reconciler config is nil")
	}

	// Validate HELM_DRIVER to avoid passing unexpected values to Helm.
	helmDriver := os.Getenv("HELM_DRIVER")
	switch helmDriver {
	case "", "secret", "configmap", "memory":
		// allowed values; use as-is (empty string lets Helm pick its default)
	default:
		log.Info("Invalid HELM_DRIVER value detected, defaulting to 'secret'", "value", helmDriver)
		helmDriver = "secret"
	}

	actionConfig := new(action.Configuration)
	if err := actionConfig.Init(
		&genericRESTClientGetter{cfg: cfg, namespace: namespace},
		namespace,
		helmDriver,
		func(format string, v ...interface{}) {
			log.Info(fmt.Sprintf(format, v...))
		},
	); err != nil {
		return false, err
	}

	releaseName := env.Name // Use environment name as release name

	// Check if release exists
	histClient := action.NewHistory(actionConfig)
	histClient.Max = 1
	if _, err := histClient.Run(releaseName); err == driver.ErrReleaseNotFound {
		// Install
		log.Info("Installing Helm release", "release", releaseName, "chart", chartPath)
		install := action.NewInstall(actionConfig)
		install.ReleaseName = releaseName
		install.Namespace = namespace
		install.CreateNamespace = false // Namespace already managed by controller

		// Load Chart
		chartRequested, err := loader.Load(chartPath)
		if err != nil {
			return false, err
		}

		// Values
		vals, err := r.mergeHelmValues(template, env)
		if err != nil {
			return false, fmt.Errorf("failed to merge helm values: %w", err)
		}

		if _, err := install.Run(chartRequested, vals); err != nil {
			return false, err
		}
	} else if err != nil {
		return false, err
	} else {
		// Upgrade
		log.Info("Upgrading Helm release", "release", releaseName, "chart", chartPath)
		upgrade := action.NewUpgrade(actionConfig)
		upgrade.Namespace = namespace

		// Load Chart
		chartRequested, err := loader.Load(chartPath)
		if err != nil {
			return false, err
		}

		// Values
		vals, err := r.mergeHelmValues(template, env)
		if err != nil {
			return false, fmt.Errorf("failed to merge helm values: %w", err)
		}

		if _, err := upgrade.Run(releaseName, chartRequested, vals); err != nil {
			return false, err
		}
	}

	// Verify status (simple check if release is deployed)
	statusClient := action.NewStatus(actionConfig)
	rel, err := statusClient.Run(releaseName)
	if err != nil {
		return false, err
	}

	if rel.Info.Status == release.StatusDeployed {
		return true, nil
	}

	return false, nil
}

// prepareChartSource resolves the chart path, cloning the repository if necessary.
func (r *EnvironmentReconciler) prepareChartSource(ctx context.Context, env *catalystv1alpha1.Environment, project *catalystv1alpha1.Project, template *catalystv1alpha1.EnvironmentTemplate) (string, func(), error) {
	log := logf.FromContext(ctx)

	// If no SourceRef, assume local path (for testing or pre-baked images)
	if template.SourceRef == "" {
		chartPath := template.Path
		if chartPath == "" {
			return "", nil, fmt.Errorf("chart path is required")
		}

		// Check if local path exists
		if _, err := os.Stat(chartPath); os.IsNotExist(err) {
			return "", nil, fmt.Errorf("chart not found at path: %s", chartPath)
		}
		return chartPath, nil, nil
	}

	// Resolve SourceRef
	var sourceConfig *catalystv1alpha1.SourceConfig
	for _, s := range project.Spec.Sources {
		if s.Name == template.SourceRef {
			sourceConfig = &s
			break
		}
	}
	if sourceConfig == nil {
		return "", nil, fmt.Errorf("source ref '%s' not found in project", template.SourceRef)
	}

	// Determine Commit/Branch
	var commitSha string
	// Find the source in Environment spec to get specific commit
	for _, s := range env.Spec.Sources {
		if s.Name == template.SourceRef {
			commitSha = s.CommitSha
			break
		}
	}

	// Clone Repository
	tempDir, err := os.MkdirTemp("", "catalyst-chart-*")
	if err != nil {
		return "", nil, err
	}

	cleanup := func() {
		os.RemoveAll(tempDir)
	}

	log.Info("Cloning repository for chart", "url", sourceConfig.RepositoryURL, "commit", commitSha, "tempDir", tempDir)

	cloneOptions := &git.CloneOptions{
		URL: sourceConfig.RepositoryURL,
	}
	// Use a shallow clone when no specific commit is requested to reduce time and disk usage.
	// When a specific commit SHA is provided, we perform a full clone to ensure the commit is
	// available locally, as not all servers reliably support fetching arbitrary commits with
	// shallow history.
	if commitSha == "" {
		cloneOptions.Depth = 1
		cloneOptions.SingleBranch = true
	}

	_, err = git.PlainClone(tempDir, false, cloneOptions)
	if err != nil {
		cleanup()
		return "", nil, fmt.Errorf("failed to clone repo: %w", err)
	}

	// Checkout Commit if specified
	if commitSha != "" {
		repo, err := git.PlainOpen(tempDir)
		if err != nil {
			cleanup()
			return "", nil, fmt.Errorf("failed to open repo: %w", err)
		}
		w, err := repo.Worktree()
		if err != nil {
			cleanup()
			return "", nil, fmt.Errorf("failed to get worktree: %w", err)
		}
		err = w.Checkout(&git.CheckoutOptions{
			Hash: plumbing.NewHash(commitSha),
		})
		if err != nil {
			cleanup()
			return "", nil, fmt.Errorf("failed to checkout commit %s: %w", commitSha, err)
		}
	}

	// Resolve Path within repo
	chartPath := filepath.Join(tempDir, template.Path)
	if _, err := os.Stat(chartPath); os.IsNotExist(err) {
		cleanup()
		return "", nil, fmt.Errorf("chart not found at %s in repo %s", template.Path, sourceConfig.RepositoryURL)
	}

	return chartPath, cleanup, nil
}

// genericRESTClientGetter adapts the controller's rest.Config to Helm's RESTClientGetter interface
type genericRESTClientGetter struct {
	cfg       *rest.Config
	namespace string
}

func (g *genericRESTClientGetter) ToRESTConfig() (*rest.Config, error) {
	return g.cfg, nil
}

func (g *genericRESTClientGetter) ToDiscoveryClient() (discovery.CachedDiscoveryInterface, error) {
	config, err := g.ToRESTConfig()
	if err != nil {
		return nil, err
	}

	// Create a basic discovery client
	discoveryClient, err := discovery.NewDiscoveryClientForConfig(config)
	if err != nil {
		return nil, err
	}

	// Wrap it in memory cache
	return memory.NewMemCacheClient(discoveryClient), nil
}

func (g *genericRESTClientGetter) ToRESTMapper() (meta.RESTMapper, error) {
	discoveryClient, err := g.ToDiscoveryClient()
	if err != nil {
		return nil, err
	}

	mapper := restmapper.NewDeferredDiscoveryRESTMapper(discoveryClient)
	expander := restmapper.NewShortcutExpander(mapper, discoveryClient, nil)
	return expander, nil
}

func (g *genericRESTClientGetter) ToRawKubeConfigLoader() clientcmd.ClientConfig {
	return &genericConfigLoader{namespace: g.namespace, cfg: g.cfg}
}

type genericConfigLoader struct {
	namespace string
	cfg       *rest.Config
}

func (l *genericConfigLoader) ConfigAccess() clientcmd.ConfigAccess {
	// Return default client config loading rules to satisfy the interface contract.
	// This provides a non-nil ConfigAccess, though the actual REST configuration
	// used by callers comes from ClientConfig(), which is derived from l.cfg.
	return clientcmd.NewDefaultClientConfigLoadingRules()
}

func (l *genericConfigLoader) RawConfig() (clientcmdapi.Config, error) {
	// Construct a minimal kubeconfig that reflects the underlying rest.Config and namespace.
	// This makes RawConfig safe to use by callers that expect a non-empty configuration.
	cfg := clientcmdapi.NewConfig()

	const contextName = "default"
	const clusterName = "default"
	const authName = "default"

	// Initialize cluster information from the REST config.
	cfg.Clusters[clusterName] = &clientcmdapi.Cluster{
		Server:                   l.cfg.Host,
		InsecureSkipTLSVerify:    l.cfg.TLSClientConfig.Insecure,
		CertificateAuthorityData: l.cfg.TLSClientConfig.CAData,
	}

	// Initialize auth information from the REST config.
	cfg.AuthInfos[authName] = &clientcmdapi.AuthInfo{
		Token:                 l.cfg.BearerToken,
		ClientCertificateData: l.cfg.TLSClientConfig.CertData,
		ClientKeyData:         l.cfg.TLSClientConfig.KeyData,
	}

	// Bind cluster and auth info together in a context and set the namespace.
	cfg.Contexts[contextName] = &clientcmdapi.Context{
		Cluster:   clusterName,
		AuthInfo:  authName,
		Namespace: l.namespace,
	}

	cfg.CurrentContext = contextName

	return *cfg, nil
}

func (l *genericConfigLoader) ClientConfig() (*rest.Config, error) {
	return l.cfg, nil
}

func (l *genericConfigLoader) Namespace() (string, bool, error) {
	return l.namespace, true, nil
}

// mergeHelmValues merges values from template defaults and environment-specific config
func (r *EnvironmentReconciler) mergeHelmValues(template *catalystv1alpha1.EnvironmentTemplate, env *catalystv1alpha1.Environment) (map[string]interface{}, error) {
	vals := make(map[string]interface{})

	// Start with template values
	if template.Values.Raw != nil && len(template.Values.Raw) > 0 {
		if err := json.Unmarshal(template.Values.Raw, &vals); err != nil {
			return nil, fmt.Errorf("failed to unmarshal template values: %w", err)
		}
	}

	// Merge environment config (envVars, image, etc.)
	// Create a config section in values if there are any environment-specific configs
	if len(env.Spec.Config.EnvVars) > 0 {
		envVarsMap := make(map[string]string)
		for _, envVar := range env.Spec.Config.EnvVars {
			envVarsMap[envVar.Name] = envVar.Value
		}
		vals["env"] = envVarsMap
	}

	if env.Spec.Config.Image != "" {
		vals["image"] = map[string]interface{}{
			"repository": env.Spec.Config.Image,
		}
	}

	return vals, nil
}
