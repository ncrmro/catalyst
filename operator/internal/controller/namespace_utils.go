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
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"regexp"
	"strings"
)

// sanitizeNamespaceComponent sanitizes a string for use as a Kubernetes namespace component.
// Does NOT enforce length limits - use GenerateNamespaceWithHash for that.
//
// Kubernetes namespace names must:
// - Contain only lowercase letters, numbers, and hyphens
// - Start and end with alphanumeric characters
func sanitizeNamespaceComponent(name string) string {
	// Convert to lowercase
	name = strings.ToLower(name)

	// Replace invalid characters with hyphens
	reg := regexp.MustCompile(`[^a-z0-9-]+`)
	name = reg.ReplaceAllString(name, "-")

	// Collapse multiple hyphens
	reg = regexp.MustCompile(`-+`)
	name = reg.ReplaceAllString(name, "-")

	// Remove leading/trailing hyphens
	name = strings.Trim(name, "-")

	return name
}

// GenerateNamespaceWithHash generates a namespace name with automatic truncation and hashing if needed.
//
// Implementation of FR-ENV-021:
// If the combined length exceeds 63 characters:
// 1. Calculate SHA-256 hash of the full string
// 2. Truncate the full string to 57 characters
// 3. Append a hyphen and the first 5 characters of the hash
// 4. Total length: 57 + 1 + 5 = 63 characters
//
// Example:
//
//	GenerateNamespaceWithHash([]string{"my-team", "my-project", "feature"})
//	// => "my-team-my-project-feature" (29 chars, under limit)
//
//	GenerateNamespaceWithHash([]string{"my-super-long-team", "my-super-long-project", "feature-branch"})
//	// => "my-super-long-team-my-super-long-project-feature-bra-a1b2c" (63 chars)
func GenerateNamespaceWithHash(components []string) string {
	// Sanitize and filter empty components
	sanitized := make([]string, 0, len(components))
	for _, comp := range components {
		cleaned := sanitizeNamespaceComponent(comp)
		if cleaned != "" {
			sanitized = append(sanitized, cleaned)
		}
	}

	// Join with hyphens
	fullName := strings.Join(sanitized, "-")

	// If under 63 characters, return as-is
	if len(fullName) <= 63 {
		return fullName
	}

	// Calculate SHA-256 hash of the full name
	hasher := sha256.New()
	hasher.Write([]byte(fullName))
	hash := hex.EncodeToString(hasher.Sum(nil))

	// Take first 5 characters of hash
	hashSuffix := hash[:5]

	// Truncate to 57 characters (63 - 1 hyphen - 5 hash chars)
	truncated := fullName
	if len(truncated) > 57 {
		truncated = truncated[:57]
	}

	// Remove trailing hyphen if present after truncation
	truncated = strings.TrimRight(truncated, "-")

	// Combine truncated name with hash
	return fmt.Sprintf("%s-%s", truncated, hashSuffix)
}

// GenerateTeamNamespace generates a team namespace name.
//
// Team namespace contains Project CRs and shared team infrastructure.
//
// Format: <team-name>
func GenerateTeamNamespace(teamName string) string {
	return sanitizeNamespaceComponent(teamName)
}

// GenerateProjectNamespace generates a project namespace name.
//
// Project namespace contains Environment CRs and provides project-level isolation.
//
// Format: <team-name>-<project-name>
func GenerateProjectNamespace(teamName, projectName string) string {
	return GenerateNamespaceWithHash([]string{teamName, projectName})
}

// GenerateEnvironmentNamespace generates an environment namespace name.
//
// Environment namespace is the actual target for workload deployments.
// This is where Pods, Services, Deployments, etc. are created.
//
// Format: <team>-<project>-<env>
func GenerateEnvironmentNamespace(teamName, projectName, environmentName string) string {
	return GenerateNamespaceWithHash([]string{teamName, projectName, environmentName})
}

// IsValidNamespaceName validates that a namespace name is DNS-1123 compliant and under 63 characters.
func IsValidNamespaceName(name string) bool {
	if len(name) == 0 || len(name) > 63 {
		return false
	}

	// Must match DNS-1123 label format
	dns1123Regex := regexp.MustCompile(`^[a-z0-9]([-a-z0-9]*[a-z0-9])?$`)
	return dns1123Regex.MatchString(name)
}

// NamespaceHierarchy represents the namespace hierarchy components
type NamespaceHierarchy struct {
	Team        string
	Project     string
	Environment string
}

// ExtractNamespaceHierarchy extracts namespace hierarchy components from labels.
// Returns nil if any required label is missing.
func ExtractNamespaceHierarchy(labels map[string]string) *NamespaceHierarchy {
	if labels == nil {
		return nil
	}

	team := labels["catalyst.dev/team"]
	project := labels["catalyst.dev/project"]
	environment := labels["catalyst.dev/environment"]

	if team == "" || project == "" || environment == "" {
		return nil
	}

	return &NamespaceHierarchy{
		Team:        team,
		Project:     project,
		Environment: environment,
	}
}
