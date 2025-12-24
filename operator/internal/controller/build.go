package controller

import (
	"fmt"
	"strings"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

// Spec: operator/spec.md
// Goal: Create a workspace pod for the environment that can be used for building,
// running commands, and debugging via exec from the UI.

const (
	registryHost   = "registry.cluster.local:5000"
	workspaceImage = "alpine:latest"
	defaultNixImage = "nixos/nix:latest"
)

func workspacePodName(env *catalystv1alpha1.Environment) string {
	commitPart := env.Spec.Source.CommitSha
	if len(commitPart) > 7 {
		commitPart = commitPart[:7]
	}
	return fmt.Sprintf("workspace-%s-%s", env.Spec.ProjectRef.Name, strings.ToLower(commitPart))
}

func desiredWorkspacePod(env *catalystv1alpha1.Environment, project *catalystv1alpha1.Project, namespace string) *corev1.Pod {
	podName := workspacePodName(env)

	// Determine image
	image := workspaceImage
	if env.Spec.DevContainer != nil {
		if env.Spec.DevContainer.Image != "" {
			image = env.Spec.DevContainer.Image
		} else if env.Spec.DevContainer.Type == "nix" {
			image = defaultNixImage
		}
	} else if project.Spec.Build != nil && project.Spec.Build.Type == "nix" {
		image = defaultNixImage
	}

	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      podName,
			Namespace: namespace,
			Labels: map[string]string{
				"catalyst.dev/pod-type":    "workspace",
				"catalyst.dev/commit":      env.Spec.Source.CommitSha,
				"catalyst.dev/project":     env.Spec.ProjectRef.Name,
				"catalyst.dev/environment": env.Name,
			},
		},
		Spec: corev1.PodSpec{
			RestartPolicy: corev1.RestartPolicyAlways,
			InitContainers: []corev1.Container{
				{
					Name:  "git-clone",
					Image: "alpine/git",
					Command: []string{"/bin/sh", "-c"},
					Args: []string{
						fmt.Sprintf("git clone %s /workspace && cd /workspace && git checkout %s",
							project.Spec.Source.RepositoryURL,
							env.Spec.Source.CommitSha,
						),
					},
					VolumeMounts: []corev1.VolumeMount{
						{
							Name:      "workspace",
							MountPath: "/workspace",
						},
					},
				},
			},
			Containers: []corev1.Container{
				{
					Name:       "workspace",
					Image:      image,
					WorkingDir: "/workspace",
					Command:    []string{"sleep", "infinity"},
					Resources: corev1.ResourceRequirements{
						Requests: corev1.ResourceList{
							corev1.ResourceCPU:    resource.MustParse("100m"),
							corev1.ResourceMemory: resource.MustParse("128Mi"),
						},
						Limits: corev1.ResourceList{
							corev1.ResourceCPU:    resource.MustParse("500m"),
							corev1.ResourceMemory: resource.MustParse("512Mi"),
						},
					},
					VolumeMounts: []corev1.VolumeMount{
						{
							Name:      "workspace",
							MountPath: "/workspace",
						},
					},
				},
			},
			Volumes: []corev1.Volume{
				{
					Name: "workspace",
					VolumeSource: corev1.VolumeSource{
						EmptyDir: &corev1.EmptyDirVolumeSource{},
					},
				},
			},
		},
	}

	// Add Docker-in-Docker support if enabled
	if env.Spec.Features != nil && env.Spec.Features.DockerEnabled {
		// Add dind-certs volume
		pod.Spec.Volumes = append(pod.Spec.Volumes, corev1.Volume{
			Name: "dind-certs",
			VolumeSource: corev1.VolumeSource{
				EmptyDir: &corev1.EmptyDirVolumeSource{},
			},
		})

		// Add dind sidecar
		pod.Spec.Containers = append(pod.Spec.Containers, corev1.Container{
			Name:  "dind",
			Image: "docker:dind",
			SecurityContext: &corev1.SecurityContext{
				Privileged: func(b bool) *bool { return &b }(true),
			},
			Env: []corev1.EnvVar{
				{Name: "DOCKER_TLS_CERTDIR", Value: "/certs"},
			},
			VolumeMounts: []corev1.VolumeMount{
				{Name: "dind-certs", MountPath: "/certs"},
				{Name: "workspace", MountPath: "/workspace"}, // Share workspace so docker can build files
			},
		})

		        // Configure probes
			if env.Spec.DevContainer != nil {
				if env.Spec.DevContainer.LivenessProbe != nil {
					pod.Spec.Containers[0].LivenessProbe = corev1ProbeFromCustomProbe(env.Spec.DevContainer.LivenessProbe)
				}
				if env.Spec.DevContainer.ReadinessProbe != nil {
					pod.Spec.Containers[0].ReadinessProbe = corev1ProbeFromCustomProbe(env.Spec.DevContainer.ReadinessProbe)
				}
			}
		
			// Add Docker-in-Docker support if enabled
			if env.Spec.Features != nil && env.Spec.Features.DockerEnabled {
				// Add dind-certs volume
				pod.Spec.Volumes = append(pod.Spec.Volumes, corev1.Volume{
					Name: "dind-certs",
					VolumeSource: corev1.VolumeSource{
						EmptyDir: &corev1.EmptyDirVolumeSource{},
					},
				})
		
				// Add dind sidecar
				pod.Spec.Containers = append(pod.Spec.Containers, corev1.Container{
					Name:  "dind",
					Image: "docker:dind",
					SecurityContext: &corev1.SecurityContext{
						Privileged: func(b bool) *bool { return &b }(true),
					},
					Env: []corev1.EnvVar{
						{Name: "DOCKER_TLS_CERTDIR", Value: "/certs"},
					},
					VolumeMounts: []corev1.VolumeMount{
						{Name: "dind-certs", MountPath: "/certs"},
						{Name: "workspace", MountPath: "/workspace"}, // Share workspace so docker can build files
					},
				})
		
				// Configure workspace container to use dind
				pod.Spec.Containers[0].Env = append(podv.Spec.Containers[0].Env,
					corev1.EnvVar{Name: "DOCKER_HOST", Value: "tcp://localhost:2376"},
					corev1.EnvVar{Name: "DOCKER_TLS_VERIFY", Value: "1"},
					corev1.EnvVar{Name: "DOCKER_CERT_PATH", Value: "/certs/client"},
				)
				pod.Spec.Containers[0].VolumeMounts = append(pod.Spec.Containers[0].VolumeMounts,
					corev1.VolumeMount{Name: "dind-certs", MountPath: "/certs/client", ReadOnly: true},
				)
			}
		
			return pod
		}
		
		// Helper function to convert our custom Probe to corev1.Probe
		func corev1ProbeFromCustomProbe(p *catalystv1alpha1.Probe) *corev1.Probe {
			if p == nil {
				return nil
			}
			return &corev1.Probe{
				ProbeHandler: corev1.ProbeHandler{
					Exec:      p.Exec,
					HTTPGet:   p.HTTPGet,
					TCPSocket: p.TCPSocket,
				},
				InitialDelaySeconds: p.InitialDelaySeconds,
				TimeoutSeconds:      p.TimeoutSeconds,
				PeriodSeconds:       p.PeriodSeconds,
				SuccessThreshold:    p.SuccessThreshold,
				FailureThreshold:    p.FailureThreshold,
			}
		}
