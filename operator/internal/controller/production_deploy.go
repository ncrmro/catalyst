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

	appsv1 "k8s.io/api/apps/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"

	catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

// ReconcileProductionMode handles the reconciliation for production deployment mode.
// It deploys a pre-built container image using the existing desiredDeployment/desiredService patterns.
func (r *EnvironmentReconciler) ReconcileProductionMode(ctx context.Context, env *catalystv1alpha1.Environment, namespace string, isLocal bool, template *catalystv1alpha1.EnvironmentTemplate) (bool, error) {
	log := logf.FromContext(ctx)

	// 1. Create/update deployment using pre-built image from registry
	deployment := desiredDeployment(env, namespace)
	existingDeployment := &appsv1.Deployment{}
	err := r.Get(ctx, client.ObjectKey{Name: "app", Namespace: namespace}, existingDeployment)

	if err != nil && apierrors.IsNotFound(err) {
		log.Info("Creating Production Deployment", "namespace", namespace, "image", deployment.Spec.Template.Spec.Containers[0].Image)
		if err := r.Create(ctx, deployment); err != nil {
			return false, err
		}
	} else if err != nil {
		return false, err
	} else {
		// Deployment exists, check if image needs update
		currentImage := ""
		if len(existingDeployment.Spec.Template.Spec.Containers) > 0 {
			currentImage = existingDeployment.Spec.Template.Spec.Containers[0].Image
		}
		desiredImage := deployment.Spec.Template.Spec.Containers[0].Image

		if currentImage != desiredImage {
			log.Info("Updating Production Deployment image", "from", currentImage, "to", desiredImage)
			existingDeployment.Spec.Template.Spec.Containers[0].Image = desiredImage
			existingDeployment.Spec.Template.Spec.Containers[0].Env = toCoreEnvVars(env.Spec.Config.EnvVars)
			if err := r.Update(ctx, existingDeployment); err != nil {
				return false, err
			}
		}
	}

	// 2. Create service (idempotent)
	service := desiredService(namespace)
	if err := r.Create(ctx, service); err != nil && !apierrors.IsAlreadyExists(err) {
		return false, err
	}

	// 3. Check if deployment is ready
	ready, err := r.isDeploymentReady(ctx, namespace, "app")
	if err != nil {
		return false, err
	}

	if !ready {
		log.Info("Waiting for Production Deployment to be ready", "namespace", namespace)
	}

	return ready, nil
}
