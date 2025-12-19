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
	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
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
					Source: catalystv1alpha1.SourceConfig{
						RepositoryURL: "https://github.com/org/repo",
						Branch:        "main",
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
			targetNsName := "env-" + resourceName
			ns := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: targetNsName}}
			k8sClient.Delete(ctx, ns)
		})

		It("should successfully create a Namespace, Quotas, Policies and update Status", func() {
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
			targetNsName := "env-" + resourceName
			ns := &corev1.Namespace{}
			Eventually(func() error {
				return k8sClient.Get(ctx, types.NamespacedName{Name: targetNsName}, ns)
			}, time.Second*10, time.Millisecond*250).Should(Succeed())

			Expect(ns.Name).To(Equal(targetNsName))

			// 2. Verify Resources

			quota := &corev1.ResourceQuota{}

			Expect(k8sClient.Get(ctx, types.NamespacedName{Name: "default-quota", Namespace: targetNsName}, quota)).To(Succeed())

			policy := &networkingv1.NetworkPolicy{}

			Expect(k8sClient.Get(ctx, types.NamespacedName{Name: "default-policy", Namespace: targetNsName}, policy)).To(Succeed())

			// 3. Verify Build Job Created

			// Job name format: build-<project>-<commit[:7]>

			jobName := "build-my-project-abc1234"

			job := &batchv1.Job{}

			Eventually(func() error {

				return k8sClient.Get(ctx, types.NamespacedName{Name: jobName, Namespace: targetNsName}, job)

			}, time.Second*10, time.Millisecond*250).Should(Succeed())

			// 4. Verify Finalizer Added

			env := &catalystv1alpha1.Environment{}

			Expect(k8sClient.Get(ctx, typeNamespacedName, env)).To(Succeed())

			Expect(controllerutil.ContainsFinalizer(env, "catalyst.dev/finalizer")).To(BeTrue())

			// 5. Verify Status Updated to Building
			Expect(env.Status.Phase).To(Equal("Building"))

			// 6. Simulate Job Success
			job.Status.Succeeded = 1
			Expect(k8sClient.Status().Update(ctx, job)).To(Succeed())

			// Trigger Reconcile again (or wait for poll)
			// Since we don't watch Job, we wait for the Requeue (10s) or manually trigger
			_, err = controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())

			// 7. Verify Deployment, Service, Ingress
			dep := &appsv1.Deployment{}
			Eventually(func() error {
				return k8sClient.Get(ctx, types.NamespacedName{Name: "app", Namespace: targetNsName}, dep)
			}, time.Second*10, time.Millisecond*250).Should(Succeed())

			svc := &corev1.Service{}
			Expect(k8sClient.Get(ctx, types.NamespacedName{Name: "app", Namespace: targetNsName}, svc)).To(Succeed())

			ing := &networkingv1.Ingress{}
			Expect(k8sClient.Get(ctx, types.NamespacedName{Name: "app", Namespace: targetNsName}, ing)).To(Succeed())

			// 8. Verify Status Ready
			Expect(k8sClient.Get(ctx, typeNamespacedName, env)).To(Succeed())
			Expect(env.Status.Phase).To(Equal("Ready"))
			Expect(env.Status.URL).To(ContainSubstring("preview.catalyst.dev"))
		})
	})
})
