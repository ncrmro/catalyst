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
	// +optional
	Sources []EnvironmentSource `json:"sources,omitempty"`

	// Config overrides
	Config EnvironmentConfig `json:"config,omitempty"`
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

// EnvironmentConfig uses a curated subset of Kubernetes-native types.
//
// Design paradigm (FR-ENV-026): Fields mirror corev1.Container and corev1.PodSpec so that
// configuring an environment feels like writing a Deployment manifest. We use
// real K8s types (corev1.Probe, corev1.ResourceRequirements, etc.) instead of
// custom abstractions. See specs/001-environments/spec.md.
//
// Curated fields from corev1.Container:
//   image, command, args, workingDir, ports, env, resources,
//   livenessProbe, readinessProbe, startupProbe, volumeMounts
//
// NOT included (irrelevant for environment config):
//   lifecycle, securityContext, stdin, tty, terminationMessagePath, etc.
type EnvironmentConfig struct {
	// --- Legacy fields (backward compatibility) ---

	// EnvVars to inject into the deployment (simple key-value pairs)
	// Deprecated: use Env[] for K8s-native environment variable support
	// +optional
	EnvVars []EnvVar `json:"envVars,omitempty"`

	// --- Curated corev1.Container fields (FR-ENV-026) ---

	// Image is the container image to deploy (e.g., "node:22-slim")
	// +optional
	Image string `json:"image,omitempty"`

	// Command is the entrypoint array (mirrors corev1.Container.Command)
	// Example: ["./node_modules/.bin/next", "dev", "--turbopack"]
	// +optional
	Command []string `json:"command,omitempty"`

	// Args are arguments to the command (mirrors corev1.Container.Args)
	// +optional
	Args []string `json:"args,omitempty"`

	// WorkingDir is the container's working directory (mirrors corev1.Container.WorkingDir)
	// Example: "/code/web"
	// +optional
	WorkingDir string `json:"workingDir,omitempty"`

	// Ports are the container ports to expose (mirrors corev1.Container.Ports)
	// +optional
	Ports []corev1.ContainerPort `json:"ports,omitempty"`

	// Env are environment variables using K8s-native EnvVar (supports valueFrom/secretKeyRef)
	// This supplements the simpler EnvVars field above for backwards compatibility.
	// +optional
	Env []corev1.EnvVar `json:"env,omitempty"`

	// Resources are CPU/memory requests and limits (mirrors corev1.Container.Resources)
	// +optional
	Resources *corev1.ResourceRequirements `json:"resources,omitempty"`

	// LivenessProbe (mirrors corev1.Container.LivenessProbe)
	// Example: httpGet: {path: "/api/health/liveness", port: 3000}
	// +optional
	LivenessProbe *corev1.Probe `json:"livenessProbe,omitempty"`

	// ReadinessProbe (mirrors corev1.Container.ReadinessProbe)
	// Example: httpGet: {path: "/api/health/readiness", port: 3000}
	// +optional
	ReadinessProbe *corev1.Probe `json:"readinessProbe,omitempty"`

	// StartupProbe (mirrors corev1.Container.StartupProbe)
	// +optional
	StartupProbe *corev1.Probe `json:"startupProbe,omitempty"`

	// VolumeMounts for the main container (mirrors corev1.Container.VolumeMounts)
	// +optional
	VolumeMounts []corev1.VolumeMount `json:"volumeMounts,omitempty"`

	// --- Init containers (FR-ENV-031) ---

	// InitContainers are run before the main container, using the same curated subset.
	// Each entry creates a Kubernetes init container on the Deployment.
	// Example: npm install, database migrations
	// +optional
	InitContainers []InitContainerSpec `json:"initContainers,omitempty"`

	// --- Managed services (FR-ENV-028) ---

	// Services are named service entries, each creating a separate StatefulSet.
	// Example: postgres, redis, opensearch
	// +optional
	Services []ManagedServiceSpec `json:"services,omitempty"`

	// --- Volumes (FR-ENV-032) ---

	// Volumes defines PVCs and other volumes for the environment namespace.
	// +optional
	Volumes []VolumeSpec `json:"volumes,omitempty"`
}

// InitContainerSpec is a curated subset of corev1.Container for init containers.
// Same design paradigm: mirrors K8s-native fields (FR-ENV-031).
type InitContainerSpec struct {
	// Name of the init container
	Name string `json:"name"`

	// Image for the init container
	// +optional
	Image string `json:"image,omitempty"`

	// Command is the entrypoint array
	// +optional
	Command []string `json:"command,omitempty"`

	// Args are arguments to the command
	// +optional
	Args []string `json:"args,omitempty"`

	// WorkingDir is the container's working directory
	// +optional
	WorkingDir string `json:"workingDir,omitempty"`

	// Env are environment variables
	// +optional
	Env []corev1.EnvVar `json:"env,omitempty"`

	// Resources are CPU/memory requests and limits
	// +optional
	Resources *corev1.ResourceRequirements `json:"resources,omitempty"`

	// VolumeMounts for the init container
	// +optional
	VolumeMounts []corev1.VolumeMount `json:"volumeMounts,omitempty"`
}

// ManagedServiceSpec defines a named service entry that maps to a StatefulSet.
// Models services like PostgreSQL, Redis — each gets its own StatefulSet + Service (FR-ENV-028).
type ManagedServiceSpec struct {
	// Name identifies this service (e.g., "postgres", "redis")
	Name string `json:"name"`

	// Container spec for the service (curated subset: image, env, ports, resources)
	Container ManagedServiceContainer `json:"container"`

	// Storage defines the PVC template for the StatefulSet (mirrors StatefulSet volumeClaimTemplates)
	// +optional
	Storage *corev1.PersistentVolumeClaimSpec `json:"storage,omitempty"`

	// Database name to create (postgres-only convenience field)
	// +optional
	Database string `json:"database,omitempty"`
}

// ManagedServiceContainer is a curated subset of corev1.Container for service pods.
type ManagedServiceContainer struct {
	// Image for the service (e.g., "postgres:16")
	Image string `json:"image"`

	// Ports to expose
	// +optional
	Ports []corev1.ContainerPort `json:"ports,omitempty"`

	// Env are environment variables
	// +optional
	Env []corev1.EnvVar `json:"env,omitempty"`

	// Resources are CPU/memory requests and limits
	// +optional
	Resources *corev1.ResourceRequirements `json:"resources,omitempty"`
}

// VolumeSpec defines a PVC to create in the environment namespace (FR-ENV-032).
type VolumeSpec struct {
	// Name of the volume (used in volumeMounts)
	Name string `json:"name"`

	// PersistentVolumeClaim spec (mirrors corev1.PersistentVolumeClaimSpec)
	// +optional
	PersistentVolumeClaim *corev1.PersistentVolumeClaimSpec `json:"persistentVolumeClaim,omitempty"`
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
