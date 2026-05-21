package controller

import (
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
)

// Spec: operator/spec.md
// Goals:
// - Apply ResourceQuota (CPU/Mem limits)
// - Apply NetworkPolicy (Isolation rules)
//
// NOTE: FR-ENV-029 calls for reading quota from Project.Resources.DefaultQuota,
// but the current QuotaSpec only has CPU and Memory (not requests vs limits, pods).
// For now, hardcoded defaults remain. Full implementation requires enhancing QuotaSpec
// to support: requestsCPU, limitsCPU, requestsMemory, limitsMemory, pods.
// TODO(FR-ENV-029): Update QuotaSpec and implement quota reading from Project CR.

func desiredResourceQuota(namespace string) *corev1.ResourceQuota {
	return &corev1.ResourceQuota{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "default-quota",
			Namespace: namespace,
		},
		Spec: corev1.ResourceQuotaSpec{
			Hard: corev1.ResourceList{
				corev1.ResourceRequestsCPU:    resource.MustParse("2"),
				corev1.ResourceLimitsCPU:      resource.MustParse("4"),
				corev1.ResourceRequestsMemory: resource.MustParse("4Gi"),
				corev1.ResourceLimitsMemory:   resource.MustParse("8Gi"),
				corev1.ResourcePods:           resource.MustParse("20"),
			},
		},
	}
}

func desiredNetworkPolicy(namespace, ingressNamespace string) *networkingv1.NetworkPolicy {
	// Default Deny All + specific allow rules
	return &networkingv1.NetworkPolicy{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "default-policy",
			Namespace: namespace,
		},
		Spec: networkingv1.NetworkPolicySpec{
			PodSelector: metav1.LabelSelector{}, // Select all pods
			PolicyTypes: []networkingv1.PolicyType{
				networkingv1.PolicyTypeIngress,
				networkingv1.PolicyTypeEgress,
			},
			Ingress: []networkingv1.NetworkPolicyIngressRule{
				{
					// Allow Ingress from Ingress Controller
					From: []networkingv1.NetworkPolicyPeer{
						{
							NamespaceSelector: &metav1.LabelSelector{
								MatchLabels: map[string]string{"kubernetes.io/metadata.name": ingressNamespace},
							},
						},
					},
				},
				{
					// Allow intra-namespace communication (e.g., web → postgres)
					From: []networkingv1.NetworkPolicyPeer{
						{
							PodSelector: &metav1.LabelSelector{},
						},
					},
				},
			},
			Egress: []networkingv1.NetworkPolicyEgressRule{
				{
					// Allow DNS
					To: []networkingv1.NetworkPolicyPeer{
						{
							NamespaceSelector: &metav1.LabelSelector{
								MatchLabels: map[string]string{"kubernetes.io/metadata.name": "kube-system"},
							},
							PodSelector: &metav1.LabelSelector{
								MatchLabels: map[string]string{"k8s-app": "kube-dns"},
							},
						},
					},
					Ports: []networkingv1.NetworkPolicyPort{
						{Protocol: ptr(corev1.ProtocolUDP), Port: ptr(intstr.FromInt(53))},
						{Protocol: ptr(corev1.ProtocolTCP), Port: ptr(intstr.FromInt(53))},
					},
				},
				{
					// Allow Registry (0.0.0.0/0 for now as registry might be anywhere)
					// In a real setup, we'd restrict this further.
					To: []networkingv1.NetworkPolicyPeer{
						{
							IPBlock: &networkingv1.IPBlock{CIDR: "0.0.0.0/0"},
						},
					},
				},
			},
		},
	}
}

func ptr[T any](v T) *T {
	return &v
}
