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

	// DeploymentMode specifies how the operator should deploy this environment.
	// Valid values: "production", "development", "workspace" (default).
	// - "production": Static deployment from manifest pattern
	// - "development": Hot-reload with volume mounts and init containers
	// - "workspace": Simple workspace pod (default, existing behavior)
	// +optional
	DeploymentMode string `json:"deploymentMode,omitempty"`

	// Sources configuration for this specific environment
	Sources []EnvironmentSource `json:"sources"`

	// Config overrides
	Config EnvironmentConfig `json:"config,omitempty"`

	// Ingress configuration for exposing the environment
	// +optional
	Ingress *IngressConfig `json:"ingress,omitempty"`
}

type ProjectReference struct {
	// Name of the project CR
	Name string `json:"name"`
}

type EnvironmentSource struct {
	// Name identifies the component (matches Project.Sources[].Name)
	Name string `json:"name"`

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

	// Image is the container image to deploy (e.g., "ghcr.io/ncrmro/catalyst:latest")
	// If not specified, defaults to cluster registry with commit SHA
	// +optional
	Image string `json:"image,omitempty"`
}

type EnvVar struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type IngressConfig struct {
	// Enabled controls whether to create an Ingress resource
	Enabled bool `json:"enabled"`

	// Host is the hostname for the ingress (e.g., env-preview-123.preview.example.com)
	// +optional
	Host string `json:"host,omitempty"`

	// TLS configuration for HTTPS
	// +optional
	TLS *IngressTLSConfig `json:"tls,omitempty"`
}

type IngressTLSConfig struct {
	// Enabled controls whether to enable TLS
	Enabled bool `json:"enabled"`

	// Issuer is the cert-manager ClusterIssuer name
	// +optional
	Issuer string `json:"issuer,omitempty"`
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
