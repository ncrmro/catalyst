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
)

func workspacePodName(env *catalystv1alpha1.Environment) string {
	commitPart := env.Spec.Source.CommitSha
	if len(commitPart) > 7 {
		commitPart = commitPart[:7]
	}
	return fmt.Sprintf("workspace-%s-%s", env.Spec.ProjectRef.Name, strings.ToLower(commitPart))
}

func desiredWorkspacePod(env *catalystv1alpha1.Environment, namespace string) *corev1.Pod {
	podName := workspacePodName(env)

	return &corev1.Pod{
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
			Containers: []corev1.Container{
				{
					Name:    "workspace",
					Image:   workspaceImage,
					Command: []string{"sleep", "infinity"},
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
				},
			},
		},
	}
}
