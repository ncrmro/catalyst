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

package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EnvironmentSpec defines the desired state of Environment
// Spec referenced from operator/spec.md
type EnvironmentSpec struct {
	// ProjectRef references the parent Project
	ProjectRef ProjectReference `json:"projectRef"`

	// Type of environment (development, deployment)
	Type string `json:"type"`

	// Source configuration for this specific environment
	Source EnvironmentSource `json:"source"`

	// DevContainer defines the development workspace configuration
	// +optional
	DevContainer *DevContainer `json:"devContainer,omitempty"`

	// Features defines optional capabilities for the environment
	// +optional
	Features *EnvironmentFeatures `json:"features,omitempty"`

	// Config overrides
	Config EnvironmentConfig `json:"config,omitempty"`
}

type ProjectReference struct {
	// Name of the project CR
	Name string `json:"name"`
}

type DevContainer struct {
	// Type of dev container: "nix" (default), "docker"
	// +optional
	// +kubebuilder:default="nix"
	Type string `json:"type,omitempty"`

	// Image to use (overrides default based on type)
	// +optional
	Image string `json:"image,omitempty"`

	// LivenessProbe defines the liveness probe for the main container
	// +optional
	LivenessProbe *Probe `json:"livenessProbe,omitempty"`

	// ReadinessProbe defines the readiness probe for the main container
	// +optional
	ReadinessProbe *Probe `json:"readinessProbe,omitempty"`
}

// Probe defines a health check probe for a container.
// It directly maps to corev1.Probe to leverage Kubernetes' probe configuration.
type Probe struct {
	// Handler defines the action taken to determine the health of a container.
	// +optional
	corev1.ProbeHandler `json:",inline"`

	// Number of seconds after the container has started before liveness probes are initiated.
	// Defaults to 0 seconds. Minimum value is 0.
	// +optional
	InitialDelaySeconds int32 `json:"initialDelaySeconds,omitempty"`

	// Number of seconds after which the probe times out.
	// Defaults to 1 second. Minimum value is 1.
	// +optional
	TimeoutSeconds int32 `json:"timeoutSeconds,omitempty"`

	// How often (in seconds) to perform the probe.
	// Defaults to 10 seconds. Minimum value is 1.
	// +optional
	PeriodSeconds int32 `json:"periodSeconds,omitempty"`

	// Minimum consecutive successes for the probe to be considered successful after having failed.
	// Defaults to 1. Must be 1 for liveness and startup. Minimum value is 1.
	// +optional
	SuccessThreshold int32 `json:"successThreshold,omitempty"`

	// Minimum consecutive failures for the probe to be considered failed after having succeeded.
	// Defaults to 3. Minimum value is 1.
	// +optional
	FailureThreshold int32 `json:"failureThreshold,omitempty"`
}

type EnvironmentFeatures struct {
	// DockerEnabled adds a Docker-in-Docker sidecar for building container images
	// +optional
	DockerEnabled bool `json:"dockerEnabled,omitempty"`
}


type EnvironmentSource struct {
	// CommitSha is the git commit to deploy
	CommitSha string `json:"commitSha"`

	// Branch name
	Branch string `json:"branch"`

	// PrNumber (optional) for pull requests
	// +optional
	PrNumber int `json:"prNumber,omitempty"`
}

type EnvironmentConfig struct {
	// EnvVars to inject into the deployment
	// +optional
	EnvVars []EnvVar `json:"envVars,omitempty"`
}

type EnvVar struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// EnvironmentStatus defines the observed state of Environment.
type EnvironmentStatus struct {
	// Phase represents the current lifecycle state (Pending, Building, Deploying, Ready, Failed)
	// +optional
	Phase string `json:"phase,omitempty"`

	// URL is the public endpoint if available
	// +optional
	URL string `json:"url,omitempty"`

	// conditions represent the current state of the Environment resource.
	// +listType=map
	// +listMapKey=type
	// +optional
	Conditions []metav1.Condition `json:"conditions,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status

// Environment is the Schema for the environments API
type Environment struct {
	metav1.TypeMeta `json:",inline"`

	// metadata is a standard object metadata
	// +optional
	metav1.ObjectMeta `json:"metadata,omitzero"`

	// spec defines the desired state of Environment
	// +required
	Spec EnvironmentSpec `json:"spec"`

	// status defines the observed state of Environment
	// +optional
	Status EnvironmentStatus `json:"status,omitzero"`
}

// +kubebuilder:object:root=true

// EnvironmentList contains a list of Environment
type EnvironmentList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitzero"`
	Items           []Environment `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Environment{}, &EnvironmentList{})
}
