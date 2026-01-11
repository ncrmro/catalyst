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
	"fmt"
	"strings"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"

	catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

const (
	gitSyncImage       = "registry.k8s.io/git-sync/git-sync:v4.4.0"
	dockerfileGenImage = "alpine:3.19"
	kanikoImage        = "gcr.io/kaniko-project/executor:v1.20.0"
	gitSecretName      = "github-pat-secret"
	registrySecretName = "registry-credentials"
	registryInternal   = "registry.default.svc.cluster.local:5000"
)

// reconcileBuilds handles the build process for all defined builds in the template.
func (r *EnvironmentReconciler) reconcileBuilds(ctx context.Context, env *catalystv1alpha1.Environment, project *catalystv1alpha1.Project, namespace string, template *catalystv1alpha1.EnvironmentTemplate) (map[string]string, error) {
	log := logf.FromContext(ctx)
	builtImages := make(map[string]string)

	// Ensure Git Secret is present in target namespace
	if err := r.ensureGitSecret(ctx, project.Namespace, namespace); err != nil {
		return nil, err
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
	var commitSha string
	for _, s := range env.Spec.Sources {
		if s.Name == build.SourceRef {
			commitSha = s.CommitSha
			break
		}
	}
	if commitSha == "" {
		commitSha = "latest" // Should not happen in real usage
	}

	// Check if registry secret exists (for pushing)
	hasRegistrySecret := false
	secret := &corev1.Secret{}
	if err := r.Get(ctx, client.ObjectKey{Name: registrySecretName, Namespace: namespace}, secret); err == nil {
		hasRegistrySecret = true
	}

	// Image Tag
	imageName := fmt.Sprintf("%s/%s-%s", project.Name, build.Name, env.Name)
	imageTag := fmt.Sprintf("%s/%s:%s", registryInternal, imageName, commitSha)

	// Job Name
	jobName := fmt.Sprintf("build-%s-%s", build.Name, commitSha[:7])
	// Sanitize job name
	jobName = strings.ReplaceAll(jobName, "/", "-")
	jobName = strings.ToLower(jobName)

	// Check if Job exists
	job := &batchv1.Job{}
	err := r.Get(ctx, client.ObjectKey{Name: jobName, Namespace: namespace}, job)
	if err != nil {
		if apierrors.IsNotFound(err) {
			// Create Job
			log.Info("Creating Build Job", "job", jobName, "image", imageTag)
			job = desiredBuildJob(jobName, namespace, imageTag, sourceConfig.RepositoryURL, commitSha, branch, build, hasRegistrySecret)
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

// ensureGitSecret copies the git secret from source namespace to target namespace
func (r *EnvironmentReconciler) ensureGitSecret(ctx context.Context, sourceNs, targetNs string) error {
	// Check if secret exists in target
	targetSecret := &corev1.Secret{}
	err := r.Get(ctx, client.ObjectKey{Name: gitSecretName, Namespace: targetNs}, targetSecret)
	if err == nil {
		return nil // Already exists
	}
	if !apierrors.IsNotFound(err) {
		return err
	}

	// Get source secret
	sourceSecret := &corev1.Secret{}
	if err := r.Get(ctx, client.ObjectKey{Name: gitSecretName, Namespace: sourceNs}, sourceSecret); err != nil {
		if apierrors.IsNotFound(err) {
			return fmt.Errorf("git secret '%s' not found in namespace '%s' - required for build", gitSecretName, sourceNs)
		}
		return err
	}

	// Create copy
	newSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      gitSecretName,
			Namespace: targetNs,
		},
		Data: sourceSecret.Data,
		Type: sourceSecret.Type,
	}
	return r.Create(ctx, newSecret)
}

func desiredBuildJob(name, namespace, destination, repoURL, commit, branch string, build catalystv1alpha1.BuildSpec, hasRegistrySecret bool) *batchv1.Job {
	backoff := int32(0)

	// Volume mounts
	workspaceVolume := corev1.VolumeMount{Name: "workspace", MountPath: "/workspace"}
	gitSecretVolume := corev1.VolumeMount{Name: "git-secret", MountPath: "/etc/git-secret", ReadOnly: true}

	volumes := []corev1.Volume{
		{Name: "workspace", VolumeSource: corev1.VolumeSource{EmptyDir: &corev1.EmptyDirVolumeSource{}}},
		{Name: "git-secret", VolumeSource: corev1.VolumeSource{Secret: &corev1.SecretVolumeSource{SecretName: gitSecretName}}},
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

	// Git Sync Configuration
	gitSyncRoot := "/workspace"
	gitSyncDest := "source"
	workdir := fmt.Sprintf("/workspace/%s%s", gitSyncDest, build.Path)

	return &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
			Labels: map[string]string{
				"catalyst.dev/job-type": "build",
				"catalyst.dev/build":    build.Name,
			},
		},
		Spec: batchv1.JobSpec{
			BackoffLimit: &backoff,
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					RestartPolicy: corev1.RestartPolicyNever,
					Volumes:       volumes,
					InitContainers: []corev1.Container{
						// 1. Git Sync (One-Time Clone)
						{
							Name:  "git-sync",
							Image: gitSyncImage,
							Env: []corev1.EnvVar{
								{Name: "GIT_SYNC_REPO", Value: repoURL},
								{Name: "GIT_SYNC_REV", Value: commit},
								{Name: "GIT_SYNC_ONE_TIME", Value: "true"},
								{Name: "GIT_SYNC_ROOT", Value: gitSyncRoot},
								{Name: "GIT_SYNC_DEST", Value: gitSyncDest},
								{Name: "GIT_SYNC_USERNAME", Value: "x-access-token"},
								{Name: "GIT_SYNC_PASSWORD_FILE", Value: "/etc/git-secret/token"},
							},
							VolumeMounts: []corev1.VolumeMount{workspaceVolume, gitSecretVolume},
							SecurityContext: &corev1.SecurityContext{
								RunAsUser: ptr(int64(65533)),
							},
						},
						// 2. Dockerfile Generator (Zero-Config)
						{
							Name:    "dockerfile-gen",
							Image:   dockerfileGenImage,
							Command: []string{"/bin/sh", "-c"},
							Args: []string{
								`cd ` + workdir + ` && ` +
									`if [ ! -f Dockerfile ]; then 
									echo "No Dockerfile found. Generating default Node.js Dockerfile..."
									cat <<EOF > Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
EOF
								fi`,
							},
							VolumeMounts: []corev1.VolumeMount{workspaceVolume},
						},
					},
					Containers: []corev1.Container{
						// 3. Kaniko Build
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
							VolumeMounts: kanikoVolumeMounts,
						},
					},
				},
			},
		},
	}
}
