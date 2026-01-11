package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

func TestDesiredIngress_LocalMode(t *testing.T) {
	// Create a test environment
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
					CommitSha: "abc1234",
					Branch:    "main",
				},
			},
		},
	}

	namespace := "my-project-test-env"
	isLocal := true

	ingress := desiredIngress(env, namespace, isLocal)

	// Verify basic metadata
	assert.Equal(t, "app", ingress.Name)
	assert.Equal(t, namespace, ingress.Namespace)
	assert.Equal(t, "nginx", *ingress.Spec.IngressClassName)

	// Verify no rewrite-target annotation in hostname-based mode
	assert.Empty(t, ingress.Annotations)

	// Verify no TLS configuration in local mode
	assert.Empty(t, ingress.Spec.TLS)

	// Verify hostname-based routing rules for local mode
	assert.Len(t, ingress.Spec.Rules, 1)
	rule := ingress.Spec.Rules[0]
	expectedHost := "my-project-test-env.localhost"
	assert.Equal(t, expectedHost, rule.Host) // Hostname-based routing

	assert.NotNil(t, rule.HTTP)
	assert.Len(t, rule.HTTP.Paths, 1)

	path := rule.HTTP.Paths[0]
	assert.Equal(t, "/", path.Path)
	assert.Equal(t, networkingv1.PathTypePrefix, *path.PathType)

	// Verify backend
	assert.Equal(t, "app", path.Backend.Service.Name)
	assert.Equal(t, int32(80), path.Backend.Service.Port.Number)
}

func TestDesiredIngress_ProductionMode(t *testing.T) {
	// Create a test environment with ingress configuration
	env := &catalystv1alpha1.Environment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-env",
			Namespace: "default",
		},
		Spec: catalystv1alpha1.EnvironmentSpec{
			ProjectRef: catalystv1alpha1.ProjectReference{Name: "my-project"},
			Type:       "deployment",
			Sources: []catalystv1alpha1.EnvironmentSource{
				{
					Name:      "main",
					CommitSha: "abc1234",
					Branch:    "main",
				},
			},
			Ingress: &catalystv1alpha1.IngressConfig{
				Enabled: true,
				TLS: &catalystv1alpha1.IngressTLSConfig{
					Enabled: true,
					Issuer:  "letsencrypt-prod",
				},
			},
		},
	}

	namespace := "my-project-test-env"
	isLocal := false

	ingress := desiredIngress(env, namespace, isLocal)

	// Verify basic metadata
	assert.Equal(t, "app", ingress.Name)
	assert.Equal(t, namespace, ingress.Namespace)
	assert.Equal(t, "nginx", *ingress.Spec.IngressClassName)

	// Verify cert-manager annotation for production
	assert.Equal(t, "letsencrypt-prod", ingress.Annotations["cert-manager.io/cluster-issuer"])
	assert.NotContains(t, ingress.Annotations, "nginx.ingress.kubernetes.io/rewrite-target")

	// Verify TLS configuration
	assert.Len(t, ingress.Spec.TLS, 1)
	tls := ingress.Spec.TLS[0]
	expectedHost := "test-env.preview.catalyst.dev"
	assert.Equal(t, []string{expectedHost}, tls.Hosts)
	assert.Equal(t, "test-env-tls", tls.SecretName)

	// Verify hostname-based routing rules
	assert.Len(t, ingress.Spec.Rules, 1)
	rule := ingress.Spec.Rules[0]
	assert.Equal(t, expectedHost, rule.Host)

	assert.NotNil(t, rule.HTTP)
	assert.Len(t, rule.HTTP.Paths, 1)

	path := rule.HTTP.Paths[0]
	assert.Equal(t, "/", path.Path)
	assert.Equal(t, networkingv1.PathTypePrefix, *path.PathType)

	// Verify backend
	assert.Equal(t, "app", path.Backend.Service.Name)
	assert.Equal(t, int32(80), path.Backend.Service.Port.Number)
}

func TestGenerateURL_LocalMode(t *testing.T) {
	env := &catalystv1alpha1.Environment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-env",
			Namespace: "default",
		},
	}

	namespace := "my-project-test-env"
	isLocal := true

	// Test with default port - now uses hostname-based routing
	url := generateURL(env, namespace, isLocal, "")
	assert.Equal(t, "http://my-project-test-env.localhost:8080/", url)

	// Test with custom port
	url = generateURL(env, namespace, isLocal, "9090")
	assert.Equal(t, "http://my-project-test-env.localhost:9090/", url)
}

func TestGenerateURL_ProductionMode(t *testing.T) {
	env := &catalystv1alpha1.Environment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-env",
			Namespace: "default",
		},
	}

	namespace := "my-project-test-env"
	isLocal := false

	url := generateURL(env, namespace, isLocal, "")
	assert.Equal(t, "https://test-env.preview.catalyst.dev/", url)

	// Port should be ignored in production mode
	url = generateURL(env, namespace, isLocal, "9090")
	assert.Equal(t, "https://test-env.preview.catalyst.dev/", url)
}

func TestGetImageForDeployment_FromSpec(t *testing.T) {
	// When image is explicitly set in config, it should be used
	env := &catalystv1alpha1.Environment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-env",
			Namespace: "default",
		},
		Spec: catalystv1alpha1.EnvironmentSpec{
			ProjectRef:     catalystv1alpha1.ProjectReference{Name: "catalyst"},
			Type:           "deployment",
			DeploymentMode: "production",
			Sources: []catalystv1alpha1.EnvironmentSource{
				{
					Name:      "main",
					CommitSha: "abc1234",
					Branch:    "main",
				},
			},
			Config: catalystv1alpha1.EnvironmentConfig{
				Image: "ghcr.io/ncrmro/catalyst:latest",
			},
		},
	}

	image := getImageForDeployment(env)
	// Should use the image from spec.config.image
	assert.Equal(t, "ghcr.io/ncrmro/catalyst:latest", image)
}

func TestGetImageForDeployment_FallbackToClusterRegistry(t *testing.T) {
	// When image is not set in config, fallback to cluster registry
	env := &catalystv1alpha1.Environment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-env",
			Namespace: "default",
		},
		Spec: catalystv1alpha1.EnvironmentSpec{
			ProjectRef:     catalystv1alpha1.ProjectReference{Name: "catalyst"},
			Type:           "development",
			DeploymentMode: "workspace",
			Sources: []catalystv1alpha1.EnvironmentSource{
				{
					Name:      "main",
					CommitSha: "abc1234",
					Branch:    "main",
				},
			},
			// No image in config - should fallback to cluster registry
		},
	}

	image := getImageForDeployment(env)
	// Should use cluster registry with commit SHA
	assert.Equal(t, "registry.default.svc.cluster.local:5000/catalyst:abc1234", image)
}

func TestGetImageForDeployment_CustomImage(t *testing.T) {
	// Test with a completely custom image (e.g., Docker Hub)
	env := &catalystv1alpha1.Environment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-env",
			Namespace: "default",
		},
		Spec: catalystv1alpha1.EnvironmentSpec{
			ProjectRef: catalystv1alpha1.ProjectReference{Name: "my-project"},
			Type:       "deployment",
			Sources: []catalystv1alpha1.EnvironmentSource{
				{
					Name:      "main",
					CommitSha: "def5678",
					Branch:    "feature",
				},
			},
			Config: catalystv1alpha1.EnvironmentConfig{
				Image: "nginx:alpine",
			},
		},
	}

	image := getImageForDeployment(env)
	// Should use the custom image from config
	assert.Equal(t, "nginx:alpine", image)
}
