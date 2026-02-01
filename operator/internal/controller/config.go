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
	corev1 "k8s.io/api/core/v1"
	catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

// resolveConfig merges environment config over project template defaults.
// Non-zero/non-nil environment values override template values.
// Uses K8s-native types throughout (see FR-ENV-026 design paradigm).
//
// Merge chain:
// 1. Project template Config (defaults for environment type)
// 2. Environment CR Config (overrides)
//
// Returns the merged config. If both are empty, returns an empty config
// (operator must handle this case with warnings or errors).
func resolveConfig(envConfig *catalystv1alpha1.EnvironmentConfig, tmplConfig *catalystv1alpha1.EnvironmentConfig) catalystv1alpha1.EnvironmentConfig {
	result := catalystv1alpha1.EnvironmentConfig{}

	// Start with template defaults if provided
	if tmplConfig != nil {
		result = *deepCopyConfig(tmplConfig)
	}

	// If no environment-specific config, return template defaults
	if envConfig == nil {
		return result
	}

	// Override with environment-specific values (non-zero/non-nil only)

	// Legacy fields
	if len(envConfig.EnvVars) > 0 {
		result.EnvVars = envConfig.EnvVars
	}

	// Container fields
	if envConfig.Image != "" {
		result.Image = envConfig.Image
	}
	if len(envConfig.Command) > 0 {
		result.Command = envConfig.Command
	}
	if len(envConfig.Args) > 0 {
		result.Args = envConfig.Args
	}
	if envConfig.WorkingDir != "" {
		result.WorkingDir = envConfig.WorkingDir
	}
	if len(envConfig.Ports) > 0 {
		result.Ports = envConfig.Ports
	}
	if len(envConfig.Env) > 0 {
		// Append environment-specific env vars to template env vars
		result.Env = append(result.Env, envConfig.Env...)
	}
	if envConfig.Resources != nil {
		result.Resources = envConfig.Resources
	}

	// Probes
	if envConfig.LivenessProbe != nil {
		result.LivenessProbe = envConfig.LivenessProbe
	}
	if envConfig.ReadinessProbe != nil {
		result.ReadinessProbe = envConfig.ReadinessProbe
	}
	if envConfig.StartupProbe != nil {
		result.StartupProbe = envConfig.StartupProbe
	}

	// Volume mounts
	if len(envConfig.VolumeMounts) > 0 {
		result.VolumeMounts = envConfig.VolumeMounts
	}

	// Init containers
	if len(envConfig.InitContainers) > 0 {
		result.InitContainers = envConfig.InitContainers
	}

	// Services
	if len(envConfig.Services) > 0 {
		result.Services = envConfig.Services
	}

	// Volumes
	if len(envConfig.Volumes) > 0 {
		result.Volumes = envConfig.Volumes
	}

	return result
}

