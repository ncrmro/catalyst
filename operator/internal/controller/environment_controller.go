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
	"time"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
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

// +kubebuilder:rbac:groups=catalyst.catalyst.dev,resources=environments,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=catalyst.catalyst.dev,resources=environments/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=catalyst.catalyst.dev,resources=projects,verbs=get;list;watch
// +kubebuilder:rbac:groups=batch,resources=jobs,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=apps,resources=deployments,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=services,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=networking.k8s.io,resources=ingresses,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=catalyst.catalyst.dev,resources=environments/finalizers,verbs=update
// +kubebuilder:rbac:groups="",resources=namespaces,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups="",resources=resourcequotas,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=networking.k8s.io,resources=networkpolicies,verbs=get;list;watch;create;update;patch;delete

func (r *EnvironmentReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	log := logf.FromContext(ctx)

	env := &catalystv1alpha1.Environment{}
	if err := r.Get(ctx, req.NamespacedName, env); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	targetNamespace := "env-" + env.Name

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
		ns = &corev1.Namespace{
			ObjectMeta: metav1.ObjectMeta{
				Name: targetNamespace,
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

	// 3. Build Orchestration
	// Fetch Project to get Repo URL
	project := &catalystv1alpha1.Project{}
	if err := r.Get(ctx, client.ObjectKey{Name: env.Spec.ProjectRef.Name, Namespace: env.Namespace}, project); err != nil {
		return ctrl.Result{}, err
	}

	jobName := buildJobName(env)
	job := &batchv1.Job{}
	err = r.Get(ctx, client.ObjectKey{Name: jobName, Namespace: targetNamespace}, job)

	if err != nil && apierrors.IsNotFound(err) {
		// Job doesn't exist, create it
		log.Info("Creating Build Job", "job", jobName)
		job = desiredBuildJob(env, targetNamespace)
		// Fixup Repo URL from Project
		// In a real app we'd handle context construction better (e.g. including auth tokens)
		// Kaniko context format: git://github.com/org/repo#refs/heads/branch or #commit
		// We use the commit sha from env source
		job.Spec.Template.Spec.Containers[0].Args[1] = "--context=" + project.Spec.Source.RepositoryURL + "#" + env.Spec.Source.CommitSha

		// Note: Job is in different namespace, cannot set owner ref.
		// It will be garbage collected when the Namespace is deleted.
		if err := r.Create(ctx, job); err != nil {
			return ctrl.Result{}, err
		}
		// Update Status
		env.Status.Phase = "Building"
		if err := r.Status().Update(ctx, env); err != nil {
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, nil
	} else if err != nil {
		return ctrl.Result{}, err
	}

	// Check Job Status
	if job.Status.Succeeded > 0 {
		// Build Done

		// 4. Deployment & Ingress
		deploy := desiredDeployment(env, targetNamespace)
		if err := r.Create(ctx, deploy); err != nil && !apierrors.IsAlreadyExists(err) {
			return ctrl.Result{}, err
		}

		svc := desiredService(env, targetNamespace)
		if err := r.Create(ctx, svc); err != nil && !apierrors.IsAlreadyExists(err) {
			return ctrl.Result{}, err
		}

		ing := desiredIngress(env, targetNamespace)
		if err := r.Create(ctx, ing); err != nil && !apierrors.IsAlreadyExists(err) {
			return ctrl.Result{}, err
		}

		// Update Status
		if env.Status.Phase != "Ready" {
			env.Status.Phase = "Ready"
			env.Status.URL = "https://" + ing.Spec.Rules[0].Host
			if err := r.Status().Update(ctx, env); err != nil {
				return ctrl.Result{}, err
			}
		}
	} else if job.Status.Failed > 0 {
		env.Status.Phase = "BuildFailed"
		if err := r.Status().Update(ctx, env); err != nil {
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, nil // Stop reconciliation until manual intervention or new commit
	} else {
		// Still running
		if env.Status.Phase != "Building" {
			env.Status.Phase = "Building"
			if err := r.Status().Update(ctx, env); err != nil {
				return ctrl.Result{}, err
			}
		}
		// Poll job status
		return ctrl.Result{RequeueAfter: 10 * time.Second}, nil
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
