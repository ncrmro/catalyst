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

// Git scripts volume and ConfigMap constants
const (
	gitScriptsVolumeName    = "git-scripts"
	gitScriptsConfigMapName = "git-scripts"
)

// desiredWorkspacePVC creates a PVC for the workspace (code + dependencies + caches)
func desiredWorkspacePVC(namespace string) *corev1.PersistentVolumeClaim {
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
					corev1.ResourceStorage: resource.MustParse(workspaceStorage),
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
		{Name: "workspace", MountPath: gitCloneRoot},
		{Name: gitScriptsVolumeName, MountPath: "/scripts", ReadOnly: true},
	}

	// Volume mounts for init containers - workspace contains everything
	initVolumeMounts := []corev1.VolumeMount{
		{Name: "workspace", MountPath: hostCodePath},
	}

	// Volume mounts for main container - workspace contains code, dependencies, and caches
	mainVolumeMounts := []corev1.VolumeMount{
		{Name: "workspace", MountPath: hostCodePath},
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
				{Name: "ENABLE_PAT_FALLBACK", Value: os.Getenv("ENABLE_PAT_FALLBACK")},
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

	// Prepare volumes - workspace PVC contains code, dependencies, and caches
	defaultMode := int32(0755) // Make scripts executable
	volumes := []corev1.Volume{
		{
			Name: "workspace",
			VolumeSource: corev1.VolumeSource{
				PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
					ClaimName: "workspace",
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
							Env: envVars,
							// TODO: Resource limits are hardcoded. It is undetermined how
							// users will configure these in the future (CRD field, project
							// config, etc.).
							// 2Gi memory limit: next dev --turbopack OOMKills at 1Gi
							// (exit code 137, pod enters CrashLoopBackOff).
							Resources: corev1.ResourceRequirements{
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("200m"),
									corev1.ResourceMemory: resource.MustParse("512Mi"),
								},
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("1000m"),
									corev1.ResourceMemory: resource.MustParse("2Gi"),
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

	// 0. Get and validate configuration (required - no fallbacks)
	templateConfig, err := getTemplateConfig(ctx, r.Client, env)
	if err != nil {
		return false, fmt.Errorf("failed to get template config: %w", err)
	}

	// Resolve config (merge template + environment overrides)
	config := resolveConfig(&env.Spec.Config, templateConfig)

	// Validate that required fields are present
	if err := validateConfig(&config); err != nil {
		return false, fmt.Errorf("invalid configuration: %w", err)
	}

	log.Info("Using resolved config",
		"image", config.Image,
		"ports", len(config.Ports),
		"initContainers", len(config.InitContainers),
		"services", len(config.Services),
		"volumes", len(config.Volumes),
	)

	// 1. Ensure git scripts ConfigMap if we have a repository URL to clone
	if len(project.Spec.Sources) > 0 && project.Spec.Sources[0].RepositoryURL != "" {
		if err := r.ensureGitScriptsConfigMap(ctx, namespace); err != nil {
			return false, fmt.Errorf("failed to ensure git scripts ConfigMap: %w", err)
		}
		log.Info("Git scripts ConfigMap ensured", "namespace", namespace)
	}

	// 2. Create volumes from config
	for _, volSpec := range config.Volumes {
		if volSpec.PersistentVolumeClaim != nil {
			pvc := &corev1.PersistentVolumeClaim{
				ObjectMeta: metav1.ObjectMeta{
					Name:      volSpec.Name,
					Namespace: namespace,
				},
				Spec: *volSpec.PersistentVolumeClaim,
			}
			if err := r.Create(ctx, pvc); err != nil && !isAlreadyExists(err) {
				return false, fmt.Errorf("failed to create PVC %s: %w", volSpec.Name, err)
			}
		}
	}
	log.Info("PVCs created/verified from config", "namespace", namespace, "count", len(config.Volumes))

	// 3. Create managed services from config (e.g., postgres, redis)
	for _, svcSpec := range config.Services {
		// Create StatefulSet for the service
		statefulSet := desiredManagedServiceStatefulSet(namespace, svcSpec)
		if err := r.Create(ctx, statefulSet); err != nil && !isAlreadyExists(err) {
			return false, fmt.Errorf("failed to create StatefulSet for service %s: %w", svcSpec.Name, err)
		}

		// Create Service for the StatefulSet
		service := desiredManagedServiceService(namespace, svcSpec)
		if err := r.Create(ctx, service); err != nil && !isAlreadyExists(err) {
			return false, fmt.Errorf("failed to create Service for %s: %w", svcSpec.Name, err)
		}

		log.Info("Managed service created/verified", "service", svcSpec.Name, "namespace", namespace)

		// Wait for service to be ready before proceeding
		ready, err := r.isStatefulSetReady(ctx, namespace, svcSpec.Name)
		if err != nil {
			return false, fmt.Errorf("failed to check if service %s is ready: %w", svcSpec.Name, err)
		}
		if !ready {
			log.Info("Waiting for managed service to be ready", "service", svcSpec.Name, "namespace", namespace)
			return false, nil // Requeue
		}
	}

	// 4. Create web deployment and service using config
	webDeployment := desiredDevelopmentDeploymentFromConfig(env, project, namespace, &config)
	if err := r.Create(ctx, webDeployment); err != nil && !isAlreadyExists(err) {
		return false, err
	}

	webService := desiredDevelopmentServiceFromConfig(namespace, &config)
	if err := r.Create(ctx, webService); err != nil && !isAlreadyExists(err) {
		return false, err
	}
	log.Info("Web deployment and service created/verified", "namespace", namespace)

	// 5. Check if web deployment is ready
	webReady, err := r.isDeploymentReady(ctx, namespace, "web")
	if err != nil {
		return false, err
	}

	if !webReady {
		// Log deployment status for diagnostics
		webDeploy := &appsv1.Deployment{}
		if getErr := r.Get(ctx, client.ObjectKey{Name: "web", Namespace: namespace}, webDeploy); getErr == nil {
			log.Info("Web deployment not ready",
				"namespace", namespace,
				"replicas", webDeploy.Status.Replicas,
				"readyReplicas", webDeploy.Status.ReadyReplicas,
				"unavailableReplicas", webDeploy.Status.UnavailableReplicas,
				"conditions", fmt.Sprintf("%v", webDeploy.Status.Conditions),
			)
		}
		// Log pod status for init container diagnostics
		podList := &corev1.PodList{}
		if listErr := r.List(ctx, podList, client.InNamespace(namespace), client.MatchingLabels{"app": "web"}); listErr == nil {
			for _, pod := range podList.Items {
				initStatuses := make([]string, 0, len(pod.Status.InitContainerStatuses))
				for _, s := range pod.Status.InitContainerStatuses {
					state := "unknown"
					if s.State.Waiting != nil {
						state = fmt.Sprintf("waiting:%s", s.State.Waiting.Reason)
					} else if s.State.Running != nil {
						state = "running"
					} else if s.State.Terminated != nil {
						state = fmt.Sprintf("terminated:%s(exit:%d)", s.State.Terminated.Reason, s.State.Terminated.ExitCode)
					}
					initStatuses = append(initStatuses, fmt.Sprintf("%s=%s", s.Name, state))
				}
				log.Info("Web pod status",
					"pod", pod.Name,
					"phase", pod.Status.Phase,
					"initContainers", fmt.Sprintf("%v", initStatuses),
				)
			}
		}
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

// isStatefulSetReady checks if a statefulset has ready replicas
func (r *EnvironmentReconciler) isStatefulSetReady(ctx context.Context, namespace, name string) (bool, error) {
	statefulSet := &appsv1.StatefulSet{}
	err := r.Get(ctx, client.ObjectKey{Name: name, Namespace: namespace}, statefulSet)
	if err != nil {
		return false, client.IgnoreNotFound(err)
	}

	// Check if at least one replica is ready
	return statefulSet.Status.ReadyReplicas > 0, nil
}

// desiredManagedServiceStatefulSet creates a StatefulSet for a managed service (e.g., postgres, redis)
func desiredManagedServiceStatefulSet(namespace string, svcSpec catalystv1alpha1.ManagedServiceSpec) *appsv1.StatefulSet {
	replicas := int32(1)

	// Build container spec from service config
	container := corev1.Container{
		Name:      svcSpec.Name,
		Image:     svcSpec.Container.Image,
		Ports:     svcSpec.Container.Ports,
		Env:       svcSpec.Container.Env,
		Resources: corev1.ResourceRequirements{},
	}

	if svcSpec.Container.Resources != nil {
		container.Resources = *svcSpec.Container.Resources
	}

	// Add volume mount if storage is defined
	if svcSpec.Storage != nil {
		container.VolumeMounts = []corev1.VolumeMount{
			{
				Name:      svcSpec.Name + "-data",
				MountPath: "/var/lib/" + svcSpec.Name, // Standard path for service data
			},
		}
	}

	// Build StatefulSet
	statefulSet := &appsv1.StatefulSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:      svcSpec.Name,
			Namespace: namespace,
			Labels: map[string]string{
				"app": svcSpec.Name,
			},
		},
		Spec: appsv1.StatefulSetSpec{
			Replicas:    &replicas,
			ServiceName: svcSpec.Name,
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{"app": svcSpec.Name},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{"app": svcSpec.Name},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{container},
				},
			},
		},
	}

	// Add volume claim template if storage is defined
	if svcSpec.Storage != nil {
		statefulSet.Spec.VolumeClaimTemplates = []corev1.PersistentVolumeClaim{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name: svcSpec.Name + "-data",
				},
				Spec: *svcSpec.Storage,
			},
		}
	}

	return statefulSet
}

