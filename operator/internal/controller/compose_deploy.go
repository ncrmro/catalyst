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
	"path/filepath"

	"gopkg.in/yaml.v3"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"

	catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

// DockerCompose represents a simplified version of docker-compose.yml
type DockerCompose struct {
	Version  string                    `yaml:"version"`
	Services map[string]ComposeService `yaml:"services"`
}

type ComposeService struct {
	Image       string      `yaml:"image"`
	Build       yaml.Node   `yaml:"build"` // Using yaml.Node to handle string or struct
	Ports       []string    `yaml:"ports"`
	Environment yaml.Node   `yaml:"environment"` // Using yaml.Node to handle list or map
	Command     interface{} `yaml:"command"`     // Using interface to handle string or list
}

// ReconcileComposeMode handles the reconciliation for Docker Compose deployment mode.
func (r *EnvironmentReconciler) ReconcileComposeMode(ctx context.Context, env *catalystv1alpha1.Environment, project *catalystv1alpha1.Project, namespace string, template *catalystv1alpha1.EnvironmentTemplate) (bool, error) {
	log := logf.FromContext(ctx)

	// 1. Prepare Source
	sourcePath, cleanup, err := r.prepareSource(ctx, env, project, template)
	if cleanup != nil {
		defer cleanup()
	}
	if err != nil {
		return false, err
	}

	// 2. Parse docker-compose.yml
	composeFile := filepath.Join(sourcePath, "docker-compose.yml")
	if _, err := os.Stat(composeFile); os.IsNotExist(err) {
		// Try .yaml
		composeFile = filepath.Join(sourcePath, "docker-compose.yaml")
	}

	data, err := os.ReadFile(composeFile)
	if err != nil {
		return false, fmt.Errorf("failed to read docker-compose file: %w", err)
	}

	var compose DockerCompose
	if err := yaml.Unmarshal(data, &compose); err != nil {
		return false, fmt.Errorf("failed to parse docker-compose file: %w", err)
	}

	// 3. Dynamic Builds Identification
	sourceRef := template.SourceRef
	if sourceRef == "" && len(project.Spec.Sources) > 0 {
		sourceRef = project.Spec.Sources[0].Name
	}

	dynamicBuilds := []catalystv1alpha1.BuildSpec{}
	for name, service := range compose.Services {
		if !service.Build.IsZero() {
			buildPath := "."
			if service.Build.Kind == yaml.ScalarNode {
				buildPath = service.Build.Value
			} else if service.Build.Kind == yaml.MappingNode {
				// Simplified: look for context key
				for i := 0; i < len(service.Build.Content); i += 2 {
					if service.Build.Content[i].Value == "context" {
						buildPath = service.Build.Content[i+1].Value
						break
					}
				}
			}

			dynamicBuilds = append(dynamicBuilds, catalystv1alpha1.BuildSpec{
				Name:      name,
				SourceRef: sourceRef,
				Path:      filepath.Join(template.Path, buildPath),
			})
		}
	}

	// 4. Execute Builds
	var builtImages map[string]string
	if len(dynamicBuilds) > 0 {
		// Temporary Template for builds
		tempTemplate := *template
		tempBuilds := append([]catalystv1alpha1.BuildSpec{}, template.Builds...)
		tempBuilds = append(tempBuilds, dynamicBuilds...)
		tempTemplate.Builds = tempBuilds

		builtImages, err = r.reconcileBuilds(ctx, env, project, namespace, &tempTemplate)
		if err != nil {
			return false, err
		}
		if builtImages == nil {
			return false, nil // Waiting for builds
		}
	}

	// 5. Generate and Apply K8s Resources
	allReady := true
	for name, service := range compose.Services {
		// Determine Image
		image := service.Image
		if img, ok := builtImages[name]; ok {
			image = img
		}

		if image == "" && service.Build.IsZero() {
			log.Error(nil, "Service has no image or build directive", "service", name)
			continue
		}

		// Create Deployment
		deploy := r.desiredComposeDeployment(namespace, name, image, service, env)
		if err := r.patchOrUpdate(ctx, deploy); err != nil {
			return false, err
		}

		// Create Service if ports exposed
		if len(service.Ports) > 0 {
			svc := r.desiredComposeService(namespace, name, service)
			if err := r.patchOrUpdate(ctx, svc); err != nil {
				return false, err
			}
		}

		// Check readiness
		ready, err := r.isDeploymentReady(ctx, namespace, name)
		if err != nil {
			return false, err
		}
		if !ready {
			allReady = false
		}
	}

	return allReady, nil
}

func (r *EnvironmentReconciler) desiredComposeDeployment(namespace, name, image string, service ComposeService, env *catalystv1alpha1.Environment) *appsv1.Deployment {
	replicas := int32(1)

	// Convert environment yaml.Node to K8s EnvVars
	envVars := []corev1.EnvVar{}
	// Simplified: only supporting mapping for now
	if service.Environment.Kind == yaml.MappingNode {
		for i := 0; i < len(service.Environment.Content); i += 2 {
			k := service.Environment.Content[i].Value
			v := service.Environment.Content[i+1].Value
			envVars = append(envVars, corev1.EnvVar{Name: k, Value: v})
		}
	}

	// Add environment-level overrides
	envVars = append(envVars, toCoreEnvVars(env.Spec.Config.EnvVars)...)

	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
			Labels: map[string]string{
				"app":                          name,
				"catalyst.dev/compose-service": name,
			},
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{"app": name},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{"app": name},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  name,
							Image: image,
							Env:   envVars,
						},
					},
				},
			},
		},
	}
}

func (r *EnvironmentReconciler) desiredComposeService(namespace, name string, service ComposeService) *corev1.Service {
	ports := []corev1.ServicePort{}
	for _, p := range service.Ports {
		// Simplified port parsing: "80:80" or "80"
		var port int
		fmt.Sscanf(p, "%d:%d", &port, &port) // Naive
		if port == 0 {
			fmt.Sscanf(p, "%d", &port)
		}
		if port != 0 {
			ports = append(ports, corev1.ServicePort{
				Name:       fmt.Sprintf("port-%d", port),
				Port:       int32(port),
				TargetPort: intstr.FromInt(port),
			})
		}
	}

	return &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
		},
		Spec: corev1.ServiceSpec{
			Selector: map[string]string{"app": name},
			Ports:    ports,
		},
	}
}

func (r *EnvironmentReconciler) patchOrUpdate(ctx context.Context, obj client.Object) error {
	// Simple create or update logic
	existing := obj.DeepCopyObject().(client.Object)
	err := r.Get(ctx, client.ObjectKey{Name: obj.GetName(), Namespace: obj.GetNamespace()}, existing)
	if err != nil {
		if apierrors.IsNotFound(err) {
			return r.Create(ctx, obj)
		}
		return err
	}

	// Update (ignoring resource version for now, naive)
	obj.SetResourceVersion(existing.GetResourceVersion())
	return r.Update(ctx, obj)
}
