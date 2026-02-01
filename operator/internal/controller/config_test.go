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
	"testing"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/util/intstr"

	catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

func TestResolveConfig_EmptyInputs(t *testing.T) {
	result := resolveConfig(nil, nil)

	if result.Image != "" {
		t.Errorf("expected empty Image, got %q", result.Image)
	}
	if len(result.Command) != 0 {
		t.Errorf("expected empty Command, got %v", result.Command)
	}
}

func TestResolveConfig_OnlyTemplateConfig(t *testing.T) {
	tmpl := &catalystv1alpha1.EnvironmentConfig{
		Image:      "node:22-slim",
		Command:    []string{"npm", "start"},
		WorkingDir: "/app",
		Ports: []corev1.ContainerPort{
			{ContainerPort: 3000},
		},
	}

	result := resolveConfig(nil, tmpl)

	if result.Image != "node:22-slim" {
		t.Errorf("expected Image node:22-slim, got %q", result.Image)
	}
	if len(result.Command) != 2 || result.Command[0] != "npm" {
		t.Errorf("expected Command [npm start], got %v", result.Command)
	}
	if result.WorkingDir != "/app" {
		t.Errorf("expected WorkingDir /app, got %q", result.WorkingDir)
	}
	if len(result.Ports) != 1 || result.Ports[0].ContainerPort != 3000 {
		t.Errorf("expected Ports [3000], got %v", result.Ports)
	}
}

func TestResolveConfig_EnvironmentOverridesTemplate(t *testing.T) {
	tmpl := &catalystv1alpha1.EnvironmentConfig{
		Image:      "node:22-slim",
		Command:    []string{"npm", "start"},
		WorkingDir: "/app",
	}

	env := &catalystv1alpha1.EnvironmentConfig{
		Image:   "node:20-alpine",
		Command: []string{"node", "server.js"},
	}

	result := resolveConfig(env, tmpl)

	if result.Image != "node:20-alpine" {
		t.Errorf("expected Image node:20-alpine (env override), got %q", result.Image)
	}
	if len(result.Command) != 2 || result.Command[0] != "node" {
		t.Errorf("expected Command [node server.js] (env override), got %v", result.Command)
	}
	// WorkingDir should remain from template since env didn't override
	if result.WorkingDir != "/app" {
		t.Errorf("expected WorkingDir /app (from template), got %q", result.WorkingDir)
	}
}

func TestResolveConfig_ResourcesOverride(t *testing.T) {
	tmpl := &catalystv1alpha1.EnvironmentConfig{
		Resources: &corev1.ResourceRequirements{
			Requests: corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("100m"),
				corev1.ResourceMemory: resource.MustParse("256Mi"),
			},
		},
	}

	env := &catalystv1alpha1.EnvironmentConfig{
		Resources: &corev1.ResourceRequirements{
			Requests: corev1.ResourceList{
				corev1.ResourceCPU:    resource.MustParse("500m"),
				corev1.ResourceMemory: resource.MustParse("1Gi"),
			},
		},
	}

	result := resolveConfig(env, tmpl)

	if result.Resources == nil {
		t.Fatal("expected Resources to be set")
	}
	cpu := result.Resources.Requests[corev1.ResourceCPU]
	if cpu.String() != "500m" {
		t.Errorf("expected CPU 500m (env override), got %s", cpu.String())
	}
	mem := result.Resources.Requests[corev1.ResourceMemory]
	if mem.String() != "1Gi" {
		t.Errorf("expected Memory 1Gi (env override), got %s", mem.String())
	}
}

func TestResolveConfig_ProbesOverride(t *testing.T) {
	tmpl := &catalystv1alpha1.EnvironmentConfig{
		LivenessProbe: &corev1.Probe{
			ProbeHandler: corev1.ProbeHandler{
				HTTPGet: &corev1.HTTPGetAction{
					Path: "/health",
					Port: intstr.FromInt(8080),
				},
			},
		},
	}

	env := &catalystv1alpha1.EnvironmentConfig{
		LivenessProbe: &corev1.Probe{
			ProbeHandler: corev1.ProbeHandler{
				HTTPGet: &corev1.HTTPGetAction{
					Path: "/api/health/liveness",
					Port: intstr.FromInt(3000),
				},
			},
		},
	}

	result := resolveConfig(env, tmpl)

	if result.LivenessProbe == nil {
		t.Fatal("expected LivenessProbe to be set")
	}
	if result.LivenessProbe.HTTPGet.Path != "/api/health/liveness" {
		t.Errorf("expected liveness path /api/health/liveness (env override), got %s", result.LivenessProbe.HTTPGet.Path)
	}
	if result.LivenessProbe.HTTPGet.Port.IntValue() != 3000 {
		t.Errorf("expected liveness port 3000 (env override), got %d", result.LivenessProbe.HTTPGet.Port.IntValue())
	}
}

