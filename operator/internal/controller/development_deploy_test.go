package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

func TestDesiredCodePVC(t *testing.T) {
	namespace := "test-namespace"
	pvc := desiredCodePVC(namespace)

	// Verify metadata
	assert.Equal(t, "web-code", pvc.Name)
	assert.Equal(t, namespace, pvc.Namespace)

	// Verify access mode
	assert.Contains(t, pvc.Spec.AccessModes, corev1.ReadWriteOnce)

	// Verify storage size
	expectedStorage := resource.MustParse("5Gi")
	actualStorage := pvc.Spec.Resources.Requests[corev1.ResourceStorage]
	assert.Equal(t, expectedStorage.Value(), actualStorage.Value())
}

func TestDesiredDevelopmentDeployment_WithGitClone(t *testing.T) {
	// Setup test environment
	env := &catalystv1alpha1.Environment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-env",
			Namespace: "default",
		},
		Spec: catalystv1alpha1.EnvironmentSpec{
			ProjectRef: catalystv1alpha1.ProjectReference{Name: "my-project"},
			Type:       "development",
			Sources: []catalystv1alpha1.EnvironmentSource{
				{
					Name:      "main",
					CommitSha: "abc1234567890",
					Branch:    "main",
				},
			},
		},
	}

	project := &catalystv1alpha1.Project{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "my-project",
			Namespace: "default",
		},
		Spec: catalystv1alpha1.ProjectSpec{
			GitHubInstallationId: "12345",
			Sources: []catalystv1alpha1.SourceConfig{
				{
					Name:          "main",
					RepositoryURL: "https://github.com/test/repo.git",
					Branch:        "main",
				},
			},
		},
	}

	namespace := "test-namespace"
	deployment := desiredDevelopmentDeployment(env, project, namespace)

	// Verify deployment metadata
	assert.Equal(t, "web", deployment.Name)
	assert.Equal(t, namespace, deployment.Namespace)

	// Verify that we have git-clone init container
	assert.GreaterOrEqual(t, len(deployment.Spec.Template.Spec.InitContainers), 3,
		"Should have at least git-clone, npm-install, and db-migrate init containers")

	// Find git-clone init container
	var gitCloneContainer *corev1.Container
	for i := range deployment.Spec.Template.Spec.InitContainers {
		if deployment.Spec.Template.Spec.InitContainers[i].Name == "git-clone" {
			gitCloneContainer = &deployment.Spec.Template.Spec.InitContainers[i]
			break
		}
	}
	assert.NotNil(t, gitCloneContainer, "Should have git-clone init container")

	// Verify git-clone container configuration
	assert.Equal(t, gitCloneImageDev, gitCloneContainer.Image)
	assert.Equal(t, []string{"/scripts/git-clone.sh"}, gitCloneContainer.Command)

	// Verify git-clone environment variables
	envMap := make(map[string]string)
	for _, e := range gitCloneContainer.Env {
		envMap[e.Name] = e.Value
	}
	assert.Equal(t, "12345", envMap["INSTALLATION_ID"])
	assert.Equal(t, "https://github.com/test/repo.git", envMap["GIT_REPO_URL"])
	assert.Equal(t, "abc1234567890", envMap["GIT_COMMIT"])
	assert.Equal(t, "/code", envMap["GIT_CLONE_ROOT"])
	assert.Equal(t, ".", envMap["GIT_CLONE_DEST"])

	// Verify volumes - should have code PVC, not hostPath
	var codeVolume *corev1.Volume
	for i := range deployment.Spec.Template.Spec.Volumes {
		if deployment.Spec.Template.Spec.Volumes[i].Name == "code" {
			codeVolume = &deployment.Spec.Template.Spec.Volumes[i]
			break
		}
	}
	assert.NotNil(t, codeVolume, "Should have code volume")
	assert.NotNil(t, codeVolume.PersistentVolumeClaim, "Code volume should use PVC")
	assert.Nil(t, codeVolume.HostPath, "Code volume should not use hostPath")
	assert.Equal(t, "web-code", codeVolume.PersistentVolumeClaim.ClaimName)

	// Verify git scripts volume exists
	var scriptsVolume *corev1.Volume
	for i := range deployment.Spec.Template.Spec.Volumes {
		if deployment.Spec.Template.Spec.Volumes[i].Name == gitScriptsVolumeName {
			scriptsVolume = &deployment.Spec.Template.Spec.Volumes[i]
			break
		}
	}
	assert.NotNil(t, scriptsVolume, "Should have git scripts volume")
	assert.NotNil(t, scriptsVolume.ConfigMap, "Scripts volume should use ConfigMap")
	assert.Equal(t, gitScriptsConfigMap, scriptsVolume.ConfigMap.Name)
}

func TestDesiredDevelopmentDeployment_WithoutSources(t *testing.T) {
	// Setup test environment without sources
	env := &catalystv1alpha1.Environment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-env",
			Namespace: "default",
		},
		Spec: catalystv1alpha1.EnvironmentSpec{
			ProjectRef: catalystv1alpha1.ProjectReference{Name: "my-project"},
			Type:       "development",
		},
	}

	project := &catalystv1alpha1.Project{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "my-project",
			Namespace: "default",
		},
		Spec: catalystv1alpha1.ProjectSpec{
			Sources: []catalystv1alpha1.SourceConfig{}, // No sources
		},
	}

	namespace := "test-namespace"
	deployment := desiredDevelopmentDeployment(env, project, namespace)

	// Verify deployment metadata
	assert.Equal(t, "web", deployment.Name)
	assert.Equal(t, namespace, deployment.Namespace)

	// Verify that we don't have git-clone init container when no sources
	var hasGitClone bool
	for _, container := range deployment.Spec.Template.Spec.InitContainers {
		if container.Name == "git-clone" {
			hasGitClone = true
			break
		}
	}
	assert.False(t, hasGitClone, "Should not have git-clone init container when no sources configured")

	// Verify code volume still uses PVC (not hostPath)
	var codeVolume *corev1.Volume
	for i := range deployment.Spec.Template.Spec.Volumes {
		if deployment.Spec.Template.Spec.Volumes[i].Name == "code" {
			codeVolume = &deployment.Spec.Template.Spec.Volumes[i]
			break
		}
	}
	assert.NotNil(t, codeVolume, "Should have code volume")
	assert.NotNil(t, codeVolume.PersistentVolumeClaim, "Code volume should use PVC")
	assert.Nil(t, codeVolume.HostPath, "Code volume should not use hostPath")
}
