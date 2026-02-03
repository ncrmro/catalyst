//nolint:goconst
package controller

import (
	"fmt"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"

	catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

// Spec: operator/spec.md
// Goals:
// - Deploy Application (Helm/Manifest)
// - Create Ingress with TLS

// desiredDeploymentFromConfig creates a deployment from resolved config
func desiredDeploymentFromConfig(namespace string, config *catalystv1alpha1.EnvironmentConfig) *appsv1.Deployment {
	name := "web" // Standard name within the isolated namespace
	replicas := int32(1)

	// Build environment variables from config
	envVars := config.Env

	// Build main container from config
	container := corev1.Container{
		Name:         name,
		Image:        config.Image,
		Command:      config.Command,
		Args:         config.Args,
		WorkingDir:   config.WorkingDir,
		Ports:        config.Ports,
		Env:          envVars,
		VolumeMounts: config.VolumeMounts,
	}

	if config.Resources != nil {
		container.Resources = *config.Resources
	}
	if config.LivenessProbe != nil {
		container.LivenessProbe = config.LivenessProbe
	}
	if config.ReadinessProbe != nil {
		container.ReadinessProbe = config.ReadinessProbe
	}
	if config.StartupProbe != nil {
		container.StartupProbe = config.StartupProbe
	}

	// Build volumes
	volumes := []corev1.Volume{}
	for _, volSpec := range config.Volumes {
		if volSpec.PersistentVolumeClaim != nil {
			volumes = append(volumes, corev1.Volume{
				Name: volSpec.Name,
				VolumeSource: corev1.VolumeSource{
					PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
						ClaimName: volSpec.Name,
					},
				},
			})
		}
	}

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
					Containers: []corev1.Container{container},
					Volumes:    volumes,
				},
			},
		},
	}
}

// desiredServiceFromConfig creates a service from resolved config
func desiredServiceFromConfig(namespace string, config *catalystv1alpha1.EnvironmentConfig) *corev1.Service {
	// Build service ports from config ports
	servicePorts := []corev1.ServicePort{}
	for _, containerPort := range config.Ports {
		servicePorts = append(servicePorts, corev1.ServicePort{
			Port:       80, // Service listens on 80
			TargetPort: intstr.FromInt(int(containerPort.ContainerPort)),
			Protocol:   containerPort.Protocol,
		})
	}

	// If no ports in config, use first port only
	if len(servicePorts) > 1 {
		servicePorts = servicePorts[:1] // Only use the first port
	}

	return &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "web",
			Namespace: namespace,
		},
		Spec: corev1.ServiceSpec{
			Selector: map[string]string{"app": "web"},
			Ports:    servicePorts,
		},
	}
}

// desiredIngress creates an Ingress resource for the environment.
// When isLocal is true, it uses hostname-based routing with *.localhost (e.g., namespace.localhost:8080).
// When isLocal is false, it uses hostname-based routing with TLS (production mode).
func desiredIngress(env *catalystv1alpha1.Environment, namespace string, isLocal bool, previewDomain ...string) *networkingv1.Ingress {
	if isLocal {
		// Hostname-based routing for local development
		// Pattern: namespace.localhost (e.g., catalyst-catalyst-dev.localhost:8080)
		// Modern browsers resolve *.localhost to 127.0.0.1
		host := fmt.Sprintf("%s.localhost", namespace)
		pathType := networkingv1.PathTypePrefix

		return &networkingv1.Ingress{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "web",
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
												Name: "web",
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
	domain := "preview.catalyst.dev"
	if len(previewDomain) > 0 && previewDomain[0] != "" {
		domain = previewDomain[0]
	}
	host := fmt.Sprintf("%s.%s", env.Name, domain)
	pathType := networkingv1.PathTypePrefix

	return &networkingv1.Ingress{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "web",
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
											Name: "web",
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
func generateURL(env *catalystv1alpha1.Environment, namespace string, isLocal bool, ingressPort string, previewDomain ...string) string {
	if isLocal {
		// Hostname-based URL for local development
		// Default ingress port is 8080 if not specified
		if ingressPort == "" {
			ingressPort = "8080"
		}
		return fmt.Sprintf("http://%s.localhost:%s/", namespace, ingressPort)
	}

	// Production hostname-based URL with HTTPS
	domain := "preview.catalyst.dev"
	if len(previewDomain) > 0 && previewDomain[0] != "" {
		domain = previewDomain[0]
	}
	return fmt.Sprintf("https://%s.%s/", env.Name, domain)
}