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
	policy := desiredNetworkPolicy("test-ns")

	assert.Equal(t, "default-policy", policy.Name)
	assert.Equal(t, "test-ns", policy.Namespace)

	assert.Len(t, policy.Spec.PolicyTypes, 2)
	assert.Len(t, policy.Spec.Egress, 2) // DNS + Registry
}
