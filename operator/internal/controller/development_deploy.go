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

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"

	catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

// Development mode constants - hardcoded templates based on .k3s-vm/manifests/base.json
const (
	nodeImage              = "node:22"
	postgresImage          = "postgres:16"
	gitCloneImage          = "alpine/git:latest"
	hostCodePath           = "/code"
	webWorkDir             = "/code/web"
	nodeModulesPath        = "/code/web/node_modules"
	nextCachePath          = "/code/web/.next"
	nodeModulesStorage     = "2Gi"
	nextCacheStorage       = "1Gi"
	postgresDataStorage    = "1Gi"
	codeStorage            = "1Gi"
	gitCredentialsSecret   = "github-credentials"
)

// desiredNodeModulesPVC creates a PVC for node_modules
func desiredNodeModulesPVC(namespace string) *corev1.PersistentVolumeClaim {
	return &corev1.PersistentVolumeClaim{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "web-node-modules",
			Namespace: namespace,
		},
		Spec: corev1.PersistentVolumeClaimSpec{
			AccessModes: []corev1.PersistentVolumeAccessMode{
				corev1.ReadWriteOnce,
			},
			Resources: corev1.VolumeResourceRequirements{
				Requests: corev1.ResourceList{
					corev1.ResourceStorage: resource.MustParse(nodeModulesStorage),
				},
			},
		},
	}
}

// desiredNextCachePVC creates a PVC for .next cache
func desiredNextCachePVC(namespace string) *corev1.PersistentVolumeClaim {
	return &corev1.PersistentVolumeClaim{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "web-next-cache",
			Namespace: namespace,
		},
		Spec: corev1.PersistentVolumeClaimSpec{
			AccessModes: []corev1.PersistentVolumeAccessMode{
				corev1.ReadWriteOnce,
			},
			Resources: corev1.VolumeResourceRequirements{
				Requests: corev1.ResourceList{
					corev1.ResourceStorage: resource.MustParse(nextCacheStorage),
				},
			},
		},
	}
}

// desiredPostgresDataPVC creates a PVC for PostgreSQL data
func desiredPostgresDataPVC(namespace string) *corev1.PersistentVolumeClaim {
	return &corev1.PersistentVolumeClaim{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "postgres-data",
			Namespace: namespace,
		},
		Spec: corev1.PersistentVolumeClaimSpec{
			AccessModes: []corev1.PersistentVolumeAccessMode{
				corev1.ReadWriteOnce,
			},
			Resources: corev1.VolumeResourceRequirements{
				Requests: corev1.ResourceList{
					corev1.ResourceStorage: resource.MustParse(postgresDataStorage),
				},
			},
		},
	}
}

// desiredCodePVC creates a PVC for code storage
func desiredCodePVC(namespace string) *corev1.PersistentVolumeClaim {
	return &corev1.PersistentVolumeClaim{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "web-code",
			Namespace: namespace,
		},
		Spec: corev1.PersistentVolumeClaimSpec{
			AccessModes: []corev1.PersistentVolumeAccessMode{
				corev1.ReadWriteOnce,
			},
			Resources: corev1.VolumeResourceRequirements{
				Requests: corev1.ResourceList{
					corev1.ResourceStorage: resource.MustParse(codeStorage),
				},
			},
		},
	}
}

// desiredPostgresDeployment creates the PostgreSQL deployment
func desiredPostgresDeployment(namespace string) *appsv1.Deployment {
	replicas := int32(1)
	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "postgres",
			Namespace: namespace,
			Labels: map[string]string{
				"app": "postgres",
			},
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{"app": "postgres"},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{"app": "postgres"},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  "postgres",
							Image: postgresImage,
							Env: []corev1.EnvVar{
								{Name: "POSTGRES_USER", Value: "postgres"},
								{Name: "POSTGRES_PASSWORD", Value: "postgres"},
								{Name: "POSTGRES_DB", Value: "catalyst"},
							},
							Ports: []corev1.ContainerPort{
								{ContainerPort: 5432},
							},
							VolumeMounts: []corev1.VolumeMount{
								{
									Name:      "postgres-data",
									MountPath: "/var/lib/postgresql/data",
								},
							},
							Resources: corev1.ResourceRequirements{
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("100m"),
									corev1.ResourceMemory: resource.MustParse("128Mi"),
								},
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("500m"),
									corev1.ResourceMemory: resource.MustParse("512Mi"),
								},
							},
						},
					},
					Volumes: []corev1.Volume{
						{
							Name: "postgres-data",
							VolumeSource: corev1.VolumeSource{
								PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
									ClaimName: "postgres-data",
								},
							},
						},
					},
				},
			},
		},
	}
}

