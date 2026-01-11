/*
Copyright 2025.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controller

import (
	"context"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

var _ = Describe("Environment Controller", func() {
	Context("When reconciling a resource", func() {
		const resourceName = "test-env"
		const projectName = "my-project"
		const namespace = "default"

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: namespace,
		}

		BeforeEach(func() {
			By("Creating the Project CR")
			project := &catalystv1alpha1.Project{
				ObjectMeta: metav1.ObjectMeta{
					Name:      projectName,
					Namespace: namespace,
				},
				Spec: catalystv1alpha1.ProjectSpec{
					Sources: []catalystv1alpha1.SourceConfig{
						{
							Name:          "main",
							RepositoryURL: "https://github.com/org/repo",
							Branch:        "main",
						},
					},
					Templates: map[string]catalystv1alpha1.EnvironmentTemplate{
						"development": {
							Type: "development",
						},
					},
				},
			}
			// Ignore if exists or delete/recreate
			_ = k8sClient.Delete(ctx, project)
			Expect(k8sClient.Create(ctx, project)).To(Succeed())

			By("Creating the Environment CR")
			resource := &catalystv1alpha1.Environment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      resourceName,
					Namespace: namespace,
				},
				Spec: catalystv1alpha1.EnvironmentSpec{
					ProjectRef: catalystv1alpha1.ProjectReference{Name: projectName},
					Type:       "development",
					Source: catalystv1alpha1.EnvironmentSource{
						CommitSha: "abc1234",
						Branch:    "main",
					},
				},
			}
			// Cleanup if exists
			_ = k8sClient.Delete(ctx, resource)

			Expect(k8sClient.Create(ctx, resource)).To(Succeed())
		})

		AfterEach(func() {
			resource := &catalystv1alpha1.Environment{}
			err := k8sClient.Get(ctx, typeNamespacedName, resource)
			if err == nil {
				// We need to remove the finalizer to allow deletion in test
				controllerutil.RemoveFinalizer(resource, "catalyst.dev/finalizer")
				k8sClient.Update(ctx, resource)

				By("Cleaning up the Environment CR")
				Expect(k8sClient.Delete(ctx, resource)).To(Succeed())
			}

			// Cleanup Namespace
			targetNsName := projectName + "-" + resourceName
			ns := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: targetNsName}}
			k8sClient.Delete(ctx, ns)
		})

		It("should successfully create a Namespace, Quotas, Policies and Workspace Pod", func() {
			controllerReconciler := &EnvironmentReconciler{
				Client: k8sClient,
				Scheme: k8sClient.Scheme(),
			}

			// Reconcile
			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())

			// 1. Verify Namespace Created
			targetNsName := projectName + "-" + resourceName
			ns := &corev1.Namespace{}
			Eventually(func() error {
				return k8sClient.Get(ctx, types.NamespacedName{Name: targetNsName}, ns)
			}, time.Second*10, time.Millisecond*250).Should(Succeed())

			Expect(ns.Name).To(Equal(targetNsName))

			// Simulate Controller Manager: Create default ServiceAccount
			sa := &corev1.ServiceAccount{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "default",
					Namespace: targetNsName,
				},
			}
			Expect(k8sClient.Create(ctx, sa)).To(Succeed())

			// Trigger Reconcile again (since the first one might have returned RequeueAfter)
			_, err = controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())

			// 2. Verify Resources

			quota := &corev1.ResourceQuota{}

			Expect(k8sClient.Get(ctx, types.NamespacedName{Name: "default-quota", Namespace: targetNsName}, quota)).To(Succeed())

			policy := &networkingv1.NetworkPolicy{}

			Expect(k8sClient.Get(ctx, types.NamespacedName{Name: "default-policy", Namespace: targetNsName}, policy)).To(Succeed())

			// 2a. Verify Ingress Created
			ingress := &networkingv1.Ingress{}
			Eventually(func() error {
				return k8sClient.Get(ctx, types.NamespacedName{Name: "app", Namespace: targetNsName}, ingress)
			}, time.Second*10, time.Millisecond*250).Should(Succeed())

			// Verify ingress has correct configuration (local mode by default in tests)
			Expect(ingress.Spec.IngressClassName).NotTo(BeNil())
			Expect(*ingress.Spec.IngressClassName).To(Equal("nginx"))

			// 3. Verify Workspace Pod Created
			// Pod name format: workspace-<project>-<commit[:7]>
			podName := "workspace-my-project-abc1234"

			pod := &corev1.Pod{}

			Eventually(func() error {
				return k8sClient.Get(ctx, types.NamespacedName{Name: podName, Namespace: targetNsName}, pod)
			}, time.Second*10, time.Millisecond*250).Should(Succeed())

			// Verify pod has correct labels
			Expect(pod.Labels["catalyst.dev/pod-type"]).To(Equal("workspace"))
			Expect(pod.Labels["catalyst.dev/project"]).To(Equal(projectName))

			// Verify pod runs sleep infinity
			Expect(pod.Spec.Containers[0].Command).To(Equal([]string{"sleep", "infinity"}))

			// 4. Verify Finalizer Added
			env := &catalystv1alpha1.Environment{}

			Expect(k8sClient.Get(ctx, typeNamespacedName, env)).To(Succeed())

			Expect(controllerutil.ContainsFinalizer(env, "catalyst.dev/finalizer")).To(BeTrue())

			// 5. Verify Status Updated to Provisioning
			Expect(env.Status.Phase).To(Equal("Provisioning"))

			// 6. Simulate Pod Running
			pod.Status.Phase = corev1.PodRunning
			Expect(k8sClient.Status().Update(ctx, pod)).To(Succeed())

			// Trigger Reconcile again
			_, err = controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())

			// 7. Verify Status Ready
			Expect(k8sClient.Get(ctx, typeNamespacedName, env)).To(Succeed())
			Expect(env.Status.Phase).To(Equal("Ready"))

			// 8. Verify URL is populated in status
			// In test environment, LOCAL_PREVIEW_ROUTING would be set, so URL should be path-based
			Expect(env.Status.URL).NotTo(BeEmpty())
			// The URL format depends on environment variables, but it should be present
		})
	})
})
