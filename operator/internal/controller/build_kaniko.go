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

//nolint:goconst
package controller

import (
	"context"
	_ "embed"
	"fmt"
	"os"
	"strings"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"

	catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

const (
	gitCloneImage        = "alpine/git:2.45.2"
	kanikoImage          = "gcr.io/kaniko-project/executor:v1.20.0"
	registrySecretName   = "registry-credentials"
	registryInternal     = "registry.default.svc.cluster.local:5000"
	gitScriptsConfigMap  = "catalyst-git-scripts"
	gitScriptsVolumeName = "git-scripts"
)

// getCatalystWebURL returns the URL for the Catalyst web service.
// It checks the CATALYST_WEB_URL environment variable first, falling back
// to the default in-cluster service URL in the catalyst-system namespace.
func getCatalystWebURL() string {
	if url := os.Getenv("CATALYST_WEB_URL"); url != "" {
		return url
	}
	return "http://catalyst-web.catalyst-system.svc.cluster.local:3000"
}

// Embed the git scripts at compile time
//
//go:embed scripts/git-credential-catalyst.sh
var gitCredentialHelperScript string

//go:embed scripts/git-clone.sh
var gitCloneScript string

// reconcileBuilds handles the build process for all defined builds in the template.
func (r *EnvironmentReconciler) reconcileBuilds(ctx context.Context, env *catalystv1alpha1.Environment, project *catalystv1alpha1.Project, namespace string, template *catalystv1alpha1.EnvironmentTemplate) (map[string]string, error) {
	log := logf.FromContext(ctx)
	builtImages := make(map[string]string)

	// Ensure git scripts ConfigMap exists in the namespace
	if err := r.ensureGitScriptsConfigMap(ctx, namespace); err != nil {
		return nil, fmt.Errorf("failed to ensure git scripts ConfigMap: %w", err)
	}

	// Iterate over builds
	for _, build := range template.Builds {
		imageTag, err := r.reconcileSingleBuild(ctx, env, project, namespace, build)
		if err != nil {
			return nil, err
		}
		if imageTag != "" {
			builtImages[build.Name] = imageTag
		}
	}

	// Check if all builds are ready
	if len(builtImages) < len(template.Builds) {
		log.Info("Waiting for builds to complete", "completed", len(builtImages), "total", len(template.Builds))
		return nil, nil // Return nil to signal not ready (caller should requeue)
	}

	return builtImages, nil
}

// ensureGitScriptsConfigMap creates or updates the ConfigMap containing git scripts
func (r *EnvironmentReconciler) ensureGitScriptsConfigMap(ctx context.Context, namespace string) error {
	configMap := &corev1.ConfigMap{}
	err := r.Get(ctx, client.ObjectKey{Name: gitScriptsConfigMap, Namespace: namespace}, configMap)

	desiredData := map[string]string{
		"git-credential-catalyst.sh": gitCredentialHelperScript,
		"git-clone.sh":               gitCloneScript,
	}

	if err != nil {
		if apierrors.IsNotFound(err) {
			// Create the ConfigMap
			configMap = &corev1.ConfigMap{
				ObjectMeta: metav1.ObjectMeta{
					Name:      gitScriptsConfigMap,
					Namespace: namespace,
					Labels: map[string]string{
						"catalyst.dev/component": "git-scripts",
					},
				},
				Data: desiredData,
			}
			return r.Create(ctx, configMap)
		}
		return err
	}

	// ConfigMap exists - check if it needs update
	needsUpdate := false
	for key, value := range desiredData {
		if configMap.Data[key] != value {
			needsUpdate = true
			break
		}
	}

	if needsUpdate {
		configMap.Data = desiredData
		return r.Update(ctx, configMap)
	}

	return nil
}

// reconcileSingleBuild manages the build job for a single artifact.
func (r *EnvironmentReconciler) reconcileSingleBuild(ctx context.Context, env *catalystv1alpha1.Environment, project *catalystv1alpha1.Project, namespace string, build catalystv1alpha1.BuildSpec) (string, error) {
	log := logf.FromContext(ctx)

	// Determine Source Config
	var sourceConfig *catalystv1alpha1.SourceConfig
	for _, s := range project.Spec.Sources {
		if s.Name == build.SourceRef {
			sourceConfig = &s
			break
		}
	}
	if sourceConfig == nil {
		return "", fmt.Errorf("source ref '%s' not found in project", build.SourceRef)
	}

	// Determine Commit/Branch
	var commit string
	for _, s := range env.Spec.Sources {
		if s.Name == build.SourceRef {
			if s.CommitSha != "" && s.CommitSha != "HEAD" {
				commit = s.CommitSha
			} else if s.Branch != "" {
				commit = s.Branch
			}
			break
		}
	}
	if commit == "" {
		commit = "latest" // Fallback
	}

	// Check if registry secret exists (for pushing)
	hasRegistrySecret := false
	secret := &corev1.Secret{}
	if err := r.Get(ctx, client.ObjectKey{Name: registrySecretName, Namespace: namespace}, secret); err == nil {
		hasRegistrySecret = true
	}

	// Image Tag
	imageName := fmt.Sprintf("%s/%s-%s", project.Name, build.Name, env.Name)
	imageTag := fmt.Sprintf("%s/%s:%s", registryInternal, imageName, commit)

	// Job Name
	// Use first 7 chars if it looks like a SHA, otherwise use sanitized branch name
	commitPart := commit
	if len(commitPart) > 7 {
		commitPart = commitPart[:7]
	}
	jobName := fmt.Sprintf("build-%s-%s", build.Name, commitPart)
	// Sanitize job name
	jobName = strings.ReplaceAll(jobName, "/", "-")
	jobName = strings.ReplaceAll(jobName, ".", "-")
	jobName = strings.ToLower(jobName)

	// Check if Job exists
	job := &batchv1.Job{}
	err := r.Get(ctx, client.ObjectKey{Name: jobName, Namespace: namespace}, job)
	if err != nil {
		if apierrors.IsNotFound(err) {
			// Validate githubInstallationId is set before creating Job
			// For private repos, this is required for the credential helper to work
			if project.Spec.GitHubInstallationId == "" {
				return "", fmt.Errorf("project.spec.githubInstallationId is required for builds but is not set")
			}

			// Create Job
			log.Info("Creating Build Job", "job", jobName, "image", imageTag, "installationId", project.Spec.GitHubInstallationId)
			job = desiredBuildJob(jobName, namespace, imageTag, sourceConfig.RepositoryURL, commit, project.Spec.GitHubInstallationId, build, hasRegistrySecret)
			if err := r.Create(ctx, job); err != nil {
				return "", err
			}
			return "", nil // Job started
		}
		return "", err
	}

	// Check Job Status
	if job.Status.Succeeded > 0 {
		return imageTag, nil
	}
	if job.Status.Failed > 0 {
		return "", fmt.Errorf("build job failed: %s", jobName)
	}

	return "", nil // Job running
}

func desiredBuildJob(name, namespace, destination, repoURL, commit, githubInstallationId string, build catalystv1alpha1.BuildSpec, hasRegistrySecret bool) *batchv1.Job {
	backoff := int32(0)
	defaultMode := int32(0755) // Make scripts executable

	// Volume mounts
	workspaceVolume := corev1.VolumeMount{Name: "workspace", MountPath: "/workspace"}
	scriptsVolume := corev1.VolumeMount{Name: gitScriptsVolumeName, MountPath: "/scripts", ReadOnly: true}

	volumes := []corev1.Volume{
		{Name: "workspace", VolumeSource: corev1.VolumeSource{EmptyDir: &corev1.EmptyDirVolumeSource{}}},
		{
			Name: gitScriptsVolumeName,
			VolumeSource: corev1.VolumeSource{
				ConfigMap: &corev1.ConfigMapVolumeSource{
					LocalObjectReference: corev1.LocalObjectReference{Name: gitScriptsConfigMap},
					DefaultMode:          &defaultMode,
				},
			},
		},
	}

	kanikoVolumeMounts := []corev1.VolumeMount{workspaceVolume}

	if hasRegistrySecret {
		volumes = append(volumes, corev1.Volume{
			Name: "registry-creds",
			VolumeSource: corev1.VolumeSource{
				Secret: &corev1.SecretVolumeSource{
					SecretName: registrySecretName,
					Items: []corev1.KeyToPath{
						{Key: ".dockerconfigjson", Path: "config.json"},
					},
				},
			},
		})
		kanikoVolumeMounts = append(kanikoVolumeMounts, corev1.VolumeMount{
			Name:      "registry-creds",
			MountPath: "/kaniko/.docker",
			ReadOnly:  true,
		})
	}

	// Git clone configuration
	gitCloneRoot := "/workspace"
	gitCloneDest := "source"
	workdir := fmt.Sprintf("/workspace/%s%s", gitCloneDest, build.Path)

	// Default Resources
	resources := corev1.ResourceRequirements{
		Requests: corev1.ResourceList{
			corev1.ResourceCPU:    resource.MustParse("100m"),
			corev1.ResourceMemory: resource.MustParse("1Gi"),
		},
		Limits: corev1.ResourceList{
			corev1.ResourceCPU:    resource.MustParse("1"),
			corev1.ResourceMemory: resource.MustParse("4Gi"),
		},
	}

	if build.Resources != nil {
		resources = *build.Resources
	}

	return &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
			Labels: map[string]string{
				"catalyst.dev/job-type":               "build",
				"catalyst.dev/build":                  build.Name,
				"catalyst.dev/github-installation-id": githubInstallationId,
			},
		},
		Spec: batchv1.JobSpec{
			BackoffLimit: &backoff,
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					RestartPolicy: corev1.RestartPolicyNever,
					Volumes:       volumes,
					InitContainers: []corev1.Container{
						// Git Clone with Credential Helper
						{
							Name:    "git-clone",
							Image:   gitCloneImage,
							Command: []string{"/scripts/git-clone.sh"},
							Env: []corev1.EnvVar{
								{Name: "INSTALLATION_ID", Value: githubInstallationId},
								{Name: "CATALYST_WEB_URL", Value: getCatalystWebURL()},
								{Name: "GIT_REPO_URL", Value: repoURL},
								{Name: "GIT_COMMIT", Value: commit},
								{Name: "GIT_CLONE_ROOT", Value: gitCloneRoot},
								{Name: "GIT_CLONE_DEST", Value: gitCloneDest},
							},
							VolumeMounts: []corev1.VolumeMount{workspaceVolume, scriptsVolume},
							Resources:    resources,
						},
					},
					Containers: []corev1.Container{
						// Kaniko Build
						{
							Name:  "kaniko",
							Image: kanikoImage,
							Args: []string{
								"--dockerfile=Dockerfile",
								"--context=dir://" + workdir,
								"--destination=" + destination,
								"--insecure", // Still needed for internal registry if not TLS
								"--cache=true",
							},
							Resources:    resources,
							VolumeMounts: kanikoVolumeMounts,
						},
					},
				},
			},
		},
	}
}
