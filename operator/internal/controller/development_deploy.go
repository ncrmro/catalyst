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
	nodeImage           = "node:22"
	postgresImage       = "postgres:16"
	gitCloneImageDev    = "alpine/git:2.45.2"
	hostCodePath        = "/code"
	webWorkDir          = "/code/web"
	nodeModulesPath     = "/code/web/node_modules"
	nextCachePath       = "/code/web/.next"
	codeStorage         = "5Gi"
	nodeModulesStorage  = "2Gi"
	nextCacheStorage    = "1Gi"
	postgresDataStorage = "1Gi"
)

// desiredCodePVC creates a PVC for the application code
func desiredCodePVC(namespace string) *corev1.PersistentVolumeClaim {
	return &corev1.PersistentVolumeClaim{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "workspace",
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
// with init containers for git clone, npm install and db:migrate, and hot-reload
func desiredDevelopmentDeployment(env *catalystv1alpha1.Environment, project *catalystv1alpha1.Project, namespace string) *appsv1.Deployment {
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

	// Determine repository URL and commit to clone
	var repoURL, commit string
	githubInstallationId := project.Spec.GitHubInstallationId

	// Get from project sources
	if len(project.Spec.Sources) > 0 {
		repoURL = project.Spec.Sources[0].RepositoryURL
	}

	// Override with environment-specific commit if provided
	if len(env.Spec.Sources) > 0 {
		if env.Spec.Sources[0].CommitSha != "" {
			commit = env.Spec.Sources[0].CommitSha
		} else if env.Spec.Sources[0].Branch != "" {
			commit = env.Spec.Sources[0].Branch
		}
	}

	// Default to main branch if no commit specified
	// TODO: Look up the default branch from the repository in the future
	if commit == "" {
		if len(project.Spec.Sources) > 0 {
			commit = project.Spec.Sources[0].Branch
		}
		if commit == "" {
			commit = "main"
		}
	}

	// Git clone configuration
	gitCloneRoot := "/code"
	gitCloneDest := "."

	// Volume mounts for git clone init container
	gitCloneVolumeMounts := []corev1.VolumeMount{
		{Name: "code", MountPath: gitCloneRoot},
		{Name: gitScriptsVolumeName, MountPath: "/scripts", ReadOnly: true},
	}

	// Volume mounts for npm install and db migrate init containers
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

	// Build init containers list
	initContainers := []corev1.Container{}

	// Add git-clone init container if we have a repo URL
	if repoURL != "" {
		initContainers = append(initContainers, corev1.Container{
			Name:    "git-clone",
			Image:   gitCloneImageDev,
			Command: []string{"/scripts/git-clone.sh"},
			Env: []corev1.EnvVar{
				{Name: "INSTALLATION_ID", Value: githubInstallationId},
				{Name: "CATALYST_WEB_URL", Value: getCatalystWebURL()},
				{Name: "GIT_REPO_URL", Value: repoURL},
				{Name: "GIT_COMMIT", Value: commit},
				{Name: "GIT_CLONE_ROOT", Value: gitCloneRoot},
				{Name: "GIT_CLONE_DEST", Value: gitCloneDest},
			},
			VolumeMounts: gitCloneVolumeMounts,
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
	}

	// Add npm install init container
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

	// Add db migrate init container
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

	// Prepare volumes - always use PVC for code
	defaultMode := int32(0755) // Make scripts executable
	volumes := []corev1.Volume{
		{
			Name: "code",
			VolumeSource: corev1.VolumeSource{
				PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
					ClaimName: "workspace",
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

	// Add git scripts ConfigMap volume if we're cloning
	if repoURL != "" {
		volumes = append(volumes, corev1.Volume{
			Name: gitScriptsVolumeName,
			VolumeSource: corev1.VolumeSource{
				ConfigMap: &corev1.ConfigMapVolumeSource{
					LocalObjectReference: corev1.LocalObjectReference{Name: gitScriptsConfigMap},
					DefaultMode:          &defaultMode,
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
// It creates PVCs, PostgreSQL, and a hot-reload web deployment with git clone init container.
func (r *EnvironmentReconciler) ReconcileDevelopmentMode(ctx context.Context, env *catalystv1alpha1.Environment, project *catalystv1alpha1.Project, namespace string, template *catalystv1alpha1.EnvironmentTemplate) (bool, error) {
	log := logf.FromContext(ctx)

	// 0. Ensure git scripts ConfigMap if we have a repository URL to clone
	if len(project.Spec.Sources) > 0 && project.Spec.Sources[0].RepositoryURL != "" {
		if err := r.ensureGitScriptsConfigMap(ctx, namespace); err != nil {
			return false, fmt.Errorf("failed to ensure git scripts ConfigMap: %w", err)
		}
	}

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

	// 2. Create PostgreSQL deployment and service
	postgresDeployment := desiredPostgresDeployment(namespace)
	if err := r.Create(ctx, postgresDeployment); err != nil && !isAlreadyExists(err) {
		return false, err
	}

	postgresService := desiredPostgresService(namespace)
	if err := r.Create(ctx, postgresService); err != nil && !isAlreadyExists(err) {
		return false, err
	}

	// 3. Wait for PostgreSQL to be ready before creating web deployment
	postgresReady, err := r.isDeploymentReady(ctx, namespace, "postgres")
	if err != nil {
		return false, err
	}
	if !postgresReady {
		log.Info("Waiting for PostgreSQL to be ready", "namespace", namespace)
		return false, nil // Requeue
	}

	// 4. Create web deployment and service
	webDeployment := desiredDevelopmentDeployment(env, project, namespace)
	if err := r.Create(ctx, webDeployment); err != nil && !isAlreadyExists(err) {
		return false, err
	}

	webService := desiredDevelopmentService(namespace)
	if err := r.Create(ctx, webService); err != nil && !isAlreadyExists(err) {
		return false, err
	}

	// 5. Check if web deployment is ready
	webReady, err := r.isDeploymentReady(ctx, namespace, "web")
	if err != nil {
		return false, err
	}

	return webReady, nil
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
