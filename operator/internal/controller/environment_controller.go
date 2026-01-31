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
	"os"
	"regexp"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/rest"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	logf "sigs.k8s.io/controller-runtime/pkg/log"

	catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

//nolint:goconst
const environmentFinalizer = "catalyst.dev/finalizer"

// EnvironmentReconciler reconciles a Environment object
type EnvironmentReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	Config *rest.Config
}

// sanitizeLabelValue sanitizes a string for use as a Kubernetes label value.
// K8s labels must:
// - Be 63 characters or less
// - Consist of alphanumeric characters, '-', '_' or '.'
// - Start and end with an alphanumeric character
func sanitizeLabelValue(s string) string {
	// Replace common separators with dashes
	s = strings.ReplaceAll(s, "/", "-")
	s = strings.ReplaceAll(s, ":", "-")

	// Remove any characters that aren't alphanumeric, '-', '_', or '.'
	reg := regexp.MustCompile(`[^a-zA-Z0-9\-_.]`)
	s = reg.ReplaceAllString(s, "")

	// Trim leading/trailing non-alphanumeric characters
	s = strings.Trim(s, "-_.")

	// Truncate to 63 characters
	if len(s) > 63 {
		s = s[:63]
		// Ensure it ends with alphanumeric after truncation
		s = strings.TrimRight(s, "-_.")
	}

	return s
}

// +kubebuilder:rbac:groups=catalyst.catalyst.dev,resources=environments,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=catalyst.catalyst.dev,resources=environments/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=catalyst.catalyst.dev,resources=projects,verbs=get;list;watch
// +kubebuilder:rbac:groups="",resources=pods,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=services,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=networking.k8s.io,resources=ingresses,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=catalyst.catalyst.dev,resources=environments/finalizers,verbs=update
// +kubebuilder:rbac:groups="",resources=namespaces,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=resourcequotas,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=networking.k8s.io,resources=networkpolicies,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=persistentvolumeclaims,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=secrets,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=configmaps,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=serviceaccounts,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=batch,resources=jobs,verbs=get;list;watch;create;update;patch;delete

