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
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

// ProjectSpec defines the desired state of Project
// Spec referenced from operator/spec.md
type ProjectSpec struct {
	// GitHubInstallationId selects the GitHub credentials used for this project.
	// This is a string that can either be:
	//   * the numeric GitHub App installation ID (as a string) for the repository
	//     or organization, or
	//   * the special value "pat" to indicate use of a personal access token
	//       instead of an installation.
	// Used by the credential helper to fetch fresh GitHub tokens for git operations.
	// +optional
	GitHubInstallationId string `json:"githubInstallationId,omitempty"`

	// Sources configuration for the project (supports multiple repos)
	Sources []SourceConfig `json:"sources"`

	// Templates for different environment types.
	// Standard keys: "development" (previews) and "deployment" (production/staging).
	// +optional
	Templates map[string]EnvironmentTemplate `json:"templates,omitempty"`

	// Resources configuration (quotas, limits)
	Resources ResourceConfig `json:"resources,omitempty"`
}

type SourceConfig struct {
	// Name to identify this source component (e.g. "frontend", "backend")
	Name string `json:"name"`

	// RepositoryURL is the git repository URL
	RepositoryURL string `json:"repositoryUrl"`

	// Branch is the default branch to use
	Branch string `json:"branch"`
}

type EnvironmentTemplate struct {
	// SourceRef refers to one of the sources defined in Project.Sources
	// containing the deployment configuration (e.g. Chart.yaml or k8s manifests).
	// If empty, assumes the first source or a primary source.
	// +optional
	SourceRef string `json:"sourceRef,omitempty"`

	// Type of deployment (helm, manifest, kustomize, docker-compose)
	Type string `json:"type"`

	// Path to the deployment definition (e.g. chart path) relative to SourceRef root.
	// +optional
	Path string `json:"path,omitempty"`

	// Builds defines the artifacts (container images) to be built from sources before deployment.
	// This separates the "deployment logic" (e.g. Helm Chart) from the "application code" (e.g. Dockerfiles).
	// The operator will build these images and can inject them into the deployment (e.g. via Helm values).
	// +optional
	Builds []BuildSpec `json:"builds,omitempty"`

	// Values are the default values to inject
	// +kubebuilder:pruning:PreserveUnknownFields
	// +optional
	Values runtime.RawExtension `json:"values,omitempty"`

	// Config provides template-level defaults for managed deployments (FR-ENV-027, FR-ENV-029).
	// Uses K8s-native types (see EnvironmentConfig in environment_types.go).
	// Environment CR config overrides these values.
	// For Helm deployments, this field is typically empty (chart handles everything).
	// For Managed deployments, this provides the container/probe/resource configuration.
	// +optional
	Config *EnvironmentConfig `json:"config,omitempty"`
}

type BuildSpec struct {
	// Name identifies this build artifact (e.g. "frontend", "api").
	// This name is used to inject the built image into the deployment values.
	// Example: for name "frontend", values might receive global.images.frontend.repository
	Name string `json:"name"`

	// SourceRef refers to the Project.Source containing the application code.
	SourceRef string `json:"sourceRef"`

	// Path is the build context directory relative to the SourceRef root.
	// Defaults to root if empty.
	// +optional
	Path string `json:"path,omitempty"`

	// Dockerfile is the path to the Dockerfile relative to Path.
	// If empty, auto-detection or default "Dockerfile" is assumed.
	// +optional
	Dockerfile string `json:"dockerfile,omitempty"`

	// Resources allows customizing the build job resources (requests/limits)
	// +optional
	Resources *corev1.ResourceRequirements `json:"resources,omitempty"`
}

type ResourceConfig struct {
	// DefaultQuota defines the default resource quota for environments of this project
	DefaultQuota QuotaSpec `json:"defaultQuota,omitempty"`
}

type QuotaSpec struct {
	// CPU limit (e.g. "1")
	CPU string `json:"cpu,omitempty"`

	// Memory limit (e.g. "2Gi")
	Memory string `json:"memory,omitempty"`
}

// ProjectStatus defines the observed state of Project.
type ProjectStatus struct {
	// conditions represent the current state of the Project resource.
	// +listType=map
	// +listMapKey=type
	// +optional
	Conditions []metav1.Condition `json:"conditions,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status

// Project is the Schema for the projects API
type Project struct {
	metav1.TypeMeta `json:",inline"`

	// metadata is a standard object metadata
	// +optional
	metav1.ObjectMeta `json:"metadata,omitzero"`

	// spec defines the desired state of Project
	// +required
	Spec ProjectSpec `json:"spec"`

	// status defines the observed state of Project
	// +optional
	Status ProjectStatus `json:"status,omitzero"`
}

// +kubebuilder:object:root=true

// ProjectList contains a list of Project
type ProjectList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitzero"`
	Items           []Project `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Project{}, &ProjectList{})
}