func TestResolveConfig_EnvVarsAppend(t *testing.T) {
	tmpl := &catalystv1alpha1.EnvironmentConfig{
		Env: []corev1.EnvVar{
			{Name: "NODE_ENV", Value: "production"},
		},
	}

	env := &catalystv1alpha1.EnvironmentConfig{
		Env: []corev1.EnvVar{
			{Name: "PORT", Value: "3000"},
		},
	}

	result := resolveConfig(env, tmpl)

	// Env vars should be appended (template + environment)
	if len(result.Env) != 2 {
		t.Errorf("expected 2 env vars (template + env), got %d", len(result.Env))
	}
	if result.Env[0].Name != "NODE_ENV" || result.Env[0].Value != "production" {
		t.Errorf("expected first env var NODE_ENV=production, got %s=%s", result.Env[0].Name, result.Env[0].Value)
	}
	if result.Env[1].Name != "PORT" || result.Env[1].Value != "3000" {
		t.Errorf("expected second env var PORT=3000, got %s=%s", result.Env[1].Name, result.Env[1].Value)
	}
}

func TestResolveConfig_InitContainers(t *testing.T) {
	tmpl := &catalystv1alpha1.EnvironmentConfig{
		InitContainers: []catalystv1alpha1.InitContainerSpec{
			{
				Name:    "git-clone",
				Image:   "alpine/git:latest",
				Command: []string{"git", "clone"},
			},
		},
	}

	env := &catalystv1alpha1.EnvironmentConfig{
		InitContainers: []catalystv1alpha1.InitContainerSpec{
			{
				Name:    "npm-install",
				Image:   "node:22-slim",
				Command: []string{"npm", "ci"},
			},
		},
	}

	result := resolveConfig(env, tmpl)

	// Init containers should be replaced (not appended)
	if len(result.InitContainers) != 1 {
		t.Errorf("expected 1 init container (env override), got %d", len(result.InitContainers))
	}
	if result.InitContainers[0].Name != "npm-install" {
		t.Errorf("expected init container name npm-install, got %s", result.InitContainers[0].Name)
	}
}

func TestResolveConfig_Services(t *testing.T) {
	tmpl := &catalystv1alpha1.EnvironmentConfig{
		Services: []catalystv1alpha1.ManagedServiceSpec{
			{
				Name: "postgres",
				Container: catalystv1alpha1.ManagedServiceContainer{
					Image: "postgres:16",
				},
			},
		},
	}

	env := &catalystv1alpha1.EnvironmentConfig{
		Services: []catalystv1alpha1.ManagedServiceSpec{
			{
				Name: "redis",
				Container: catalystv1alpha1.ManagedServiceContainer{
					Image: "redis:7",
				},
			},
		},
	}

	result := resolveConfig(env, tmpl)

	// Services should be replaced (not appended)
	if len(result.Services) != 1 {
		t.Errorf("expected 1 service (env override), got %d", len(result.Services))
	}
	if result.Services[0].Name != "redis" {
		t.Errorf("expected service name redis, got %s", result.Services[0].Name)
	}
}

func TestResolveConfig_Volumes(t *testing.T) {
	tmpl := &catalystv1alpha1.EnvironmentConfig{
		Volumes: []catalystv1alpha1.VolumeSpec{
			{
				Name: "code",
				PersistentVolumeClaim: &corev1.PersistentVolumeClaimSpec{
					Resources: corev1.VolumeResourceRequirements{
						Requests: corev1.ResourceList{
							corev1.ResourceStorage: resource.MustParse("5Gi"),
						},
					},
				},
			},
		},
	}

	env := &catalystv1alpha1.EnvironmentConfig{
		Volumes: []catalystv1alpha1.VolumeSpec{
			{
				Name: "data",
				PersistentVolumeClaim: &corev1.PersistentVolumeClaimSpec{
					Resources: corev1.VolumeResourceRequirements{
						Requests: corev1.ResourceList{
							corev1.ResourceStorage: resource.MustParse("10Gi"),
						},
					},
				},
			},
		},
	}

	result := resolveConfig(env, tmpl)

	// Volumes should be replaced (not appended)
	if len(result.Volumes) != 1 {
		t.Errorf("expected 1 volume (env override), got %d", len(result.Volumes))
	}
	if result.Volumes[0].Name != "data" {
		t.Errorf("expected volume name data, got %s", result.Volumes[0].Name)
	}
}

// Test deep copy to ensure we don't mutate the original template
func TestResolveConfig_DeepCopyNoMutation(t *testing.T) {
	tmpl := &catalystv1alpha1.EnvironmentConfig{
		Image:   "node:22-slim",
		Command: []string{"npm", "start"},
		Env: []corev1.EnvVar{
			{Name: "NODE_ENV", Value: "production"},
		},
	}

	originalImage := tmpl.Image
	originalCommand := make([]string, len(tmpl.Command))
	copy(originalCommand, tmpl.Command)
	originalEnvLen := len(tmpl.Env)

	env := &catalystv1alpha1.EnvironmentConfig{
		Image:   "node:20-alpine",
		Command: []string{"node", "server.js"},
	}

	_ = resolveConfig(env, tmpl)

	// Original template should not be mutated
	if tmpl.Image != originalImage {
		t.Errorf("template Image was mutated: expected %q, got %q", originalImage, tmpl.Image)
	}
	if len(tmpl.Command) != len(originalCommand) || tmpl.Command[0] != originalCommand[0] {
		t.Errorf("template Command was mutated: expected %v, got %v", originalCommand, tmpl.Command)
	}
	if len(tmpl.Env) != originalEnvLen {
		t.Errorf("template Env was mutated: expected length %d, got %d", originalEnvLen, len(tmpl.Env))
	}
}