//nolint:gocyclo
func (r *EnvironmentReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	log := logf.FromContext(ctx)

	env := &catalystv1alpha1.Environment{}
	if err := r.Get(ctx, req.NamespacedName, env); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// Extract namespace hierarchy from Environment CR labels (FR-ENV-020)
	// Generate target namespace for workload deployment (FR-ENV-021)
	var targetNamespace string
	hierarchy := ExtractNamespaceHierarchy(env.Labels)
	if hierarchy == nil {
		// Missing hierarchy labels - this is a configuration error
		err := fmt.Errorf("environment CR is missing required hierarchy labels (catalyst.dev/team, catalyst.dev/project, catalyst.dev/environment)")
		log.Error(err, "Cannot generate namespace without hierarchy labels", "environment", env.Name)
		return ctrl.Result{}, err
	}

	// Generate environment namespace using hierarchy with hash-based truncation
	targetNamespace = GenerateEnvironmentNamespace(hierarchy.Team, hierarchy.Project, hierarchy.Environment)
	log.Info(
		"Generated environment namespace from hierarchy",
		"namespace", targetNamespace,
		"hierarchy", fmt.Sprintf("team=%s,project=%s,environment=%s", hierarchy.Team, hierarchy.Project, hierarchy.Environment),
	)

	// Validate namespace name
	if !IsValidNamespaceName(targetNamespace) {
		log.Error(fmt.Errorf("invalid namespace name"), "Generated namespace name is not DNS-1123 compliant", "namespace", targetNamespace)
		return ctrl.Result{}, fmt.Errorf("invalid namespace name: %s", targetNamespace)
	}

	// Fetch Project to access Templates
	// Projects are stored in the team namespace, not the environment namespace
	project := &catalystv1alpha1.Project{}
	teamNamespace := hierarchy.Team
	if err := r.Get(ctx, client.ObjectKey{Name: env.Spec.ProjectRef.Name, Namespace: teamNamespace}, project); err != nil {
		log.Error(err, "Failed to fetch Project", "projectName", env.Spec.ProjectRef.Name, "teamNamespace", teamNamespace)
		return ctrl.Result{}, err
	}

	// Resolve Template
	var envTemplate *catalystv1alpha1.EnvironmentTemplate
	if t, ok := project.Spec.Templates[env.Spec.Type]; ok {
		envTemplate = &t
	} else {
		log.Info("No template found for environment type, using defaults", "type", env.Spec.Type)
	}

	// Finalizer logic
	if !env.DeletionTimestamp.IsZero() {
		if controllerutil.ContainsFinalizer(env, environmentFinalizer) {
			// Delete external resources
			log.Info("Deleting target namespace", "namespace", targetNamespace)
			ns := &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: targetNamespace,
				},
			}
			if err := r.Delete(ctx, ns); err != nil && !apierrors.IsNotFound(err) {
				return ctrl.Result{}, err
			}

			// Remove finalizer
			controllerutil.RemoveFinalizer(env, environmentFinalizer)
			if err := r.Update(ctx, env); err != nil {
				return ctrl.Result{}, err
			}
		}
		return ctrl.Result{}, nil
	}

	// Add Finalizer
	if !controllerutil.ContainsFinalizer(env, environmentFinalizer) {
		controllerutil.AddFinalizer(env, environmentFinalizer)
		if err := r.Update(ctx, env); err != nil {
			return ctrl.Result{}, err
		}
	}

	// 1. Namespace Management
	ns := &corev1.Namespace{}
	err := r.Get(ctx, client.ObjectKey{Name: targetNamespace}, ns)
	if err != nil && apierrors.IsNotFound(err) {
		log.Info("Creating Namespace", "namespace", targetNamespace)

		// Use first source branch if available
		branch := "main"
		if len(env.Spec.Sources) > 0 {
			branch = env.Spec.Sources[0].Branch
		}

		// Build labels with hierarchy information (FR-ENV-020)
		// hierarchy is guaranteed to be non-nil at this point due to earlier check
		labels := map[string]string{
			"catalyst.dev/environment":    sanitizeLabelValue(env.Name),
			"catalyst.dev/branch":         sanitizeLabelValue(branch),
			"catalyst.dev/namespace-type": sanitizeLabelValue("environment"),
			"catalyst.dev/team":           sanitizeLabelValue(hierarchy.Team),
			"catalyst.dev/project":        sanitizeLabelValue(hierarchy.Project),
		}

		ns = &corev1.Namespace{
			ObjectMeta: metav1.ObjectMeta{
				Name:   targetNamespace,
				Labels: labels,
			},
		}
		// Note: We cannot set OwnerReference for cluster-scoped resources like Namespace
		// relying on Finalizer instead.
		if err := r.Create(ctx, ns); err != nil {
			return ctrl.Result{}, err
		}
	} else if err != nil {
		return ctrl.Result{}, err
	}

	// 2. Manage ResourceQuota & NetworkPolicy
	ingressNamespace := os.Getenv("INGRESS_NAMESPACE")
	if ingressNamespace == "" {
		ingressNamespace = "ingress-nginx"
	}

	quota := desiredResourceQuota(targetNamespace)
	if err := r.Create(ctx, quota); err != nil && !apierrors.IsAlreadyExists(err) {
		return ctrl.Result{}, err
	}

	policy := desiredNetworkPolicy(targetNamespace, ingressNamespace)
	if err := r.Create(ctx, policy); err != nil && !apierrors.IsAlreadyExists(err) {
		return ctrl.Result{}, err
	}

	// 2b. Manage Registry Credentials
	if err := r.ensureRegistryCredentials(ctx, project.Namespace, targetNamespace); err != nil {
		if apierrors.IsNotFound(err) {
			log.Info("Waiting for resources (Secret/SA) for registry credentials")
			return ctrl.Result{RequeueAfter: time.Second}, nil
		}
		log.Error(err, "Failed to ensure registry credentials")
		return ctrl.Result{}, err
	}

	// 3. Ingress Management
	// Determine if we're in local mode (path-based routing) or production mode (hostname-based routing)
	isLocal := os.Getenv("LOCAL_PREVIEW_ROUTING") == "true"
	ingressPort := os.Getenv("INGRESS_PORT")

	ingress := desiredIngress(env, targetNamespace, isLocal)
	existingIngress := &networkingv1.Ingress{}
	err = r.Get(ctx, client.ObjectKey{Name: "app", Namespace: targetNamespace}, existingIngress)

	if err != nil && apierrors.IsNotFound(err) {
		// Ingress doesn't exist, create it
		log.Info("Creating Ingress", "namespace", targetNamespace, "isLocal", isLocal)
		if err := r.Create(ctx, ingress); err != nil {
			return ctrl.Result{}, err
		}
	} else if err != nil {
		return ctrl.Result{}, err
	}

	// Generate and update the URL in status
	publicURL := generateURL(env, targetNamespace, isLocal, ingressPort)
	if env.Status.URL != publicURL {
		env.Status.URL = publicURL
		log.Info("Updating Environment URL", "url", publicURL)
		if err := r.Status().Update(ctx, env); err != nil {
			return ctrl.Result{}, err
		}
	}

	// 4. Deployment Mode Branching
	// Infer mode from env.Spec.Type if DeploymentMode is not explicitly set
	deploymentMode := env.Spec.DeploymentMode
	if deploymentMode == "" {
		if envTemplate != nil && envTemplate.Type == "helm" {
			deploymentMode = "helm"
		} else if envTemplate != nil && envTemplate.Type == "docker-compose" {
			deploymentMode = "docker-compose"
		} else if env.Spec.Type == "development" {
			deploymentMode = "development"
		} else if env.Spec.Type == "deployment" || env.Spec.Type == "staging" || env.Spec.Type == "production" {
			deploymentMode = "production"
		} else {
			deploymentMode = "workspace" // Default fallback
		}
	}

	log.Info("Reconciling deployment mode", "mode", deploymentMode, "namespace", targetNamespace, "templateFound", envTemplate != nil)

	switch deploymentMode {
	case "development":
		return r.reconcileDevelopmentModeWithStatus(ctx, env, project, targetNamespace, isLocal, ingressPort, envTemplate)

	case "production":
		return r.reconcileProductionModeWithStatus(ctx, env, targetNamespace, isLocal, ingressPort, envTemplate)

	case "helm":
		return r.reconcileHelmModeWithStatus(ctx, env, project, targetNamespace, isLocal, ingressPort, envTemplate)

	case "docker-compose":
		return r.reconcileComposeModeWithStatus(ctx, env, project, targetNamespace, envTemplate)

	default: // "workspace" or any unrecognized value defaults to workspace
		return r.reconcileWorkspaceMode(ctx, env, targetNamespace)
	}
}

