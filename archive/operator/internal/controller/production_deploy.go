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

	appsv1 "k8s.io/api/apps/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"

	catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

// ReconcileProductionMode handles the reconciliation for production deployment mode.
// It deploys using resolved config from Project template and Environment overrides.
func (r *EnvironmentReconciler) ReconcileProductionMode(ctx context.Context, env *catalystv1alpha1.Environment, project *catalystv1alpha1.Project, namespace string, isLocal bool, template *catalystv1alpha1.EnvironmentTemplate) (bool, error) {
	log := logf.FromContext(ctx)

	// 0. Get and validate configuration (required - no fallbacks)
	templateConfig, err := getTemplateConfig(project, env)
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
	)

	// 1. Create/update deployment using config
	deployment := desiredDeploymentFromConfig(namespace, &config)

	existingDeployment := &appsv1.Deployment{}
	getErr := r.Get(ctx, client.ObjectKey{Name: "web", Namespace: namespace}, existingDeployment)

	if getErr != nil && apierrors.IsNotFound(getErr) {
		log.Info("Creating Production Deployment", "namespace", namespace, "image", deployment.Spec.Template.Spec.Containers[0].Image)
		if err := r.Create(ctx, deployment); err != nil {
			return false, err
		}
	} else if getErr != nil {
		return false, getErr
	} else {
		// Deployment exists, check if image needs update
		currentImage := ""
		if len(existingDeployment.Spec.Template.Spec.Containers) > 0 {
			currentImage = existingDeployment.Spec.Template.Spec.Containers[0].Image
		}
		desiredImage := deployment.Spec.Template.Spec.Containers[0].Image

		if currentImage != desiredImage {
			log.Info("Updating Production Deployment image", "from", currentImage, "to", desiredImage)
			existingDeployment.Spec = deployment.Spec
			if err := r.Update(ctx, existingDeployment); err != nil {
				return false, err
			}
		}
	}

	// 2. Create service (idempotent)
	service := desiredServiceFromConfig(namespace, &config)
	if err := r.Create(ctx, service); err != nil && !apierrors.IsAlreadyExists(err) {
		return false, err
	}

	// 3. Check if deployment is ready
	ready, err := r.isDeploymentReady(ctx, namespace, "web")
	if err != nil {
		return false, err
	}

	if !ready {
		log.Info("Waiting for Production Deployment to be ready", "namespace", namespace)
	}

	return ready, nil
}