// desiredPostgresService creates the PostgreSQL service
func desiredPostgresService(namespace string) *corev1.Service {
	return &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "postgres",
			Namespace: namespace,
		},
		Spec: corev1.ServiceSpec{
			Selector: map[string]string{"app": "postgres"},
			Ports: []corev1.ServicePort{
				{
					Port:       5432,
					TargetPort: intstr.FromInt(5432),
				},
			},
		},
	}
}

// desiredDevelopmentDeployment creates the web app deployment for development mode
// with init containers for git-clone, npm install, and db:migrate, with hot-reload
func desiredDevelopmentDeployment(env *catalystv1alpha1.Environment, namespace string, gitCredentialsSecretName string) *appsv1.Deployment {
	replicas := int32(1)

	// Build DATABASE_URL based on namespace
	databaseURL := fmt.Sprintf("postgres://postgres:postgres@postgres.%s.svc.cluster.local:5432/catalyst", namespace)

	// Base environment variables
	envVars := []corev1.EnvVar{
		{Name: "DATABASE_URL", Value: databaseURL},
		{Name: "WATCHPACK_POLLING", Value: "true"},
	}

	// Add any custom env vars from the Environment CR
	envVars = append(envVars, toCoreEnvVars(env.Spec.Config.EnvVars)...)

	// Check if SEED_SELF_DEPLOY should be injected (from operator env)
	if seedSelfDeploy := os.Getenv("SEED_SELF_DEPLOY"); seedSelfDeploy == "true" {
		envVars = append(envVars, corev1.EnvVar{Name: "SEED_SELF_DEPLOY", Value: "true"})
	}

	// Extract git repository URL and commit SHA from environment sources
	var gitRepoURL, gitCommitSha string
	if len(env.Spec.Sources) > 0 {
		// Use the first source for now (assumes single repo)
		// TODO: Support multi-repo in future phases
		source := env.Spec.Sources[0]
		// Repository URL would come from Project CR lookup in the future
		// For now, we'll use a placeholder that the reconciler will populate
		gitRepoURL = "https://github.com/ncrmro/catalyst.git" // TODO: Get from Project CR
		gitCommitSha = source.CommitSha
	}

	// Volume mounts for git-clone init container
	gitCloneVolumeMounts := []corev1.VolumeMount{
		{Name: "code", MountPath: hostCodePath},
		{Name: "git-credentials", MountPath: "/etc/git-credentials", ReadOnly: true},
	}

	// Volume mounts for npm/db init containers
	initVolumeMounts := []corev1.VolumeMount{
		{Name: "code", MountPath: hostCodePath},
		{Name: "node-modules", MountPath: nodeModulesPath},
	}

	// Volume mounts for main container (includes .next cache)
	mainVolumeMounts := []corev1.VolumeMount{
		{Name: "code", MountPath: hostCodePath},
		{Name: "node-modules", MountPath: nodeModulesPath},
		{Name: "next-cache", MountPath: nextCachePath},
	}

	// Build init containers array
	initContainers := []corev1.Container{}

	// Add git-clone init container if we have repository info
	if gitRepoURL != "" && gitCommitSha != "" {
		initContainers = append(initContainers, corev1.Container{
			Name:  "git-clone",
			Image: gitCloneImage,
			Command: []string{"/bin/sh", "-c"},
			Args: []string{
				`# Setup .netrc for authentication
cat > ~/.netrc <<EOF
machine github.com
login x-access-token
password $(cat /etc/git-credentials/password)
EOF
chmod 600 ~/.netrc

# Clone and checkout specific commit
git clone $GIT_REPO_URL /code
cd /code
git checkout $GIT_COMMIT_SHA

# Clean up credentials file
rm -f ~/.netrc`,
			},
			Env: []corev1.EnvVar{
				{Name: "GIT_REPO_URL", Value: gitRepoURL},
				{Name: "GIT_COMMIT_SHA", Value: gitCommitSha},
			},
			VolumeMounts: gitCloneVolumeMounts,
			Resources: corev1.ResourceRequirements{
				Requests: corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse("100m"),
					corev1.ResourceMemory: resource.MustParse("128Mi"),
				},
				Limits: corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse("500m"),
					corev1.ResourceMemory: resource.MustParse("256Mi"),
				},
			},
		})
	}

	// Add npm-install init container
	initContainers = append(initContainers, corev1.Container{
		Name:         "npm-install",
		Image:        nodeImage,
		WorkingDir:   webWorkDir,
		Command:      []string{"npm", "install"},
		VolumeMounts: initVolumeMounts,
		Resources: corev1.ResourceRequirements{
			Requests: corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("100m"),
				corev1.ResourceMemory: resource.MustParse("256Mi"),
			},
			Limits: corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("1000m"),
				corev1.ResourceMemory: resource.MustParse("1Gi"),
			},
		},
	})

	// Add db-migrate init container
	initContainers = append(initContainers, corev1.Container{
		Name:         "db-migrate",
		Image:        nodeImage,
		WorkingDir:   webWorkDir,
		Command:      []string{"/bin/sh", "-c", "npm run db:migrate && npm run seed"},
		VolumeMounts: initVolumeMounts,
		Env: []corev1.EnvVar{
			{Name: "DATABASE_URL", Value: databaseURL},
		},
		Resources: corev1.ResourceRequirements{
			Requests: corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("100m"),
				corev1.ResourceMemory: resource.MustParse("256Mi"),
			},
			Limits: corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("500m"),
				corev1.ResourceMemory: resource.MustParse("512Mi"),
			},
		},
	})

	// Build volumes array
	volumes := []corev1.Volume{
		{
			Name: "code",
			VolumeSource: corev1.VolumeSource{
				PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
					ClaimName: "web-code",
				},
			},
		},
		{
			Name: "node-modules",
			VolumeSource: corev1.VolumeSource{
				PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
					ClaimName: "web-node-modules",
				},
			},
		},
		{
			Name: "next-cache",
			VolumeSource: corev1.VolumeSource{
				PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
					ClaimName: "web-next-cache",
				},
			},
		},
	}

	// Add git-credentials volume if secret name is provided
	if gitCredentialsSecretName != "" {
		volumes = append(volumes, corev1.Volume{
			Name: "git-credentials",
			VolumeSource: corev1.VolumeSource{
				Secret: &corev1.SecretVolumeSource{
					SecretName: gitCredentialsSecretName,
				},
			},
		})
	}

	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "web",
			Namespace: namespace,
			Labels: map[string]string{
				"app": "web",
			},
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{"app": "web"},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{"app": "web"},
				},
				Spec: corev1.PodSpec{
					InitContainers: initContainers,
					Containers: []corev1.Container{
						{
							Name:         "web",
							Image:        nodeImage,
							WorkingDir:   webWorkDir,
							Command:      []string{"./node_modules/.bin/next", "dev", "--turbopack"},
							VolumeMounts: mainVolumeMounts,
							Env:          envVars,
							Resources: corev1.ResourceRequirements{
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("200m"),
									corev1.ResourceMemory: resource.MustParse("512Mi"),
								},
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("1000m"),
									corev1.ResourceMemory: resource.MustParse("1Gi"),
								},
							},
							LivenessProbe: &corev1.Probe{
								ProbeHandler: corev1.ProbeHandler{
									HTTPGet: &corev1.HTTPGetAction{
										Path: "/",
										Port: intstr.FromInt(3000),
									},
								},
								InitialDelaySeconds: 5,
								PeriodSeconds:       15,
								TimeoutSeconds:      5,
							},
							ReadinessProbe: &corev1.Probe{
								ProbeHandler: corev1.ProbeHandler{
									HTTPGet: &corev1.HTTPGetAction{
										Path: "/api/health/readiness",
										Port: intstr.FromInt(3000),
									},
								},
								InitialDelaySeconds: 5,
								PeriodSeconds:       10,
								TimeoutSeconds:      5,
							},
						},
					},
					Volumes: volumes,
				},
			},
		},
	}
}

