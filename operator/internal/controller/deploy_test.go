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
			Source: catalystv1alpha1.EnvironmentSource{
				CommitSha: "abc1234",
				Branch:    "main",
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

	// Verify path-based routing annotation
	assert.Equal(t, "/$2", ingress.Annotations["nginx.ingress.kubernetes.io/rewrite-target"])
	assert.NotContains(t, ingress.Annotations, "cert-manager.io/cluster-issuer")

	// Verify no TLS configuration in local mode
	assert.Empty(t, ingress.Spec.TLS)

	// Verify path-based routing rules
	assert.Len(t, ingress.Spec.Rules, 1)
	rule := ingress.Spec.Rules[0]
	assert.Empty(t, rule.Host) // No host in local mode

	assert.NotNil(t, rule.HTTP)
	assert.Len(t, rule.HTTP.Paths, 1)

	path := rule.HTTP.Paths[0]
	expectedPath := "/my-project-test-env(/|$)(.*)"
	assert.Equal(t, expectedPath, path.Path)
	assert.Equal(t, networkingv1.PathTypeImplementationSpecific, *path.PathType)

	// Verify backend
	assert.Equal(t, "app", path.Backend.Service.Name)
	assert.Equal(t, int32(80), path.Backend.Service.Port.Number)
}

func TestDesiredIngress_ProductionMode(t *testing.T) {
	// Create a test environment
	env := &catalystv1alpha1.Environment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-env",
			Namespace: "default",
		},
		Spec: catalystv1alpha1.EnvironmentSpec{
			ProjectRef: catalystv1alpha1.ProjectReference{Name: "my-project"},
			Type:       "deployment",
			Source: catalystv1alpha1.EnvironmentSource{
				CommitSha: "abc1234",
				Branch:    "main",
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

	// Test with default port
	url := generateURL(env, namespace, isLocal, "")
	assert.Equal(t, "http://localhost:8080/my-project-test-env/", url)

	// Test with custom port
	url = generateURL(env, namespace, isLocal, "9090")
	assert.Equal(t, "http://localhost:9090/my-project-test-env/", url)
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
