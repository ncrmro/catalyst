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
	"k8s.io/apimachinery/pkg/runtime"
)

// ProjectSpec defines the desired state of Project
// Spec referenced from operator/spec.md
type ProjectSpec struct {
	// Sources configuration for the project (supports multiple repos)
	Sources []SourceConfig `json:"sources"`

	// Templates for different environment types (e.g., "development", "production")
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
	// If empty, assumes the first source or a primary source.
	// +optional
	SourceRef string `json:"sourceRef,omitempty"`

	// Type of deployment (helm, manifest, kustomize)
	Type string `json:"type"`

	// Path to the deployment definition (e.g. chart path)
	// +optional
	Path string `json:"path,omitempty"`

	// Values are the default values to inject
	// +kubebuilder:pruning:PreserveUnknownFields
	// +optional
	Values runtime.RawExtension `json:"values,omitempty"`
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