// reconcileComposeModeWithStatus handles docker-compose deployment with status updates
func (r *EnvironmentReconciler) reconcileComposeModeWithStatus(ctx context.Context, env *catalystv1alpha1.Environment, project *catalystv1alpha1.Project, namespace string, template *catalystv1alpha1.EnvironmentTemplate) (ctrl.Result, error) {
	log := logf.FromContext(ctx)

	// Wait for default service account
	sa := &corev1.ServiceAccount{}
	if err := r.Get(ctx, client.ObjectKey{Name: "default", Namespace: namespace}, sa); err != nil {
		if apierrors.IsNotFound(err) {
			log.Info("Waiting for default ServiceAccount", "namespace", namespace)
			return ctrl.Result{RequeueAfter: time.Second}, nil
		}
		return ctrl.Result{}, err
	}

	// Set provisioning status
	// Note: We check != "Failed" to prevent an infinite loop where the controller flip-flops
	// between "Failed" (due to error) and "Provisioning" (here), triggering constant updates.
	if env.Status.Phase != "Provisioning" && env.Status.Phase != "Ready" && env.Status.Phase != "Building" && env.Status.Phase != "Failed" {
		env.Status.Phase = "Provisioning"
		if err := r.Status().Update(ctx, env); err != nil {
			return ctrl.Result{}, err
		}
	}

	// Run compose reconciliation
	ready, err := r.ReconcileComposeMode(ctx, env, project, namespace, template)
	if err != nil {
		if env.Status.Phase != "Failed" {
			env.Status.Phase = "Failed"
			if updateErr := r.Status().Update(ctx, env); updateErr != nil {
				return ctrl.Result{}, updateErr
			}
		}

		if strings.Contains(err.Error(), "source not found") {
			log.Error(err, "Compose reconciliation failed due to missing source; pausing until fixed")
			return ctrl.Result{}, nil
		}
		return ctrl.Result{}, err
	}

	if ready {
		if env.Status.Phase != "Ready" {
			env.Status.Phase = "Ready"
			if err := r.Status().Update(ctx, env); err != nil {
				return ctrl.Result{}, err
			}
		}
		return ctrl.Result{}, nil
	}

	// Not ready yet (re-reconcile for builds or resources)
	return ctrl.Result{RequeueAfter: 5 * time.Second}, nil
}

