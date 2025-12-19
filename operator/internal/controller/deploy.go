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

func desiredDeployment(env *catalystv1alpha1.Environment, namespace string) *appsv1.Deployment {
	imageTag := fmt.Sprintf("%s/%s:%s", registryHost, env.Spec.ProjectRef.Name, env.Spec.Source.CommitSha)
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
						},
					},
				},
			},
		},
	}
}

func desiredService(env *catalystv1alpha1.Environment, namespace string) *corev1.Service {
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

func desiredIngress(env *catalystv1alpha1.Environment, namespace string) *networkingv1.Ingress {
	// Host format: pr-123-org-repo.preview.catalyst.dev
	// For now: <env-name>.preview.catalyst.dev
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

func toCoreEnvVars(vars []catalystv1alpha1.EnvVar) []corev1.EnvVar {
	res := []corev1.EnvVar{}
	for _, v := range vars {
		res = append(res, corev1.EnvVar{Name: v.Name, Value: v.Value})
	}
	return res
}
