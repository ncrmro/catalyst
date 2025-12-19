package controller

import (
	"fmt"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

// Spec: operator/spec.md
// Goal: Build a container image from source code using Kaniko.

const (
	registryHost = "registry.cluster.local:5000"
	kanikoImage  = "gcr.io/kaniko-project/executor:latest"
)

func buildJobName(env *catalystv1alpha1.Environment) string {
	return fmt.Sprintf("build-%s-%s", env.Spec.ProjectRef.Name, env.Spec.Source.CommitSha[:7])
}

func desiredBuildJob(env *catalystv1alpha1.Environment, namespace string) *batchv1.Job {
	imageTag := fmt.Sprintf("%s/%s:%s", registryHost, env.Spec.ProjectRef.Name, env.Spec.Source.CommitSha)
	jobName := buildJobName(env)

	// Context usually requires git clone. Kaniko can clone if given git:// URL and secrets.
	// For this MVP, assuming we pass the git repo URL from Project (which we need to fetch).
	// But Environment has Source info.

	// Ideally we need the Project CR to get the Repo URL.
	// Passing it as an argument here for now.
	repoURL := "TODO-FETCH-FROM-PROJECT"

	return &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      jobName,
			Namespace: namespace,
			Labels: map[string]string{
				"catalyst.dev/job-type": "build",
				"catalyst.dev/commit":   env.Spec.Source.CommitSha,
			},
		},
		Spec: batchv1.JobSpec{
			BackoffLimit: ptr(int32(3)),
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					RestartPolicy: corev1.RestartPolicyNever,
					Containers: []corev1.Container{
						{
							Name:  "kaniko",
							Image: kanikoImage,
							Args: []string{
								"--dockerfile=Dockerfile",
								"--context=" + repoURL, // Kaniko supports git://...#refs/heads/branch or commit
								"--destination=" + imageTag,
								"--cache=true",
							},
							VolumeMounts: []corev1.VolumeMount{
								// Mount secrets if needed
							},
						},
					},
				},
			},
		},
	}
}

// TODO: Implement ImageChecker interface to check if image exists in registry.
// For now, we will rely on checking if the Job succeeded.
