package controller

import (
	"testing"

	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
)

func TestDesiredResourceQuota(t *testing.T) {
	quota := desiredResourceQuota("test-ns")

	assert.Equal(t, "default-quota", quota.Name)
	assert.Equal(t, "test-ns", quota.Namespace)

	cpu := quota.Spec.Hard[corev1.ResourceLimitsCPU]
	assert.Equal(t, "4", cpu.String())

	mem := quota.Spec.Hard[corev1.ResourceLimitsMemory]
	assert.Equal(t, "8Gi", mem.String())
}

func TestDesiredNetworkPolicy(t *testing.T) {
	policy := desiredNetworkPolicy("test-ns", "ingress-namespace")
	assert.Equal(t, "default-policy", policy.Name)
	assert.Equal(t, "test-ns", policy.Namespace)
	assert.Equal(t, "ingress-namespace", policy.Spec.Ingress[0].From[0].NamespaceSelector.MatchLabels["kubernetes.io/metadata.name"])
}
