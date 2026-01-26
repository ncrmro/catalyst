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
	"fmt"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

var _ = Describe("Environment Controller", func() {
	Context("When reconciling a resource", func() {
		const resourceName = "test-env"
		const projectName = "my-project"
		const namespace = "test-team" // Environment CRs are stored in team namespace

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: namespace,
		}

		BeforeEach(func() {
			By("Creating the team namespace (idempotent)")
			teamNs := &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: namespace,
				},
			}
			// Only create if it doesn't exist (idempotent)
			err := k8sClient.Get(ctx, types.NamespacedName{Name: namespace}, &corev1.Namespace{})
			if errors.IsNotFound(err) {
				Expect(k8sClient.Create(ctx, teamNs)).To(Succeed())
			}

			By("Creating the Git Secret in team namespace")
			gitSecret := &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "github-pat-secret",
					Namespace: namespace,
				},
				Data: map[string][]byte{
					"token": []byte("dummy-token"),
				},
			}
			_ = k8sClient.Delete(ctx, gitSecret)
			Expect(k8sClient.Create(ctx, gitSecret)).To(Succeed())

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

			// Verify Project was created and can be fetched
			fetchedProject := &catalystv1alpha1.Project{}
			Eventually(func() error {
				return k8sClient.Get(ctx, client.ObjectKey{Name: projectName, Namespace: namespace}, fetchedProject)
			}, time.Second*5, time.Millisecond*250).Should(Succeed())

			By("Creating the Environment CR")
			resource := &catalystv1alpha1.Environment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      resourceName,
					Namespace: namespace,
					// Add required hierarchy labels (FR-ENV-020)
					Labels: map[string]string{
						"catalyst.dev/team":        namespace,
						"catalyst.dev/project":     projectName,
						"catalyst.dev/environment": resourceName,
					},
				},
				Spec: catalystv1alpha1.EnvironmentSpec{
					ProjectRef:     catalystv1alpha1.ProjectReference{Name: projectName},
					Type:           "development",
					DeploymentMode: "workspace", // Force workspace mode for this test
					Sources: []catalystv1alpha1.EnvironmentSource{
						{
							Name:      "main",
							CommitSha: "abc1234",
							Branch:    "main",
						},
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
				_ = k8sClient.Update(ctx, resource)

				By("Cleaning up the Environment CR")
				Expect(k8sClient.Delete(ctx, resource)).To(Succeed())
			}

			// Cleanup Namespace using proper hierarchy-based name generation
			targetNsName := GenerateEnvironmentNamespace(namespace, projectName, resourceName)
			ns := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: targetNsName}}
			_ = k8sClient.Delete(ctx, ns)

			// Cleanup Project from team namespace
			project := &catalystv1alpha1.Project{
				ObjectMeta: metav1.ObjectMeta{
					Name:      projectName,
					Namespace: namespace,
				},
			}
			_ = k8sClient.Delete(ctx, project)

			// Cleanup team namespace
			teamNs := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespace}}
			_ = k8sClient.Delete(ctx, teamNs)
		})

		It("should successfully create a Namespace, Quotas, Policies and Workspace Pod", func() {
			controllerReconciler := &EnvironmentReconciler{
				Client: k8sClient,
				Scheme: k8sClient.Scheme(),
				Config: cfg,
			}

			// Reconcile (might need to call twice for resources to settle)
			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())

			// Call reconcile again to ensure namespace creation completes
			_, err = controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())

			// Call reconcile a third time for good measure (finalizer, then namespace creation, then resource setup)
			_, err = controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())

			// DEBUG: List all namespaces to see what got created
			allNamespaces := &corev1.NamespaceList{}
			Expect(k8sClient.List(ctx, allNamespaces)).To(Succeed())
			fmt.Printf("DEBUG: All namespaces after reconcile:\n")
			for _, ns := range allNamespaces.Items {
				fmt.Printf("  - %s\n", ns.Name)
			}
			fmt.Printf("DEBUG: Looking for namespace: %s\n", GenerateEnvironmentNamespace(namespace, projectName, resourceName))

			// 1. Verify Namespace Created using proper hierarchy-based name
			targetNsName := GenerateEnvironmentNamespace(namespace, projectName, resourceName)
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

	Context("When reconciling a Helm environment", func() {
		const resourceName = "helm-env-test"
		const projectName = "helm-project"
		const namespace = "test-team-helm" // Unique team namespace for this context

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: namespace,
		}

		BeforeEach(func() {
			By("Waiting for team namespace to be fully deleted if terminating")
			Eventually(func() bool {
				ns := &corev1.Namespace{}
				err := k8sClient.Get(ctx, types.NamespacedName{Name: namespace}, ns)
				if errors.IsNotFound(err) {
					return true // Namespace doesn't exist, we can proceed
				}
				if err != nil {
					return false // Error getting namespace
				}
				// Namespace exists but might be terminating
				return ns.Status.Phase != corev1.NamespaceTerminating
			}, time.Second*30, time.Millisecond*500).Should(BeTrue())

			By("Creating the team namespace (idempotent)")
			teamNs := &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: namespace,
				},
			}
			// Only create if it doesn't exist (idempotent)
			err := k8sClient.Get(ctx, types.NamespacedName{Name: namespace}, &corev1.Namespace{})
			if errors.IsNotFound(err) {
				Expect(k8sClient.Create(ctx, teamNs)).To(Succeed())
			}

			By("Creating the Git Secret in team namespace")
			gitSecret := &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "github-pat-secret",
					Namespace: namespace,
				},
				Data: map[string][]byte{
					"token": []byte("dummy-token"),
				},
			}
			_ = k8sClient.Delete(ctx, gitSecret)
			Expect(k8sClient.Create(ctx, gitSecret)).To(Succeed())

			By("Creating the Project CR with Helm template")
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
						"helm-env": {
							Type: "helm",
							Path: "../../../charts/example",
						},
					},
				},
			}
			// Delete if exists to avoid conflicts
			_ = k8sClient.Delete(ctx, project)
			Expect(k8sClient.Create(ctx, project)).To(Succeed())

			By("Creating the Environment CR using Helm template")
			resource := &catalystv1alpha1.Environment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      resourceName,
					Namespace: namespace,
					Labels: map[string]string{
						"catalyst.dev/team":        namespace,
						"catalyst.dev/project":     projectName,
						"catalyst.dev/environment": resourceName,
					},
				},
				Spec: catalystv1alpha1.EnvironmentSpec{
					ProjectRef: catalystv1alpha1.ProjectReference{Name: projectName},
					Type:       "helm-env",
					Sources: []catalystv1alpha1.EnvironmentSource{
						{
							Name:      "main",
							CommitSha: "abc1234",
							Branch:    "main",
						},
					},
				},
			}
			_ = k8sClient.Delete(ctx, resource)
			Expect(k8sClient.Create(ctx, resource)).To(Succeed())
		})

		AfterEach(func() {
			resource := &catalystv1alpha1.Environment{}
			if err := k8sClient.Get(ctx, typeNamespacedName, resource); err == nil {
				controllerutil.RemoveFinalizer(resource, "catalyst.dev/finalizer")
				_ = k8sClient.Update(ctx, resource)
				_ = k8sClient.Delete(ctx, resource)
			}
			targetNsName := GenerateEnvironmentNamespace(namespace, projectName, resourceName)
			_ = k8sClient.Delete(ctx, &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: targetNsName}})

			// NOTE: Don't delete team namespace - envtest doesn't fully support namespace
			// termination, causing subsequent tests to fail waiting for namespace deletion.
			// The namespace is reused across tests in this context.
		})

		It("should successfully deploy the Helm chart", func() {
			controllerReconciler := &EnvironmentReconciler{
				Client: k8sClient,
				Scheme: k8sClient.Scheme(),
				Config: cfg,
			}

			// Reconcile
			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())

			// 1. Verify Namespace Created
			targetNsName := GenerateEnvironmentNamespace(namespace, projectName, resourceName)
			ns := &corev1.Namespace{}
			Eventually(func() error {
				return k8sClient.Get(ctx, types.NamespacedName{Name: targetNsName}, ns)
			}, time.Second*10, time.Millisecond*250).Should(Succeed())

			// Simulate Controller Manager: Create default ServiceAccount
			sa := &corev1.ServiceAccount{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "default",
					Namespace: targetNsName,
				},
			}
			Expect(k8sClient.Create(ctx, sa)).To(Succeed())

			// Trigger Reconcile again (might need multiple reconciles for helm installation)
			_, err = controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())

			// 2. Verify Helm Release Resources
			// We check if a Deployment exists in the target namespace
			deployList := &appsv1.DeploymentList{}
			Eventually(func() int {
				_ = k8sClient.List(ctx, deployList, client.InNamespace(targetNsName))
				return len(deployList.Items)
			}, time.Second*20, time.Millisecond*500).Should(BeNumerically(">", 0), "Expected at least one Deployment to be created by Helm")

			// 3. Verify Status
			env := &catalystv1alpha1.Environment{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, env)).To(Succeed())
			Expect(env.Status.Phase).To(Equal("Ready"))
		})

		It("should fail when chart path is invalid", func() {
			// Create a project with an invalid chart path
			invalidProject := &catalystv1alpha1.Project{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "invalid-path-project",
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
						"helm-env": {
							Type: "helm",
							Path: "/nonexistent/path/to/chart",
						},
					},
				},
			}
			_ = k8sClient.Delete(ctx, invalidProject)
			Expect(k8sClient.Create(ctx, invalidProject)).To(Succeed())

			// Create environment
			invalidEnv := &catalystv1alpha1.Environment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "invalid-path-env",
					Namespace: namespace,
					Labels: map[string]string{
						"catalyst.dev/team":        namespace,
						"catalyst.dev/project":     "invalid-path-project",
						"catalyst.dev/environment": "invalid-path-env",
					},
				},
				Spec: catalystv1alpha1.EnvironmentSpec{
					ProjectRef: catalystv1alpha1.ProjectReference{Name: "invalid-path-project"},
					Type:       "helm-env",
					Sources: []catalystv1alpha1.EnvironmentSource{
						{
							Name:      "main",
							CommitSha: "abc1234",
							Branch:    "main",
						},
					},
				},
			}
			_ = k8sClient.Delete(ctx, invalidEnv)
			Expect(k8sClient.Create(ctx, invalidEnv)).To(Succeed())

			controllerReconciler := &EnvironmentReconciler{
				Client: k8sClient,
				Scheme: k8sClient.Scheme(),
				Config: cfg,
			}

			// First reconcile creates namespace
			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: types.NamespacedName{Name: "invalid-path-env", Namespace: namespace},
			})
			Expect(err).NotTo(HaveOccurred())

			// Create ServiceAccount to proceed past waiting state
			targetNsName := GenerateEnvironmentNamespace(namespace, "invalid-path-project", "invalid-path-env")
			sa := &corev1.ServiceAccount{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "default",
					Namespace: targetNsName,
				},
			}
			Expect(k8sClient.Create(ctx, sa)).To(Succeed())

			// Second reconcile should NOT return error (to prevent requeue)
			// but should mark the environment as Failed
			_, err = controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: types.NamespacedName{Name: "invalid-path-env", Namespace: namespace},
			})
			Expect(err).NotTo(HaveOccurred(), "Controller should not return error for missing source to avoid continuous reconciliation")

			// Verify status is Failed
			env := &catalystv1alpha1.Environment{}
			Expect(k8sClient.Get(ctx, types.NamespacedName{Name: "invalid-path-env", Namespace: namespace}, env)).To(Succeed())
			Expect(env.Status.Phase).To(Equal("Failed"), "Environment should be marked as Failed when source is not found")

			// Cleanup
			_ = k8sClient.Delete(ctx, sa)
			_ = k8sClient.Delete(ctx, invalidEnv)
			_ = k8sClient.Delete(ctx, invalidProject)
			_ = k8sClient.Delete(ctx, &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: targetNsName}})
		})

		It("should fail when SourceRef is missing", func() {
			// Create a project with SourceRef but no matching source
			missingRefProject := &catalystv1alpha1.Project{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "missing-ref-project",
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
						"helm-env": {
							Type:      "helm",
							SourceRef: "nonexistent-source",
							Path:      "charts/app",
						},
					},
				},
			}
			_ = k8sClient.Delete(ctx, missingRefProject)
			Expect(k8sClient.Create(ctx, missingRefProject)).To(Succeed())

			// Create environment
			missingRefEnv := &catalystv1alpha1.Environment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "missing-ref-env",
					Namespace: namespace,
					Labels: map[string]string{
						"catalyst.dev/team":        namespace,
						"catalyst.dev/project":     "missing-ref-project",
						"catalyst.dev/environment": "missing-ref-env",
					},
				},
				Spec: catalystv1alpha1.EnvironmentSpec{
					ProjectRef: catalystv1alpha1.ProjectReference{Name: "missing-ref-project"},
					Type:       "helm-env",
					Sources: []catalystv1alpha1.EnvironmentSource{
						{
							Name:      "main",
							CommitSha: "abc1234",
							Branch:    "main",
						},
					},
				},
			}
			_ = k8sClient.Delete(ctx, missingRefEnv)
			Expect(k8sClient.Create(ctx, missingRefEnv)).To(Succeed())

			controllerReconciler := &EnvironmentReconciler{
				Client: k8sClient,
				Scheme: k8sClient.Scheme(),
				Config: cfg,
			}

			// First reconcile creates namespace
			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: types.NamespacedName{Name: "missing-ref-env", Namespace: namespace},
			})
			Expect(err).NotTo(HaveOccurred())

			// Create ServiceAccount to proceed past waiting state
			targetNsName := GenerateEnvironmentNamespace(namespace, "missing-ref-project", "missing-ref-env")
			sa := &corev1.ServiceAccount{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "default",
					Namespace: targetNsName,
				},
			}
			Expect(k8sClient.Create(ctx, sa)).To(Succeed())

			// Second reconcile should fail with source ref not found
			_, err = controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: types.NamespacedName{Name: "missing-ref-env", Namespace: namespace},
			})
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(ContainSubstring("source ref"))

			// Verify status is Failed
			env := &catalystv1alpha1.Environment{}
			Expect(k8sClient.Get(ctx, types.NamespacedName{Name: "missing-ref-env", Namespace: namespace}, env)).To(Succeed())
			Expect(env.Status.Phase).To(Equal("Failed"))

			// Cleanup
			_ = k8sClient.Delete(ctx, sa)
			_ = k8sClient.Delete(ctx, missingRefEnv)
			_ = k8sClient.Delete(ctx, missingRefProject)
			_ = k8sClient.Delete(ctx, &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: targetNsName}})
		})

		It("should fail when helm template is nil", func() {
			// Create environment without helm template
			noTemplateProject := &catalystv1alpha1.Project{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "no-template-project",
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
					Templates: map[string]catalystv1alpha1.EnvironmentTemplate{},
				},
			}
			_ = k8sClient.Delete(ctx, noTemplateProject)
			Expect(k8sClient.Create(ctx, noTemplateProject)).To(Succeed())

			noTemplateEnv := &catalystv1alpha1.Environment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "no-template-env",
					Namespace: namespace,
					Labels: map[string]string{
						"catalyst.dev/team":        namespace,
						"catalyst.dev/project":     "no-template-project",
						"catalyst.dev/environment": "no-template-env",
					},
				},
				Spec: catalystv1alpha1.EnvironmentSpec{
					ProjectRef:     catalystv1alpha1.ProjectReference{Name: "no-template-project"},
					Type:           "helm-env",
					DeploymentMode: "helm",
					Sources: []catalystv1alpha1.EnvironmentSource{
						{
							Name:      "main",
							CommitSha: "abc1234",
							Branch:    "main",
						},
					},
				},
			}
			_ = k8sClient.Delete(ctx, noTemplateEnv)
			Expect(k8sClient.Create(ctx, noTemplateEnv)).To(Succeed())

			controllerReconciler := &EnvironmentReconciler{
				Client: k8sClient,
				Scheme: k8sClient.Scheme(),
				Config: cfg,
			}

			// First reconcile creates namespace
			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: types.NamespacedName{Name: "no-template-env", Namespace: namespace},
			})
			Expect(err).NotTo(HaveOccurred())

			// Create ServiceAccount to proceed past waiting state
			targetNsName := GenerateEnvironmentNamespace(namespace, "no-template-project", "no-template-env")
			sa := &corev1.ServiceAccount{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "default",
					Namespace: targetNsName,
				},
			}
			Expect(k8sClient.Create(ctx, sa)).To(Succeed())

			// Second reconcile should fail with helm template required
			_, err = controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: types.NamespacedName{Name: "no-template-env", Namespace: namespace},
			})
			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(ContainSubstring("helm template is required"))

			// Verify status is Failed
			env := &catalystv1alpha1.Environment{}
			Expect(k8sClient.Get(ctx, types.NamespacedName{Name: "no-template-env", Namespace: namespace}, env)).To(Succeed())
			Expect(env.Status.Phase).To(Equal("Failed"))

			// Cleanup
			_ = k8sClient.Delete(ctx, sa)
			_ = k8sClient.Delete(ctx, noTemplateEnv)
			_ = k8sClient.Delete(ctx, noTemplateProject)
			_ = k8sClient.Delete(ctx, &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: targetNsName}})
		})
	})

	Context("When reconciling a Zero-Config environment", func() {
		const resourceName = "zero-config-test"
		const projectName = "zero-config-project"
		const namespace = "test-team-build" // Unique team namespace for this context

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: namespace,
		}

		BeforeEach(func() {
			By("Creating the team namespace (idempotent)")
			teamNs := &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: namespace,
				},
			}
			// Only create if it doesn't exist (idempotent)
			err := k8sClient.Get(ctx, types.NamespacedName{Name: namespace}, &corev1.Namespace{})
			if errors.IsNotFound(err) {
				Expect(k8sClient.Create(ctx, teamNs)).To(Succeed())
			}

			By("Creating the Git Secret in team namespace")
			gitSecret := &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "github-pat-secret",
					Namespace: namespace,
				},
				Data: map[string][]byte{
					"token": []byte("dummy-token"),
				},
			}
			_ = k8sClient.Delete(ctx, gitSecret)
			Expect(k8sClient.Create(ctx, gitSecret)).To(Succeed())

			By("Creating the Registry Secret in team namespace")
			registrySecret := &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "registry-credentials",
					Namespace: namespace,
				},
				Data: map[string][]byte{
					".dockerconfigjson": []byte("{}"),
				},
				Type: corev1.SecretTypeDockerConfigJson,
			}
			_ = k8sClient.Delete(ctx, registrySecret)
			Expect(k8sClient.Create(ctx, registrySecret)).To(Succeed())

			By("Creating the Project CR with Builds")
			project := &catalystv1alpha1.Project{
				ObjectMeta: metav1.ObjectMeta{
					Name:      projectName,
					Namespace: namespace,
				},
				Spec: catalystv1alpha1.ProjectSpec{
					Sources: []catalystv1alpha1.SourceConfig{
						{
							Name:          "web",
							RepositoryURL: "https://github.com/org/web",
							Branch:        "main",
						},
					},
					Templates: map[string]catalystv1alpha1.EnvironmentTemplate{
						"zero-config": {
							Type: "helm",
							Path: "../../../charts/example",
							Builds: []catalystv1alpha1.BuildSpec{
								{
									Name:      "web",
									SourceRef: "web",
									// Dockerfile missing -> Zero Config logic
								},
							},
						},
					},
				},
			}
			_ = k8sClient.Delete(ctx, project)
			Expect(k8sClient.Create(ctx, project)).To(Succeed())

			By("Creating the Environment CR")
			resource := &catalystv1alpha1.Environment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      resourceName,
					Namespace: namespace,
					Labels: map[string]string{
						"catalyst.dev/team":        namespace,
						"catalyst.dev/project":     projectName,
						"catalyst.dev/environment": resourceName,
					},
				},
				Spec: catalystv1alpha1.EnvironmentSpec{
					ProjectRef: catalystv1alpha1.ProjectReference{Name: projectName},
					Type:       "zero-config",
					Sources: []catalystv1alpha1.EnvironmentSource{
						{
							Name:      "web",
							CommitSha: "abc1234",
							Branch:    "main",
						},
					},
				},
			}
			_ = k8sClient.Delete(ctx, resource)
			Expect(k8sClient.Create(ctx, resource)).To(Succeed())
		})

		AfterEach(func() {
			resource := &catalystv1alpha1.Environment{}
			if err := k8sClient.Get(ctx, typeNamespacedName, resource); err == nil {
				controllerutil.RemoveFinalizer(resource, "catalyst.dev/finalizer")
				_ = k8sClient.Update(ctx, resource)
				_ = k8sClient.Delete(ctx, resource)
			}
			targetNsName := GenerateEnvironmentNamespace(namespace, projectName, resourceName)
			_ = k8sClient.Delete(ctx, &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: targetNsName}})

			// Cleanup team namespace
			_ = k8sClient.Delete(ctx, &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespace}})
		})

		It("should create a Build Job with init containers", func() {
			controllerReconciler := &EnvironmentReconciler{
				Client: k8sClient,
				Scheme: k8sClient.Scheme(),
				Config: cfg,
			}

			// Reconcile
			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())

			targetNsName := GenerateEnvironmentNamespace(namespace, projectName, resourceName)

			// Simulate Controller Manager: Create default ServiceAccount
			sa := &corev1.ServiceAccount{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "default",
					Namespace: targetNsName,
				},
			}
			// Wait for namespace to be created first
			ns := &corev1.Namespace{}
			Eventually(func() error {
				return k8sClient.Get(ctx, types.NamespacedName{Name: targetNsName}, ns)
			}, time.Second*10, time.Millisecond*250).Should(Succeed())

			Expect(k8sClient.Create(ctx, sa)).To(Succeed())

			// Trigger Reconcile again (as it probably returned RequeueAfter)
			_, err = controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())

			// 1. Verify Job Created
			jobName := "build-web-abc1234"
			job := &batchv1.Job{}
			Eventually(func() error {
				return k8sClient.Get(ctx, types.NamespacedName{Name: jobName, Namespace: targetNsName}, job)
			}, time.Second*10, time.Millisecond*250).Should(Succeed())

			// 2. Verify Init Containers
			Expect(job.Spec.Template.Spec.InitContainers).To(HaveLen(1))
			Expect(job.Spec.Template.Spec.InitContainers[0].Name).To(Equal("git-sync"))
			// Expect(job.Spec.Template.Spec.InitContainers[1].Name).To(Equal("dockerfile-gen"))

			// 3. Verify Env Status
			env := &catalystv1alpha1.Environment{}
			Expect(k8sClient.Get(ctx, typeNamespacedName, env)).To(Succeed())
			Expect(env.Status.Phase).To(Equal("Building"))

			// 4. Simulate Job Success
			job.Status.Succeeded = 1
			Expect(k8sClient.Status().Update(ctx, job)).To(Succeed())

			// Trigger Reconcile Again
			_, err = controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())

			// 5. Verify Registry Secret copied
			targetRegSecret := &corev1.Secret{}
			Eventually(func() error {
				return k8sClient.Get(ctx, types.NamespacedName{Name: "registry-credentials", Namespace: targetNsName}, targetRegSecret)
			}, time.Second*10, time.Millisecond*250).Should(Succeed())

			// 6. Verify ServiceAccount patched
			targetSA := &corev1.ServiceAccount{}
			Eventually(func() bool {
				if err := k8sClient.Get(ctx, types.NamespacedName{Name: "default", Namespace: targetNsName}, targetSA); err != nil {
					return false
				}
				for _, s := range targetSA.ImagePullSecrets {
					if s.Name == "registry-credentials" {
						return true
					}
				}
				return false
			}, time.Second*10, time.Millisecond*250).Should(BeTrue())
		})
	})

	Context("When reconciling a Docker Compose environment", func() {
		const resourceName = "compose-test"
		const projectName = "compose-project"
		const namespace = "test-team-compose" // Unique team namespace for this context

		ctx := context.Background()

		typeNamespacedName := types.NamespacedName{
			Name:      resourceName,
			Namespace: namespace,
		}

		BeforeEach(func() {
			By("Creating the team namespace (idempotent)")
			teamNs := &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: namespace,
				},
			}
			// Only create if it doesn't exist (idempotent)
			err := k8sClient.Get(ctx, types.NamespacedName{Name: namespace}, &corev1.Namespace{})
			if errors.IsNotFound(err) {
				Expect(k8sClient.Create(ctx, teamNs)).To(Succeed())
			}

			By("Creating the Git Secret in team namespace")
			gitSecret := &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "github-pat-secret",
					Namespace: namespace,
				},
				Data: map[string][]byte{
					"token": []byte("dummy-token"),
				},
			}
			_ = k8sClient.Delete(ctx, gitSecret)
			Expect(k8sClient.Create(ctx, gitSecret)).To(Succeed())

			By("Creating the Project CR with Compose template")
			project := &catalystv1alpha1.Project{
				ObjectMeta: metav1.ObjectMeta{
					Name:      projectName,
					Namespace: namespace,
				},
				Spec: catalystv1alpha1.ProjectSpec{
					Sources: []catalystv1alpha1.SourceConfig{
						{
							Name:          "app",
							RepositoryURL: "https://github.com/org/app",
							Branch:        "main",
						},
					},
					Templates: map[string]catalystv1alpha1.EnvironmentTemplate{
						"compose": {
							Type: "docker-compose",
							Path: "./testdata/compose",
						},
					},
				},
			}
			_ = k8sClient.Delete(ctx, project)
			Expect(k8sClient.Create(ctx, project)).To(Succeed())

			By("Creating the Environment CR")
			resource := &catalystv1alpha1.Environment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      resourceName,
					Namespace: namespace,
					Labels: map[string]string{
						"catalyst.dev/team":        namespace,
						"catalyst.dev/project":     projectName,
						"catalyst.dev/environment": resourceName,
					},
				},
				Spec: catalystv1alpha1.EnvironmentSpec{
					ProjectRef: catalystv1alpha1.ProjectReference{Name: projectName},
					Type:       "compose",
					Sources: []catalystv1alpha1.EnvironmentSource{
						{
							Name:      "app",
							CommitSha: "abc1234",
							Branch:    "main",
						},
					},
				},
			}
			_ = k8sClient.Delete(ctx, resource)
			Expect(k8sClient.Create(ctx, resource)).To(Succeed())
		})

		AfterEach(func() {
			resource := &catalystv1alpha1.Environment{}
			if err := k8sClient.Get(ctx, typeNamespacedName, resource); err == nil {
				controllerutil.RemoveFinalizer(resource, "catalyst.dev/finalizer")
				_ = k8sClient.Update(ctx, resource)
				_ = k8sClient.Delete(ctx, resource)
			}
			targetNsName := GenerateEnvironmentNamespace(namespace, projectName, resourceName)
			_ = k8sClient.Delete(ctx, &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: targetNsName}})

			// Cleanup team namespace
			_ = k8sClient.Delete(ctx, &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespace}})
		})

		It("should successfully translate Compose to K8s resources", func() {
			controllerReconciler := &EnvironmentReconciler{
				Client: k8sClient,
				Scheme: k8sClient.Scheme(),
				Config: cfg,
			}

			// Reconcile
			_, err := controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())

			targetNsName := GenerateEnvironmentNamespace(namespace, projectName, resourceName)

			// Simulate Controller Manager: Create default ServiceAccount
			sa := &corev1.ServiceAccount{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "default",
					Namespace: targetNsName,
				},
			}
			ns := &corev1.Namespace{}
			Eventually(func() error {
				return k8sClient.Get(ctx, types.NamespacedName{Name: targetNsName}, ns)
			}, time.Second*10, time.Millisecond*250).Should(Succeed())
			Expect(k8sClient.Create(ctx, sa)).To(Succeed())

			// Trigger Reconcile again
			_, err = controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())

			// 1. Verify Build Job created for 'web' service
			jobName := "build-web-abc1234"
			job := &batchv1.Job{}
			Eventually(func() error {
				return k8sClient.Get(ctx, types.NamespacedName{Name: jobName, Namespace: targetNsName}, job)
			}, time.Second*10, time.Millisecond*250).Should(Succeed())

			// 2. Simulate Build Success
			job.Status.Succeeded = 1
			Expect(k8sClient.Status().Update(ctx, job)).To(Succeed())

			// Trigger Reconcile again
			_, err = controllerReconciler.Reconcile(ctx, reconcile.Request{
				NamespacedName: typeNamespacedName,
			})
			Expect(err).NotTo(HaveOccurred())

			// 3. Verify Deployments created for both 'web' and 'db'
			webDeploy := &appsv1.Deployment{}
			Eventually(func() error {
				return k8sClient.Get(ctx, types.NamespacedName{Name: "web", Namespace: targetNsName}, webDeploy)
			}, time.Second*10, time.Millisecond*250).Should(Succeed())

			dbDeploy := &appsv1.Deployment{}
			Eventually(func() error {
				return k8sClient.Get(ctx, types.NamespacedName{Name: "db", Namespace: targetNsName}, dbDeploy)
			}, time.Second*10, time.Millisecond*250).Should(Succeed())

			// 4. Verify Service created for 'web'
			webSvc := &corev1.Service{}
			Eventually(func() error {
				return k8sClient.Get(ctx, types.NamespacedName{Name: "web", Namespace: targetNsName}, webSvc)
			}, time.Second*10, time.Millisecond*250).Should(Succeed())
			Expect(webSvc.Spec.Ports[0].Port).To(Equal(int32(80)))
		})
	})
})
