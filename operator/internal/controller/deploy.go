//nolint:goconst
package controller

import (
	"fmt"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"

	catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

// Spec: operator/spec.md
// Goals:
// - Deploy Application (Helm/Manifest)
// - Create Ingress with TLS

// getImageForDeployment returns the container image to deploy.
// Priority: spec.config.image > fallback to cluster registry with commit SHA.
func getImageForDeployment(env *catalystv1alpha1.Environment) string {
	// If image is explicitly set in config, use it
	if env.Spec.Config.Image != "" {
		return env.Spec.Config.Image
	}

	// Fallback to cluster registry for development/workspace modes
	projectName := env.Spec.ProjectRef.Name
	commitSha := "latest"
	sources := env.Spec.Sources
	if len(sources) > 0 {
		commitSha = sources[0].CommitSha
	}
	return fmt.Sprintf("%s/%s:%s", registryHost, projectName, commitSha)
}

func desiredDeployment(env *catalystv1alpha1.Environment, namespace string) *appsv1.Deployment {
	imageTag := getImageForDeployment(env)
	name := "app" // Standard name within the isolated namespace

	replicas := int32(1)

	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
			Labels: map[string]string{
				"app": name,
			},
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{"app": name},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{"app": name},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  name,
							Image: imageTag,
							Ports: []corev1.ContainerPort{
								{ContainerPort: 3000},
							},
							Env: toCoreEnvVars(env.Spec.Config.EnvVars),
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
			},
		},
	}
}

func desiredService(namespace string) *corev1.Service {
	return &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "app",
			Namespace: namespace,
		},
		Spec: corev1.ServiceSpec{
			Selector: map[string]string{"app": "app"},
			Ports: []corev1.ServicePort{
				{
					Port:       80,
					TargetPort: intstr.FromInt(3000),
				},
			},
		},
	}
}

// desiredIngress creates an Ingress resource for the environment.
// When isLocal is true, it uses hostname-based routing with *.localhost (e.g., namespace.localhost:8080).
// When isLocal is false, it uses hostname-based routing with TLS (production mode).
func desiredIngress(env *catalystv1alpha1.Environment, namespace string, isLocal bool) *networkingv1.Ingress {
	if isLocal {
		// Hostname-based routing for local development
		// Pattern: namespace.localhost (e.g., catalyst-catalyst-dev.localhost:8080)
		// Modern browsers resolve *.localhost to 127.0.0.1
		host := fmt.Sprintf("%s.localhost", namespace)
		pathType := networkingv1.PathTypePrefix

		return &networkingv1.Ingress{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "app",
				Namespace: namespace,
			},
			Spec: networkingv1.IngressSpec{
				IngressClassName: ptr("nginx"),
				Rules: []networkingv1.IngressRule{
					{
						Host: host,
						IngressRuleValue: networkingv1.IngressRuleValue{
							HTTP: &networkingv1.HTTPIngressRuleValue{
								Paths: []networkingv1.HTTPIngressPath{
									{
										Path:     "/",
										PathType: &pathType,
										Backend: networkingv1.IngressBackend{
											Service: &networkingv1.IngressServiceBackend{
												Name: "app",
												Port: networkingv1.ServiceBackendPort{
													Number: 80,
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		}
	}

	// Production mode: hostname-based routing with TLS
	// Host format: <env-name>.preview.catalyst.dev
	host := fmt.Sprintf("%s.preview.catalyst.dev", env.Name)
	pathType := networkingv1.PathTypePrefix

	return &networkingv1.Ingress{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "app",
			Namespace: namespace,
			Annotations: map[string]string{
				"cert-manager.io/cluster-issuer": "letsencrypt-prod",
			},
		},
		Spec: networkingv1.IngressSpec{
			IngressClassName: ptr("nginx"),
			TLS: []networkingv1.IngressTLS{
				{
					Hosts:      []string{host},
					SecretName: fmt.Sprintf("%s-tls", env.Name),
				},
			},
			Rules: []networkingv1.IngressRule{
				{
					Host: host,
					IngressRuleValue: networkingv1.IngressRuleValue{
						HTTP: &networkingv1.HTTPIngressRuleValue{
							Paths: []networkingv1.HTTPIngressPath{
								{
									Path:     "/",
									PathType: &pathType,
									Backend: networkingv1.IngressBackend{
										Service: &networkingv1.IngressServiceBackend{
											Name: "app",
											Port: networkingv1.ServiceBackendPort{
												Number: 80,
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	}
}

// generateURL creates the public URL for the environment based on the deployment mode.
// When isLocal is true, it generates a hostname-based URL (e.g., http://namespace.localhost:8080/).
// When isLocal is false, it generates a hostname-based URL with HTTPS (e.g., https://env-name.preview.catalyst.dev/).
func generateURL(env *catalystv1alpha1.Environment, namespace string, isLocal bool, ingressPort string) string {
	if isLocal {
		// Hostname-based URL for local development
		// Default ingress port is 8080 if not specified
		if ingressPort == "" {
			ingressPort = "8080"
		}
		return fmt.Sprintf("http://%s.localhost:%s/", namespace, ingressPort)
	}

	// Production hostname-based URL with HTTPS
	return fmt.Sprintf("https://%s.preview.catalyst.dev/", env.Name)
}

func toCoreEnvVars(vars []catalystv1alpha1.EnvVar) []corev1.EnvVar {
	res := []corev1.EnvVar{}
	for _, v := range vars {
		res = append(res, corev1.EnvVar{Name: v.Name, Value: v.Value})
	}
	return res
}