// desiredManagedServiceService creates a Service for a managed service StatefulSet
func desiredManagedServiceService(namespace string, svcSpec catalystv1alpha1.ManagedServiceSpec) *corev1.Service {
	// Build service ports from container ports
	servicePorts := []corev1.ServicePort{}
	for _, containerPort := range svcSpec.Container.Ports {
		servicePorts = append(servicePorts, corev1.ServicePort{
			Port:       containerPort.ContainerPort,
			TargetPort: intstr.FromInt(int(containerPort.ContainerPort)),
			Protocol:   containerPort.Protocol,
		})
	}

	return &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      svcSpec.Name,
			Namespace: namespace,
		},
		Spec: corev1.ServiceSpec{
			Selector: map[string]string{"app": svcSpec.Name},
			Ports:    servicePorts,
		},
	}
}

// desiredDevelopmentDeploymentFromConfig creates the web app deployment from resolved config
func desiredDevelopmentDeploymentFromConfig(env *catalystv1alpha1.Environment, project *catalystv1alpha1.Project, namespace string, config *catalystv1alpha1.EnvironmentConfig) *appsv1.Deployment {
	replicas := int32(1)

	// Build environment variables from config
	envVars := config.Env

	// Add any legacy env vars (backward compat during transition)
	for _, legacyVar := range config.EnvVars {
		envVars = append(envVars, corev1.EnvVar{
			Name:  legacyVar.Name,
			Value: legacyVar.Value,
		})
	}

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
	if commit == "" {
		if len(project.Spec.Sources) > 0 {
			commit = project.Spec.Sources[0].Branch
		}
		if commit == "" {
			commit = "main"
		}
	}

	// Build init containers from config
	initContainers := []corev1.Container{}

	// Add git-clone init container if we have a repo URL (prepend before user init containers)
	if repoURL != "" {
		// Find the code volume mount path (first volume usually)
		codeVolumeName := "code"
		codeMountPath := "/code"
		if len(config.VolumeMounts) > 0 {
			codeVolumeName = config.VolumeMounts[0].Name
			codeMountPath = config.VolumeMounts[0].MountPath
		}

		gitCloneContainer := corev1.Container{
			Name:    "git-clone",
			Image:   "alpine/git:2.45.2", // Could be made configurable
			Command: []string{"/scripts/git-clone.sh"},
			Env: []corev1.EnvVar{
				{Name: "INSTALLATION_ID", Value: githubInstallationId},
				{Name: "ENABLE_PAT_FALLBACK", Value: os.Getenv("ENABLE_PAT_FALLBACK")},
				{Name: "CATALYST_WEB_URL", Value: getCatalystWebURL()},
				{Name: "GIT_REPO_URL", Value: repoURL},
				{Name: "GIT_COMMIT", Value: commit},
				{Name: "GIT_CLONE_ROOT", Value: codeMountPath},
				{Name: "GIT_CLONE_DEST", Value: "."},
			},
			VolumeMounts: []corev1.VolumeMount{
				{Name: codeVolumeName, MountPath: codeMountPath},
				{Name: gitScriptsVolumeName, MountPath: "/scripts", ReadOnly: true},
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
		}
		initContainers = append(initContainers, gitCloneContainer)
	}

	// Add user-defined init containers from config
	for _, initSpec := range config.InitContainers {
		initContainer := corev1.Container{
			Name:         initSpec.Name,
			Image:        initSpec.Image,
			Command:      initSpec.Command,
			Args:         initSpec.Args,
			WorkingDir:   initSpec.WorkingDir,
			Env:          initSpec.Env,
			VolumeMounts: initSpec.VolumeMounts,
		}
		if initSpec.Resources != nil {
			initContainer.Resources = *initSpec.Resources
		}
		initContainers = append(initContainers, initContainer)
	}

	// Build main container from config
	mainContainer := corev1.Container{
		Name:         "app",
		Image:        config.Image,
		Command:      config.Command,
		Args:         config.Args,
		WorkingDir:   config.WorkingDir,
		Ports:        config.Ports,
		Env:          envVars,
		VolumeMounts: config.VolumeMounts,
	}

	if config.Resources != nil {
		mainContainer.Resources = *config.Resources
	}
	if config.LivenessProbe != nil {
		mainContainer.LivenessProbe = config.LivenessProbe
	}
	if config.ReadinessProbe != nil {
		mainContainer.ReadinessProbe = config.ReadinessProbe
	}
	if config.StartupProbe != nil {
		mainContainer.StartupProbe = config.StartupProbe
	}

	// Build volumes for the deployment
	volumes := []corev1.Volume{}

	// Add git scripts volume if we have a repo
	if repoURL != "" {
		volumes = append(volumes, corev1.Volume{
			Name: gitScriptsVolumeName,
			VolumeSource: corev1.VolumeSource{
				ConfigMap: &corev1.ConfigMapVolumeSource{
					LocalObjectReference: corev1.LocalObjectReference{
						Name: gitScriptsConfigMapName,
					},
					DefaultMode: int32Ptr(0755),
				},
			},
		})
	}

	// Add PVC volumes from config
	for _, volSpec := range config.Volumes {
		if volSpec.PersistentVolumeClaim != nil {
			volumes = append(volumes, corev1.Volume{
				Name: volSpec.Name,
				VolumeSource: corev1.VolumeSource{
					PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
						ClaimName: volSpec.Name,
					},
				},
			})
		}
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
					Containers:     []corev1.Container{mainContainer},
					Volumes:        volumes,
				},
			},
		},
	}
}

// desiredDevelopmentServiceFromConfig creates the web app service from resolved config
func desiredDevelopmentServiceFromConfig(namespace string, config *catalystv1alpha1.EnvironmentConfig) *corev1.Service {
	// Build service ports from config ports
	servicePorts := []corev1.ServicePort{}
	for _, containerPort := range config.Ports {
		servicePorts = append(servicePorts, corev1.ServicePort{
			Port:       80, // Service listens on 80
			TargetPort: intstr.FromInt(int(containerPort.ContainerPort)),
			Protocol:   containerPort.Protocol,
		})
	}

	// If no ports in config, default to port 80 -> 3000 for backward compat
	if len(servicePorts) == 0 {
		servicePorts = []corev1.ServicePort{
			{
				Port:       80,
				TargetPort: intstr.FromInt(3000),
			},
		}
	}

	return &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "web",
			Namespace: namespace,
		},
		Spec: corev1.ServiceSpec{
			Selector: map[string]string{"app": "web"},
			Ports:    servicePorts,
		},
	}
}

// int32Ptr returns a pointer to an int32
func int32Ptr(i int32) *int32 {
	return &i
}