// desiredDevelopmentService creates the web service for development mode
func desiredDevelopmentService(namespace string) *corev1.Service {
	return &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "app",
			Namespace: namespace,
		},
		Spec: corev1.ServiceSpec{
			Selector: map[string]string{"app": "web"},
			Ports: []corev1.ServicePort{
				{
					Port:       80,
					TargetPort: intstr.FromInt(3000),
				},
			},
		},
	}
}

// ReconcileDevelopmentMode handles the reconciliation for development deployment mode.
// It creates PVCs, PostgreSQL, and a hot-reload web deployment based on base.json pattern.
func (r *EnvironmentReconciler) ReconcileDevelopmentMode(ctx context.Context, env *catalystv1alpha1.Environment, namespace string, template *catalystv1alpha1.EnvironmentTemplate) (bool, error) {
	log := logf.FromContext(ctx)

	// 1. Create PVCs (idempotent)
	codePVC := desiredCodePVC(namespace)
	if err := r.Create(ctx, codePVC); err != nil && !isAlreadyExists(err) {
		return false, err
	}

	nodeModulesPVC := desiredNodeModulesPVC(namespace)
	if err := r.Create(ctx, nodeModulesPVC); err != nil && !isAlreadyExists(err) {
		return false, err
	}

	nextCachePVC := desiredNextCachePVC(namespace)
	if err := r.Create(ctx, nextCachePVC); err != nil && !isAlreadyExists(err) {
		return false, err
	}

	postgresDataPVC := desiredPostgresDataPVC(namespace)
	if err := r.Create(ctx, postgresDataPVC); err != nil && !isAlreadyExists(err) {
		return false, err
	}

	// 2. Copy git credentials Secret from project namespace to environment namespace
	// The secret name is expected to be "github-credentials"
	projectNamespace := namespace // TODO: Get actual project namespace from Environment CR labels
	if err := r.ensureGitCredentials(ctx, projectNamespace, namespace, gitCredentialsSecret); err != nil {
		log.Error(err, "Failed to ensure git credentials", "namespace", namespace)
		// Continue anyway - the deployment will fail if git-clone needs credentials
	}

	// 3. Create PostgreSQL deployment and service
	postgresDeployment := desiredPostgresDeployment(namespace)
	if err := r.Create(ctx, postgresDeployment); err != nil && !isAlreadyExists(err) {
		return false, err
	}

	postgresService := desiredPostgresService(namespace)
	if err := r.Create(ctx, postgresService); err != nil && !isAlreadyExists(err) {
		return false, err
	}

	// 4. Wait for PostgreSQL to be ready before creating web deployment
	postgresReady, err := r.isDeploymentReady(ctx, namespace, "postgres")
	if err != nil {
		return false, err
	}
	if !postgresReady {
		log.Info("Waiting for PostgreSQL to be ready", "namespace", namespace)
		return false, nil // Requeue
	}

	// 5. Create web deployment and service
	webDeployment := desiredDevelopmentDeployment(env, namespace, gitCredentialsSecret)
	if err := r.Create(ctx, webDeployment); err != nil && !isAlreadyExists(err) {
		return false, err
	}

	webService := desiredDevelopmentService(namespace)
	if err := r.Create(ctx, webService); err != nil && !isAlreadyExists(err) {
		return false, err
	}

	// 6. Check if web deployment is ready
	webReady, err := r.isDeploymentReady(ctx, namespace, "web")
	if err != nil {
		return false, err
	}

	return webReady, nil
}

