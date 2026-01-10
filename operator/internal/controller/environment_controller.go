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
	"regexp"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	logf "sigs.k8s.io/controller-runtime/pkg/log"

	catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

const environmentFinalizer = "catalyst.dev/finalizer"

// EnvironmentReconciler reconciles a Environment object
type EnvironmentReconciler struct {
	client.Client
	Scheme *runtime.Scheme
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

func (r *EnvironmentReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	log := logf.FromContext(ctx)

	env := &catalystv1alpha1.Environment{}
	if err := r.Get(ctx, req.NamespacedName, env); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	targetNamespace := fmt.Sprintf("%s-%s", env.Spec.ProjectRef.Name, env.Name)

	// Fetch Project to access Templates
	project := &catalystv1alpha1.Project{}
	if err := r.Get(ctx, client.ObjectKey{Name: env.Spec.ProjectRef.Name, Namespace: env.Namespace}, project); err != nil {
		log.Error(err, "Failed to fetch Project", "projectName", env.Spec.ProjectRef.Name)
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
	if !env.ObjectMeta.DeletionTimestamp.IsZero() {
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

		ns = &corev1.Namespace{
			ObjectMeta: metav1.ObjectMeta{
				Name: targetNamespace,
				Labels: map[string]string{
					"catalyst.dev/team":        "catalyst", // TODO: Get from Project or Env
					"catalyst.dev/project":     sanitizeLabelValue(env.Spec.ProjectRef.Name),
					"catalyst.dev/environment": sanitizeLabelValue(env.Name),
					"catalyst.dev/branch":      sanitizeLabelValue(branch),
				},
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
	quota := desiredResourceQuota(targetNamespace)
	if err := r.Create(ctx, quota); err != nil && !apierrors.IsAlreadyExists(err) {
		return ctrl.Result{}, err
	}

	policy := desiredNetworkPolicy(targetNamespace)
	if err := r.Create(ctx, policy); err != nil && !apierrors.IsAlreadyExists(err) {
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
		if env.Spec.Type == "development" {
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
		return r.reconcileDevelopmentModeWithStatus(ctx, env, targetNamespace, isLocal, ingressPort, envTemplate)

	case "production":
		return r.reconcileProductionModeWithStatus(ctx, env, targetNamespace, isLocal, ingressPort, envTemplate)

	default: // "workspace" or any unrecognized value defaults to workspace
		return r.reconcileWorkspaceMode(ctx, env, targetNamespace)
	}
}

// reconcileDevelopmentModeWithStatus handles development mode deployment with status updates
func (r *EnvironmentReconciler) reconcileDevelopmentModeWithStatus(ctx context.Context, env *catalystv1alpha1.Environment, namespace string, isLocal bool, ingressPort string, template *catalystv1alpha1.EnvironmentTemplate) (ctrl.Result, error) {
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
	if env.Status.Phase != "Provisioning" && env.Status.Phase != "Ready" {
		env.Status.Phase = "Provisioning"
		if err := r.Status().Update(ctx, env); err != nil {
			return ctrl.Result{}, err
		}
	}

	// Run development mode reconciliation
	ready, err := r.ReconcileDevelopmentMode(ctx, env, namespace, template)
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
func (r *EnvironmentReconciler) reconcileProductionModeWithStatus(ctx context.Context, env *catalystv1alpha1.Environment, namespace string, isLocal bool, ingressPort string, template *catalystv1alpha1.EnvironmentTemplate) (ctrl.Result, error) {
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
	if env.Status.Phase != "Provisioning" && env.Status.Phase != "Ready" {
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
	if workspacePod.Status.Phase == corev1.PodRunning {
		// Pod is running and ready for exec
		// Note: Keep the URL that was set from the Ingress
		if env.Status.Phase != "Ready" {
			env.Status.Phase = "Ready"
			// Don't overwrite URL - it was set from Ingress creation above
			if err := r.Status().Update(ctx, env); err != nil {
				return ctrl.Result{}, err
			}
		}
	} else if workspacePod.Status.Phase == corev1.PodFailed {
		env.Status.Phase = "Failed"
		if err := r.Status().Update(ctx, env); err != nil {
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, nil
	} else {
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
	return ctrl.NewControllerManagedBy(mgr).
		For(&catalystv1alpha1.Environment{}).
		// Note: Resources in target namespace are not owned via OwnerRef due to cross-namespace restrictions.
		// We rely on polling for Job status and Finalizer for cleanup.
		Named("environment").
		Complete(r)
}