// deepCopyConfig creates a deep copy of EnvironmentConfig.
// This is necessary because Go struct assignment does shallow copies,
// and we need independent copies to avoid modifying the original template.
func deepCopyConfig(cfg *catalystv1alpha1.EnvironmentConfig) *catalystv1alpha1.EnvironmentConfig {
	if cfg == nil {
		return nil
	}

	result := &catalystv1alpha1.EnvironmentConfig{
		Image:      cfg.Image,
		Command:    copyStrings(cfg.Command),
		Args:       copyStrings(cfg.Args),
		WorkingDir: cfg.WorkingDir,
	}

	// Copy EnvVars (legacy)
	if len(cfg.EnvVars) > 0 {
		result.EnvVars = make([]catalystv1alpha1.EnvVar, len(cfg.EnvVars))
		copy(result.EnvVars, cfg.EnvVars)
	}

	// Copy Ports
	if len(cfg.Ports) > 0 {
		result.Ports = make([]corev1.ContainerPort, len(cfg.Ports))
		copy(result.Ports, cfg.Ports)
	}

	// Copy Env (K8s-native)
	if len(cfg.Env) > 0 {
		result.Env = make([]corev1.EnvVar, len(cfg.Env))
		copy(result.Env, cfg.Env)
	}

	// Copy Resources (pointer)
	if cfg.Resources != nil {
		result.Resources = cfg.Resources.DeepCopy()
	}

	// Copy Probes (pointers)
	if cfg.LivenessProbe != nil {
		result.LivenessProbe = cfg.LivenessProbe.DeepCopy()
	}
	if cfg.ReadinessProbe != nil {
		result.ReadinessProbe = cfg.ReadinessProbe.DeepCopy()
	}
	if cfg.StartupProbe != nil {
		result.StartupProbe = cfg.StartupProbe.DeepCopy()
	}

	// Copy VolumeMounts
	if len(cfg.VolumeMounts) > 0 {
		result.VolumeMounts = make([]corev1.VolumeMount, len(cfg.VolumeMounts))
		copy(result.VolumeMounts, cfg.VolumeMounts)
	}

	// Copy InitContainers
	if len(cfg.InitContainers) > 0 {
		result.InitContainers = make([]catalystv1alpha1.InitContainerSpec, len(cfg.InitContainers))
		for i, ic := range cfg.InitContainers {
			result.InitContainers[i] = catalystv1alpha1.InitContainerSpec{
				Name:       ic.Name,
				Image:      ic.Image,
				Command:    copyStrings(ic.Command),
				Args:       copyStrings(ic.Args),
				WorkingDir: ic.WorkingDir,
			}
			if len(ic.Env) > 0 {
				result.InitContainers[i].Env = make([]corev1.EnvVar, len(ic.Env))
				copy(result.InitContainers[i].Env, ic.Env)
			}
			if ic.Resources != nil {
				result.InitContainers[i].Resources = ic.Resources.DeepCopy()
			}
			if len(ic.VolumeMounts) > 0 {
				result.InitContainers[i].VolumeMounts = make([]corev1.VolumeMount, len(ic.VolumeMounts))
				copy(result.InitContainers[i].VolumeMounts, ic.VolumeMounts)
			}
		}
	}

	// Copy Services
	if len(cfg.Services) > 0 {
		result.Services = make([]catalystv1alpha1.ManagedServiceSpec, len(cfg.Services))
		for i, svc := range cfg.Services {
			result.Services[i] = catalystv1alpha1.ManagedServiceSpec{
				Name:     svc.Name,
				Database: svc.Database,
				Container: catalystv1alpha1.ManagedServiceContainer{
					Image: svc.Container.Image,
				},
			}
			if len(svc.Container.Ports) > 0 {
				result.Services[i].Container.Ports = make([]corev1.ContainerPort, len(svc.Container.Ports))
				copy(result.Services[i].Container.Ports, svc.Container.Ports)
			}
			if len(svc.Container.Env) > 0 {
				result.Services[i].Container.Env = make([]corev1.EnvVar, len(svc.Container.Env))
				copy(result.Services[i].Container.Env, svc.Container.Env)
			}
			if svc.Container.Resources != nil {
				result.Services[i].Container.Resources = svc.Container.Resources.DeepCopy()
			}
			if svc.Storage != nil {
				result.Services[i].Storage = svc.Storage.DeepCopy()
			}
		}
	}

	// Copy Volumes
	if len(cfg.Volumes) > 0 {
		result.Volumes = make([]catalystv1alpha1.VolumeSpec, len(cfg.Volumes))
		for i, vol := range cfg.Volumes {
			result.Volumes[i] = catalystv1alpha1.VolumeSpec{
				Name: vol.Name,
			}
			if vol.PersistentVolumeClaim != nil {
				result.Volumes[i].PersistentVolumeClaim = vol.PersistentVolumeClaim.DeepCopy()
			}
		}
	}

	return result
}

// copyStrings creates a copy of a string slice
func copyStrings(s []string) []string {
	if s == nil {
		return nil
	}
	result := make([]string, len(s))
	copy(result, s)
	return result
}