// reconcileHelmModeWithStatus handles helm deployment with status updates
func (r *EnvironmentReconciler) reconcileHelmModeWithStatus(ctx context.Context, env *catalystv1alpha1.Environment, project *catalystv1alpha1.Project, namespace string, _ bool, _ string, template *catalystv1alpha1.EnvironmentTemplate) (ctrl.Result, error) {
	log := logf.FromContext(ctx)

	// Wait for default service account
	sa := &corev1.ServiceAccount{}
	if err := r.Get(ctx, client.ObjectKey{Name: "default", Namespace: namespace}, sa); err != nil {
		if apierrors.IsNotFound(err) {
			log.Info("Waiting for default ServiceAccount", "namespace", namespace)
			return ctrl.Result{RequeueAfter: time.Second}, nil
		}
		return ctrl.Result{}, err
	}

	// Reconcile Builds (Zero-Config / Dockerfile Builds)
	var builtImages map[string]string
	if template != nil && len(template.Builds) > 0 {
		// Update status to Building if not already (and not failed)
		if env.Status.Phase != "Building" && env.Status.Phase != "Ready" && env.Status.Phase != "Failed" {
			env.Status.Phase = "Building"
			if err := r.Status().Update(ctx, env); err != nil {
				return ctrl.Result{}, err
			}
		}

		var err error
		builtImages, err = r.reconcileBuilds(ctx, env, project, namespace, template)
		if err != nil {
			log.Error(err, "Build failed")
			env.Status.Phase = "Failed"
			_ = r.Status().Update(ctx, env)
			return ctrl.Result{}, err
		}

		if builtImages == nil {
			log.Info("Builds in progress...")
			return ctrl.Result{RequeueAfter: 10 * time.Second}, nil
		}
	}

	// Set provisioning status (if not building)
	// Note: We check != "Failed" to prevent an infinite loop where the controller flip-flops
	// between "Failed" (due to error) and "Provisioning" (here), triggering constant updates.
	if env.Status.Phase != "Provisioning" && env.Status.Phase != "Ready" && env.Status.Phase != "Building" && env.Status.Phase != "Failed" {
		env.Status.Phase = "Provisioning"
		if err := r.Status().Update(ctx, env); err != nil {
			return ctrl.Result{}, err
		}
	}

	// Run helm reconciliation
	ready, err := r.ReconcileHelmMode(ctx, env, project, namespace, template, builtImages)
	if err != nil {
		if env.Status.Phase != "Failed" {
			env.Status.Phase = "Failed"
			if updateErr := r.Status().Update(ctx, env); updateErr != nil {
				return ctrl.Result{}, updateErr
			}
		}

		if strings.Contains(err.Error(), "source not found") {
			log.Error(err, "Helm reconciliation failed due to missing source; pausing until fixed")
			return ctrl.Result{}, nil
		}
		return ctrl.Result{}, err
	}

	if ready {
		if env.Status.Phase != "Ready" {
			env.Status.Phase = "Ready"
			if err := r.Status().Update(ctx, env); err != nil {
				return ctrl.Result{}, err
			}
		}
		return ctrl.Result{}, nil
	}

	// Not ready yet, requeue
	return ctrl.Result{RequeueAfter: 5 * time.Second}, nil
}

