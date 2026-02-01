package controller

import (
"testing"

"github.com/stretchr/testify/assert"
corev1 "k8s.io/api/core/v1"
"k8s.io/apimachinery/pkg/api/resource"
"k8s.io/apimachinery/pkg/util/intstr"

catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

func TestDesiredDevelopmentDeploymentFromConfig(t *testing.T) {
// Test deployment creation from resolved config
env := &catalystv1alpha1.Environment{
Spec: catalystv1alpha1.EnvironmentSpec{
ProjectRef: catalystv1alpha1.ProjectReference{Name: "test-project"},
},
}

project := &catalystv1alpha1.Project{}

config := &catalystv1alpha1.EnvironmentConfig{
Image:      "node:22-slim",
Command:    []string{"npm", "run", "dev"},
Args:       []string{"--turbopack"},
WorkingDir: "/code/web",
Ports: []corev1.ContainerPort{
{ContainerPort: 3000, Protocol: corev1.ProtocolTCP},
},
Env: []corev1.EnvVar{
{Name: "NODE_ENV", Value: "development"},
},
Resources: &corev1.ResourceRequirements{
Requests: corev1.ResourceList{
corev1.ResourceCPU:    resource.MustParse("100m"),
corev1.ResourceMemory: resource.MustParse("512Mi"),
},
Limits: corev1.ResourceList{
corev1.ResourceCPU:    resource.MustParse("2"),
corev1.ResourceMemory: resource.MustParse("2Gi"),
},
},
LivenessProbe: &corev1.Probe{
ProbeHandler: corev1.ProbeHandler{
HTTPGet: &corev1.HTTPGetAction{
Path: "/api/health/liveness",
Port: intstr.FromInt(3000),
},
},
},
}

namespace := "test-namespace"
deployment := desiredDevelopmentDeploymentFromConfig(env, project, namespace, config)

// Verify basic metadata
assert.Equal(t, "web", deployment.Name)
assert.Equal(t, namespace, deployment.Namespace)

// Verify container configuration
assert.Len(t, deployment.Spec.Template.Spec.Containers, 1)
container := deployment.Spec.Template.Spec.Containers[0]

assert.Equal(t, "web", container.Name)
assert.Equal(t, "node:22-slim", container.Image)
assert.Equal(t, []string{"npm", "run", "dev"}, container.Command)
assert.Equal(t, []string{"--turbopack"}, container.Args)
assert.Equal(t, "/code/web", container.WorkingDir)

// Verify ports
assert.Len(t, container.Ports, 1)
assert.Equal(t, int32(3000), container.Ports[0].ContainerPort)

// Verify environment variables
assert.Contains(t, container.Env, corev1.EnvVar{Name: "NODE_ENV", Value: "development"})

// Verify resources
assert.NotNil(t, container.Resources)
assert.Equal(t, "100m", container.Resources.Requests.Cpu().String())
assert.Equal(t, "512Mi", container.Resources.Requests.Memory().String())

// Verify probes
assert.NotNil(t, container.LivenessProbe)
assert.NotNil(t, container.LivenessProbe.HTTPGet)
assert.Equal(t, "/api/health/liveness", container.LivenessProbe.HTTPGet.Path)
}

func TestDesiredDevelopmentDeploymentFromConfig_WithInitContainers(t *testing.T) {
// Test that config init containers are included in deployment
env := &catalystv1alpha1.Environment{
Spec: catalystv1alpha1.EnvironmentSpec{
ProjectRef: catalystv1alpha1.ProjectReference{Name: "test-project"},
Sources: []catalystv1alpha1.EnvironmentSource{
{Name: "primary", CommitSha: "abc123", Branch: "main"},
},
},
}

project := &catalystv1alpha1.Project{
Spec: catalystv1alpha1.ProjectSpec{
Sources: []catalystv1alpha1.SourceConfig{
{Name: "primary", RepositoryURL: "https://github.com/test/repo", Branch: "main"},
},
},
}

config := &catalystv1alpha1.EnvironmentConfig{
Image: "node:22-slim",
Ports: []corev1.ContainerPort{{ContainerPort: 3000}},
InitContainers: []catalystv1alpha1.InitContainerSpec{
{
Name:    "npm-install",
Image:   "node:22-slim",
Command: []string{"npm", "ci"},
},
{
Name:    "db-migrate",
Image:   "node:22-slim",
Command: []string{"npm", "run", "db:migrate"},
},
},
}

namespace := "test-namespace"
deployment := desiredDevelopmentDeploymentFromConfig(env, project, namespace, config)

// Verify init containers exist
// Note: operator prepends git-clone, so we should have 3 total
assert.GreaterOrEqual(t, len(deployment.Spec.Template.Spec.InitContainers), 2)

// Find our init containers (git-clone might be prepended)
var npmInstall, dbMigrate *corev1.Container
for i := range deployment.Spec.Template.Spec.InitContainers {
container := &deployment.Spec.Template.Spec.InitContainers[i]
if container.Name == "npm-install" {
npmInstall = container
} else if container.Name == "db-migrate" {
dbMigrate = container
}
}

assert.NotNil(t, npmInstall, "npm-install init container should exist")
assert.NotNil(t, dbMigrate, "db-migrate init container should exist")

if npmInstall != nil {
assert.Equal(t, "node:22-slim", npmInstall.Image)
assert.Equal(t, []string{"npm", "ci"}, npmInstall.Command)
}
}

func TestDesiredManagedServiceStatefulSet(t *testing.T) {
// Test StatefulSet creation from service spec
namespace := "test-namespace"
serviceSpec := catalystv1alpha1.ManagedServiceSpec{
Name: "postgres",
Container: catalystv1alpha1.ManagedServiceContainer{
Image: "postgres:16",
Ports: []corev1.ContainerPort{
{ContainerPort: 5432, Protocol: corev1.ProtocolTCP},
},
Env: []corev1.EnvVar{
{Name: "POSTGRES_PASSWORD", Value: "postgres"},
{Name: "POSTGRES_USER", Value: "postgres"},
{Name: "POSTGRES_DB", Value: "catalyst"},
},
Resources: &corev1.ResourceRequirements{
Requests: corev1.ResourceList{
corev1.ResourceCPU:    resource.MustParse("100m"),
corev1.ResourceMemory: resource.MustParse("256Mi"),
},
},
},
Storage: &catalystv1alpha1.PersistentVolumeClaimSpec{
AccessModes: []corev1.PersistentVolumeAccessMode{corev1.ReadWriteOnce},
Resources: corev1.VolumeResourceRequirements{
Requests: corev1.ResourceList{
corev1.ResourceStorage: resource.MustParse("1Gi"),
},
},
},
}

statefulSet := desiredManagedServiceStatefulSet(namespace, serviceSpec)

// Verify metadata
assert.Equal(t, "postgres", statefulSet.Name)
assert.Equal(t, namespace, statefulSet.Namespace)

// Verify replica count
assert.Equal(t, int32(1), *statefulSet.Spec.Replicas)

// Verify container
assert.Len(t, statefulSet.Spec.Template.Spec.Containers, 1)
container := statefulSet.Spec.Template.Spec.Containers[0]

assert.Equal(t, "postgres", container.Name)
assert.Equal(t, "postgres:16", container.Image)
assert.Len(t, container.Ports, 1)
assert.Equal(t, int32(5432), container.Ports[0].ContainerPort)

// Verify environment variables
assert.Len(t, container.Env, 3)
assert.Contains(t, container.Env, corev1.EnvVar{Name: "POSTGRES_USER", Value: "postgres"})

// Verify resources
assert.NotNil(t, container.Resources)
assert.Equal(t, "100m", container.Resources.Requests.Cpu().String())

// Verify volume claim template
assert.Len(t, statefulSet.Spec.VolumeClaimTemplates, 1)
pvc := statefulSet.Spec.VolumeClaimTemplates[0]
assert.Equal(t, "data", pvc.Name)
assert.Equal(t, "1Gi", pvc.Spec.Resources.Requests.Storage().String())
}

func TestDesiredDevelopmentServiceFromConfig(t *testing.T) {
// Test service creation from config ports
config := &catalystv1alpha1.EnvironmentConfig{
Ports: []corev1.ContainerPort{
{ContainerPort: 3000, Protocol: corev1.ProtocolTCP},
{ContainerPort: 8080, Protocol: corev1.ProtocolTCP},
},
}

namespace := "test-namespace"
service := desiredDevelopmentServiceFromConfig(namespace, config)

// Verify metadata
assert.Equal(t, "web", service.Name)
assert.Equal(t, namespace, service.Namespace)

// Verify selector
assert.Equal(t, map[string]string{"app": "web"}, service.Spec.Selector)

// Verify ports (service should map to container ports)
assert.Len(t, service.Spec.Ports, 2)
assert.Equal(t, int32(80), service.Spec.Ports[0].Port)
assert.Equal(t, int32(3000), service.Spec.Ports[0].TargetPort.IntVal)
}
