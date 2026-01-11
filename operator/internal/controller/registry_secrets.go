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

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
)

// ensureRegistryCredentials copies registry secrets from source namespace to target namespace
// and patches the default ServiceAccount to use them for image pulling.
func (r *EnvironmentReconciler) ensureRegistryCredentials(ctx context.Context, sourceNs, targetNs string) error {
	log := logf.FromContext(ctx)

	// 1. Copy Secret
	// Check if secret exists in source
	sourceSecret := &corev1.Secret{}
	err := r.Get(ctx, client.ObjectKey{Name: registrySecretName, Namespace: sourceNs}, sourceSecret)
	if err != nil {
		if apierrors.IsNotFound(err) {
			// No registry credentials configured for this project. Not an error.
			// Users might be using public images or node-local registry.
			log.Info("No registry credentials found in project namespace", "namespace", sourceNs)
			return nil
		}
		return err
	}

	// Check if secret exists in target
	targetSecret := &corev1.Secret{}
	err = r.Get(ctx, client.ObjectKey{Name: registrySecretName, Namespace: targetNs}, targetSecret)
	if err != nil && !apierrors.IsNotFound(err) {
		return err
	}

	if apierrors.IsNotFound(err) {
		// Create copy
		log.Info("Copying registry credentials to target namespace", "namespace", targetNs)
		newSecret := &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      registrySecretName,
				Namespace: targetNs,
			},
			Data: sourceSecret.Data,
			Type: sourceSecret.Type,
		}
		if err := r.Create(ctx, newSecret); err != nil {
			return err
		}
	} else {
		// Update existing (sync)
		targetSecret.Data = sourceSecret.Data
		targetSecret.Type = sourceSecret.Type
		if err := r.Update(ctx, targetSecret); err != nil {
			return err
		}
	}

	// 2. Patch ServiceAccount
	sa := &corev1.ServiceAccount{}
	if err := r.Get(ctx, client.ObjectKey{Name: "default", Namespace: targetNs}, sa); err != nil {
		if apierrors.IsNotFound(err) {
			// SA might not exist yet if Namespace was just created
			return err
		}
		return err
	}

	// Check if already has imagePullSecret
	hasSecret := false
	for _, ref := range sa.ImagePullSecrets {
		if ref.Name == registrySecretName {
			hasSecret = true
			break
		}
	}

	if !hasSecret {
		log.Info("Patching default ServiceAccount with imagePullSecrets", "namespace", targetNs)
		sa.ImagePullSecrets = append(sa.ImagePullSecrets, corev1.LocalObjectReference{Name: registrySecretName})
		if err := r.Update(ctx, sa); err != nil {
			return err
		}
	}

	return nil
}