// reconcileDevelopmentModeWithStatus handles development mode deployment with status updates
func (r *EnvironmentReconciler) reconcileDevelopmentModeWithStatus(ctx context.Context, env *catalystv1alpha1.Environment, project *catalystv1alpha1.Project, namespace string, _ bool, _ string, template *catalystv1alpha1.EnvironmentTemplate) (ctrl.Result, error) {
	log := logf.FromContext(ctx)

	// Wait for default service account
	sa := &corev1.ServiceAccount{}
	if err := r.Get(ctx, client.ObjectKey{Name: "default", Namespace: namespace}, sa); err != nil {
		if apierrors.IsNotFound(err) {
			log.Info("Waiting for default ServiceAccount", "namespace", namespace)
			return ctrl.Result{RequeueAfter: time.Second}, nil
		}
		return ctrl.Result{}, err
	}

	// Set provisioning status
	// Note: We check != "Failed" to prevent an infinite loop where the controller flip-flops
	// between "Failed" (due to error) and "Provisioning" (here), triggering constant updates.
	if env.Status.Phase != "Provisioning" && env.Status.Phase != "Ready" && env.Status.Phase != "Failed" {
		env.Status.Phase = "Provisioning"
		if err := r.Status().Update(ctx, env); err != nil {
			return ctrl.Result{}, err
		}
	}

	// Run development mode reconciliation
	ready, err := r.ReconcileDevelopmentMode(ctx, env, project, namespace, template)
	if err != nil {
		env.Status.Phase = "Failed"
		_ = r.Status().Update(ctx, env)
		return ctrl.Result{}, err
	}

	if ready {
		if env.Status.Phase != "Ready" {
			env.Status.Phase = "Ready"
			if err := r.Status().Update(ctx, env); err != nil {
				return ctrl.Result{}, err
			}
		}
		return ctrl.Result{}, nil
	}

	// Not ready yet, requeue
	return ctrl.Result{RequeueAfter: 5 * time.Second}, nil
}

// reconcileProductionModeWithStatus handles production mode deployment with status updates
func (r *EnvironmentReconciler) reconcileProductionModeWithStatus(ctx context.Context, env *catalystv1alpha1.Environment, namespace string, isLocal bool, _ string, template *catalystv1alpha1.EnvironmentTemplate) (ctrl.Result, error) {
	log := logf.FromContext(ctx)

	// Wait for default service account
	sa := &corev1.ServiceAccount{}
	if err := r.Get(ctx, client.ObjectKey{Name: "default", Namespace: namespace}, sa); err != nil {
		if apierrors.IsNotFound(err) {
			log.Info("Waiting for default ServiceAccount", "namespace", namespace)
			return ctrl.Result{RequeueAfter: time.Second}, nil
		}
		return ctrl.Result{}, err
	}

	// Set provisioning status
	// Note: We check != "Failed" to prevent an infinite loop where the controller flip-flops
	// between "Failed" (due to error) and "Provisioning" (here), triggering constant updates.
	if env.Status.Phase != "Provisioning" && env.Status.Phase != "Ready" && env.Status.Phase != "Failed" {
		env.Status.Phase = "Provisioning"
		if err := r.Status().Update(ctx, env); err != nil {
			return ctrl.Result{}, err
		}
	}

	// Run production mode reconciliation
	ready, err := r.ReconcileProductionMode(ctx, env, namespace, isLocal, template)
	if err != nil {
		env.Status.Phase = "Failed"
		_ = r.Status().Update(ctx, env)
		return ctrl.Result{}, err
	}

	if ready {
		if env.Status.Phase != "Ready" {
			env.Status.Phase = "Ready"
			if err := r.Status().Update(ctx, env); err != nil {
				return ctrl.Result{}, err
			}
		}
		return ctrl.Result{}, nil
	}

	// Not ready yet, requeue
	return ctrl.Result{RequeueAfter: 5 * time.Second}, nil
}

