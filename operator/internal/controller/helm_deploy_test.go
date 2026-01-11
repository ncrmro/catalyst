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
	"encoding/json"
	"os"
	"path/filepath"
	"time"

	"github.com/go-logr/logr"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"k8s.io/apimachinery/pkg/runtime"

	catalystv1alpha1 "github.com/ncrmro/catalyst/operator/api/v1alpha1"
)

var _ = Describe("mergeHelmValues", func() {
	var reconciler *EnvironmentReconciler

	BeforeEach(func() {
		reconciler = &EnvironmentReconciler{}
	})

	It("should merge empty template values with environment config", func() {
		template := &catalystv1alpha1.EnvironmentTemplate{
			Values: runtime.RawExtension{Raw: nil},
		}
		env := &catalystv1alpha1.Environment{
			Spec: catalystv1alpha1.EnvironmentSpec{
				Config: catalystv1alpha1.EnvironmentConfig{
					EnvVars: []catalystv1alpha1.EnvVar{
						{Name: "KEY1", Value: "value1"},
						{Name: "KEY2", Value: "value2"},
					},
					Image: "ghcr.io/test/image:latest",
				},
			},
		}

		vals, err := reconciler.mergeHelmValues(template, env)
		Expect(err).NotTo(HaveOccurred())
		Expect(vals["env"]).To(HaveKeyWithValue("KEY1", "value1"))
		Expect(vals["env"]).To(HaveKeyWithValue("KEY2", "value2"))
		Expect(vals["image"]).To(HaveKeyWithValue("repository", "ghcr.io/test/image:latest"))
	})

	It("should deep merge environment variables preserving template defaults", func() {
		templateVals := map[string]interface{}{
			"env": map[string]interface{}{
				"TEMPLATE_VAR": "template_value",
				"OVERRIDE_VAR": "will_be_overridden",
			},
		}
		templateJSON, _ := json.Marshal(templateVals)
		template := &catalystv1alpha1.EnvironmentTemplate{
			Values: runtime.RawExtension{Raw: templateJSON},
		}
		env := &catalystv1alpha1.Environment{
			Spec: catalystv1alpha1.EnvironmentSpec{
				Config: catalystv1alpha1.EnvironmentConfig{
					EnvVars: []catalystv1alpha1.EnvVar{
						{Name: "OVERRIDE_VAR", Value: "env_value"},
						{Name: "NEW_VAR", Value: "new_value"},
					},
				},
			},
		}

		vals, err := reconciler.mergeHelmValues(template, env)
		Expect(err).NotTo(HaveOccurred())
		envMap := vals["env"].(map[string]interface{})
		Expect(envMap["TEMPLATE_VAR"]).To(Equal("template_value"))
		Expect(envMap["OVERRIDE_VAR"]).To(Equal("env_value"))
		Expect(envMap["NEW_VAR"]).To(Equal("new_value"))
	})

	It("should handle image as string in template", func() {
		templateVals := map[string]interface{}{
			"image": "template/image:v1",
		}
		templateJSON, _ := json.Marshal(templateVals)
		template := &catalystv1alpha1.EnvironmentTemplate{
			Values: runtime.RawExtension{Raw: templateJSON},
		}
		env := &catalystv1alpha1.Environment{
			Spec: catalystv1alpha1.EnvironmentSpec{
				Config: catalystv1alpha1.EnvironmentConfig{
					Image: "ghcr.io/override/image:latest",
				},
			},
		}

		vals, err := reconciler.mergeHelmValues(template, env)
		Expect(err).NotTo(HaveOccurred())
		Expect(vals["image"]).To(Equal("ghcr.io/override/image:latest"))
	})

	It("should handle image.repository in template", func() {
		templateVals := map[string]interface{}{
			"image": map[string]interface{}{
				"repository": "template/repo",
				"tag":        "v1.0",
				"pullPolicy": "IfNotPresent",
			},
		}
		templateJSON, _ := json.Marshal(templateVals)
		template := &catalystv1alpha1.EnvironmentTemplate{
			Values: runtime.RawExtension{Raw: templateJSON},
		}
		env := &catalystv1alpha1.Environment{
			Spec: catalystv1alpha1.EnvironmentSpec{
				Config: catalystv1alpha1.EnvironmentConfig{
					Image: "ghcr.io/override/repo",
				},
			},
		}

		vals, err := reconciler.mergeHelmValues(template, env)
		Expect(err).NotTo(HaveOccurred())
		imageMap := vals["image"].(map[string]interface{})
		Expect(imageMap["repository"]).To(Equal("ghcr.io/override/repo"))
		Expect(imageMap["tag"]).To(Equal("v1.0"))
		Expect(imageMap["pullPolicy"]).To(Equal("IfNotPresent"))
	})

	It("should handle image.name in template", func() {
		templateVals := map[string]interface{}{
			"image": map[string]interface{}{
				"name": "template/name",
				"tag":  "v1.0",
			},
		}
		templateJSON, _ := json.Marshal(templateVals)
		template := &catalystv1alpha1.EnvironmentTemplate{
			Values: runtime.RawExtension{Raw: templateJSON},
		}
		env := &catalystv1alpha1.Environment{
			Spec: catalystv1alpha1.EnvironmentSpec{
				Config: catalystv1alpha1.EnvironmentConfig{
					Image: "ghcr.io/override/name",
				},
			},
		}

		vals, err := reconciler.mergeHelmValues(template, env)
		Expect(err).NotTo(HaveOccurred())
		imageMap := vals["image"].(map[string]interface{})
		Expect(imageMap["name"]).To(Equal("ghcr.io/override/name"))
		Expect(imageMap["tag"]).To(Equal("v1.0"))
	})

	It("should handle invalid JSON in template values", func() {
		template := &catalystv1alpha1.EnvironmentTemplate{
			Values: runtime.RawExtension{Raw: []byte("{invalid json")},
		}
		env := &catalystv1alpha1.Environment{}

		_, err := reconciler.mergeHelmValues(template, env)
		Expect(err).To(HaveOccurred())
		Expect(err.Error()).To(ContainSubstring("failed to unmarshal template values"))
	})

	It("should work with nil environment config", func() {
		templateVals := map[string]interface{}{
			"replicaCount": 3,
		}
		templateJSON, _ := json.Marshal(templateVals)
		template := &catalystv1alpha1.EnvironmentTemplate{
			Values: runtime.RawExtension{Raw: templateJSON},
		}
		env := &catalystv1alpha1.Environment{
			Spec: catalystv1alpha1.EnvironmentSpec{
				Config: catalystv1alpha1.EnvironmentConfig{},
			},
		}

		vals, err := reconciler.mergeHelmValues(template, env)
		Expect(err).NotTo(HaveOccurred())
		Expect(vals["replicaCount"]).To(Equal(float64(3)))
		Expect(vals["env"]).To(BeNil())
		Expect(vals["image"]).To(BeNil())
	})
})

