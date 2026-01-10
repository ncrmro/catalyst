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
	"fmt"
	"os"

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
func (r *EnvironmentReconciler) ReconcileHelmMode(ctx context.Context, env *catalystv1alpha1.Environment, namespace string, template *catalystv1alpha1.EnvironmentTemplate) (bool, error) {
	log := logf.FromContext(ctx)

	if template == nil {
		return false, fmt.Errorf("helm template is required")
	}

	chartPath := template.Path
	if chartPath == "" {
		return false, fmt.Errorf("chart path is required in template")
	}

	// For local testing/development, we use the local filesystem path.
	// In production, this would likely involve cloning the git repo first.
	// If the path starts with "/", assume absolute path (e.g. injected by test or volume)
	// If relative, we might need to resolve it relative to the controller's CWD
	if _, err := os.Stat(chartPath); os.IsNotExist(err) {
		// Try to see if we can find it in the current working directory or up a few levels (for tests)
		// This is a simple heuristic for the test environment
		if _, err := os.Stat("../../" + chartPath); err == nil {
			chartPath = "../../" + chartPath
		} else {
			return false, fmt.Errorf("chart not found at path: %s", chartPath)
		}
	}

	// Initialize Helm Action Config
	// We need to construct a REST Client Getter from the controller's config
	cfg := r.Config
	if cfg == nil {
		return false, fmt.Errorf("reconciler config is nil")
	}

	actionConfig := new(action.Configuration)
	if err := actionConfig.Init(
		&genericRESTClientGetter{cfg: cfg, namespace: namespace},
		namespace,
		os.Getenv("HELM_DRIVER"), // "secret", "configmap", "memory" or ""
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
		// TODO: Merge values from template.Values and env.Spec.Config
		vals := map[string]interface{}{}

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
		vals := map[string]interface{}{}

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
	return nil
}

func (l *genericConfigLoader) RawConfig() (clientcmdapi.Config, error) {
	return clientcmdapi.Config{}, nil
}

func (l *genericConfigLoader) ClientConfig() (*rest.Config, error) {
	return l.cfg, nil
}

func (l *genericConfigLoader) Namespace() (string, bool, error) {
	return l.namespace, true, nil
}