// reconcileWorkspaceMode handles workspace mode (original behavior)
func (r *EnvironmentReconciler) reconcileWorkspaceMode(ctx context.Context, env *catalystv1alpha1.Environment, namespace string) (ctrl.Result, error) {
	log := logf.FromContext(ctx)

	// Wait for default service account to be ready
	sa := &corev1.ServiceAccount{}
	if err := r.Get(ctx, client.ObjectKey{Name: "default", Namespace: namespace}, sa); err != nil {
		if apierrors.IsNotFound(err) {
			log.Info("Waiting for default ServiceAccount", "namespace", namespace)
			return ctrl.Result{RequeueAfter: time.Second}, nil
		}
		return ctrl.Result{}, err
	}

	// Create a workspace pod that runs indefinitely for exec access from UI
	podName := workspacePodName(env)
	workspacePod := &corev1.Pod{}
	err := r.Get(ctx, client.ObjectKey{Name: podName, Namespace: namespace}, workspacePod)

	if err != nil && apierrors.IsNotFound(err) {
		// Pod doesn't exist, create it
		log.Info("Creating Workspace Pod", "pod", podName)
		workspacePod = desiredWorkspacePod(env, namespace)

		// Note: Pod is in different namespace, cannot set owner ref.
		// It will be garbage collected when the Namespace is deleted.
		if err := r.Create(ctx, workspacePod); err != nil {
			return ctrl.Result{}, err
		}
		// Update Status
		env.Status.Phase = "Provisioning"
		if err := r.Status().Update(ctx, env); err != nil {
			return ctrl.Result{}, err
		}
		return ctrl.Result{RequeueAfter: 5 * time.Second}, nil
	} else if err != nil {
		return ctrl.Result{}, err
	}

	// Check Pod Status
	switch workspacePod.Status.Phase {
	case corev1.PodRunning:
		// Pod is running and ready for exec
		// Note: Keep the URL that was set from the Ingress
		if env.Status.Phase != "Ready" {
			env.Status.Phase = "Ready"
			// Don't overwrite URL - it was set from Ingress creation above
			if err := r.Status().Update(ctx, env); err != nil {
				return ctrl.Result{}, err
			}
		}
	case corev1.PodFailed:
		env.Status.Phase = "Failed"
		if err := r.Status().Update(ctx, env); err != nil {
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, nil
	default:
		// Still starting up (Pending, etc.)
		if env.Status.Phase != "Provisioning" {
			env.Status.Phase = "Provisioning"
			if err := r.Status().Update(ctx, env); err != nil {
				return ctrl.Result{}, err
			}
		}
		// Poll pod status
		return ctrl.Result{RequeueAfter: 5 * time.Second}, nil
	}

	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *EnvironmentReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.Config = mgr.GetConfig()
	return ctrl.NewControllerManagedBy(mgr).
		For(&catalystv1alpha1.Environment{}).
		// Note: Resources in target namespace are not owned via OwnerRef due to cross-namespace restrictions.
		// We rely on polling for Job status and Finalizer for cleanup.
		Named("environment").
		Complete(r)
}