// ensureGitCredentials copies git credentials Secret from project namespace to environment namespace
func (r *EnvironmentReconciler) ensureGitCredentials(ctx context.Context, projectNamespace, envNamespace, secretName string) error {
	log := logf.FromContext(ctx)

	// Get the source Secret from project namespace
	sourceSecret := &corev1.Secret{}
	err := r.Get(ctx, client.ObjectKey{Name: secretName, Namespace: projectNamespace}, sourceSecret)
	if err != nil {
		if client.IgnoreNotFound(err) == nil {
			// Secret doesn't exist in project namespace - this is OK, it might not be set up yet
			log.Info("Git credentials secret not found in project namespace", "projectNamespace", projectNamespace, "secretName", secretName)
			return nil
		}
		return fmt.Errorf("failed to get source secret: %w", err)
	}

	// Create a copy of the Secret in the environment namespace
	targetSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      secretName,
			Namespace: envNamespace,
			Labels: map[string]string{
				"catalyst.dev/copied-from": projectNamespace,
			},
		},
		Type: sourceSecret.Type,
		Data: sourceSecret.Data,
	}

	// Try to create the Secret
	if err := r.Create(ctx, targetSecret); err != nil {
		if !isAlreadyExists(err) {
			return fmt.Errorf("failed to create target secret: %w", err)
		}
		// Secret already exists, update it instead
		existingSecret := &corev1.Secret{}
		if err := r.Get(ctx, client.ObjectKey{Name: secretName, Namespace: envNamespace}, existingSecret); err != nil {
			return fmt.Errorf("failed to get existing secret: %w", err)
		}
		existingSecret.Data = sourceSecret.Data
		existingSecret.Type = sourceSecret.Type
		if err := r.Update(ctx, existingSecret); err != nil {
			return fmt.Errorf("failed to update existing secret: %w", err)
		}
		log.Info("Updated git credentials secret in environment namespace", "namespace", envNamespace, "secretName", secretName)
	} else {
		log.Info("Created git credentials secret in environment namespace", "namespace", envNamespace, "secretName", secretName)
	}

	return nil
}

// isDeploymentReady checks if a deployment has ready replicas
func (r *EnvironmentReconciler) isDeploymentReady(ctx context.Context, namespace, name string) (bool, error) {
	deployment := &appsv1.Deployment{}
	err := r.Get(ctx, client.ObjectKey{Name: name, Namespace: namespace}, deployment)
	if err != nil {
		return false, client.IgnoreNotFound(err)
	}

	// Check if at least one replica is ready
	return deployment.Status.ReadyReplicas > 0, nil
}

// isAlreadyExists returns true if the error is an AlreadyExists error
func isAlreadyExists(err error) bool {
	return err != nil && client.IgnoreAlreadyExists(err) == nil
}