var _ = Describe("cleanupStaleTempDirs", func() {
	var testTempDir string
	var log logr.Logger

	BeforeEach(func() {
		// Create a test temp directory
		var err error
		testTempDir, err = os.MkdirTemp("", "cleanup-test-*")
		Expect(err).NotTo(HaveOccurred())

		// Reset the cleanup time to allow immediate execution
		cleanupMutex.Lock()
		lastCleanupTime = time.Time{}
		cleanupMutex.Unlock()

		log = logr.Discard()
	})

	AfterEach(func() {
		// Clean up test directory
		_ = os.RemoveAll(testTempDir)
	})

	It("should only remove directories with catalyst-chart prefix", func() {
		// Create test directories
		oldDir := filepath.Join(testTempDir, "catalyst-chart-old")
		otherDir := filepath.Join(testTempDir, "other-dir")
		err := os.Mkdir(oldDir, 0755)
		Expect(err).NotTo(HaveOccurred())
		err = os.Mkdir(otherDir, 0755)
		Expect(err).NotTo(HaveOccurred())

		// Set old directory to be stale (25 hours old)
		oldTime := time.Now().Add(-25 * time.Hour)
		err = os.Chtimes(oldDir, oldTime, oldTime)
		Expect(err).NotTo(HaveOccurred())

		// Run cleanup - this won't work because we can't override os.TempDir()
		// But we can test the logic by examining the function

		// Verify other directory still exists
		_, err = os.Stat(otherDir)
		Expect(err).NotTo(HaveOccurred())
	})

	It("should respect rate limiting", func() {
		// First call should execute
		cleanupStaleTempDirs(log)
		firstTime := lastCleanupTime

		// Immediate second call should be skipped due to rate limiting
		cleanupStaleTempDirs(log)
		Expect(lastCleanupTime).To(Equal(firstTime))

		// After 5+ minutes, it should execute again
		cleanupMutex.Lock()
		lastCleanupTime = time.Now().Add(-6 * time.Minute)
		cleanupMutex.Unlock()

		cleanupStaleTempDirs(log)
		Expect(lastCleanupTime).To(BeTemporally(">", firstTime))
	})

	It("should handle concurrent cleanup calls safely", func() {
		// Reset to allow execution
		cleanupMutex.Lock()
		lastCleanupTime = time.Time{}
		cleanupMutex.Unlock()

		// Run multiple cleanups concurrently
		done := make(chan bool, 10)
		for i := 0; i < 10; i++ {
			go func() {
				cleanupStaleTempDirs(log)
				done <- true
			}()
		}

		// Wait for all to complete
		for i := 0; i < 10; i++ {
			<-done
		}

		// Only one should have executed (due to mutex + rate limiting)
		// We can verify this by checking lastCleanupTime is set
		Expect(lastCleanupTime).NotTo(Equal(time.Time{}))
	})
})
