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
	"strings"
	"testing"
)

func TestSanitizeNamespaceComponent(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"lowercase", "MyTeam", "myteam"},
		{"underscores", "my_team", "my-team"},
		{"spaces", "my team", "my-team"},
		{"slashes", "my/team", "my-team"},
		{"dots", "my.team", "my-team"},
		{"multiple hyphens", "my---team", "my-team"},
		{"leading hyphens", "-myteam-", "myteam"},
		{"complex", "My_Team-Name.123", "my-team-name-123"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := sanitizeNamespaceComponent(tt.input)
			if result != tt.expected {
				t.Errorf("sanitizeNamespaceComponent(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestGenerateNamespaceWithHash(t *testing.T) {
	tests := []struct {
		name            string
		components      []string
		expectTruncated bool
		expectedLength  int
	}{
		{
			name:            "short name",
			components:      []string{"my-team", "my-project", "dev"},
			expectTruncated: false,
			expectedLength:  0, // will be calculated
		},
		{
			name: "long name with truncation",
			components: []string{
				"my-super-long-team-name",
				"my-super-long-project-name",
				"feature-very-long-branch-name",
			},
			expectTruncated: true,
			expectedLength:  63,
		},
		{
			name:            "empty components filtered",
			components:      []string{"team", "", "project"},
			expectTruncated: false,
			expectedLength:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GenerateNamespaceWithHash(tt.components)

			// Check length constraint
			if len(result) > 63 {
				t.Errorf("GenerateNamespaceWithHash() returned name with length %d, must be <= 63", len(result))
			}

			// Check expected length if specified
			if tt.expectedLength > 0 && len(result) != tt.expectedLength {
				t.Errorf("GenerateNamespaceWithHash() length = %d, want %d", len(result), tt.expectedLength)
			}

			// Check DNS-1123 compliance
			if !IsValidNamespaceName(result) {
				t.Errorf("GenerateNamespaceWithHash() returned invalid namespace name: %q", result)
			}

			// If truncated, should end with hash
			if tt.expectTruncated {
				parts := strings.Split(result, "-")
				lastPart := parts[len(parts)-1]
				if len(lastPart) != 5 {
					t.Errorf("Expected hash suffix of length 5, got %d", len(lastPart))
				}
			}
		})
	}
}

func TestGenerateNamespaceWithHashConsistency(t *testing.T) {
	components := []string{"long-team", "long-project", "long-environment"}

	result1 := GenerateNamespaceWithHash(components)
	result2 := GenerateNamespaceWithHash(components)

	if result1 != result2 {
		t.Errorf("GenerateNamespaceWithHash() not consistent: %q != %q", result1, result2)
	}
}

func TestGenerateNamespaceWithHashUniqueness(t *testing.T) {
	components1 := []string{"team1", "project1", "env1"}
	components2 := []string{"team2", "project2", "env2"}

	result1 := GenerateNamespaceWithHash(components1)
	result2 := GenerateNamespaceWithHash(components2)

	if result1 == result2 {
		t.Errorf("GenerateNamespaceWithHash() produced same result for different inputs")
	}
}

func TestGenerateTeamNamespace(t *testing.T) {
	tests := []struct {
		name     string
		teamName string
		expected string
	}{
		{"simple", "my-team", "my-team"},
		{"sanitize", "My_Team", "my-team"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GenerateTeamNamespace(tt.teamName)
			if result != tt.expected {
				t.Errorf("GenerateTeamNamespace(%q) = %q, want %q", tt.teamName, result, tt.expected)
			}
		})
	}
}

func TestGenerateProjectNamespace(t *testing.T) {
	tests := []struct {
		name        string
		teamName    string
		projectName string
		checkValid  bool
	}{
		{"simple", "my-team", "my-project", true},
		{"long", "my-super-long-team-name", "my-super-long-project-name-that-is-really-long", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GenerateProjectNamespace(tt.teamName, tt.projectName)

			if len(result) > 63 {
				t.Errorf("GenerateProjectNamespace() returned name with length %d, must be <= 63", len(result))
			}

			if tt.checkValid && !IsValidNamespaceName(result) {
				t.Errorf("GenerateProjectNamespace() returned invalid namespace name: %q", result)
			}
		})
	}
}

func TestGenerateEnvironmentNamespace(t *testing.T) {
	tests := []struct {
		name            string
		teamName        string
		projectName     string
		environmentName string
		expectedLength  int
	}{
		{
			name:            "simple",
			teamName:        "my-team",
			projectName:     "my-project",
			environmentName: "dev",
			expectedLength:  0, // will be under 63
		},
		{
			name:            "spec example",
			teamName:        "my-super-long-team-name",
			projectName:     "my-super-long-project-name",
			environmentName: "feature-very-long-branch-name",
			expectedLength:  63,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GenerateEnvironmentNamespace(tt.teamName, tt.projectName, tt.environmentName)

			if len(result) > 63 {
				t.Errorf("GenerateEnvironmentNamespace() returned name with length %d, must be <= 63", len(result))
			}

			if tt.expectedLength > 0 && len(result) != tt.expectedLength {
				t.Errorf("GenerateEnvironmentNamespace() length = %d, want %d", len(result), tt.expectedLength)
			}

			if !IsValidNamespaceName(result) {
				t.Errorf("GenerateEnvironmentNamespace() returned invalid namespace name: %q", result)
			}
		})
	}
}

func TestGenerateEnvironmentNamespaceConsistency(t *testing.T) {
	result1 := GenerateEnvironmentNamespace("team", "project", "environment")
	result2 := GenerateEnvironmentNamespace("team", "project", "environment")

	if result1 != result2 {
		t.Errorf("GenerateEnvironmentNamespace() not consistent: %q != %q", result1, result2)
	}
}

func TestIsValidNamespaceName(t *testing.T) {
	tests := []struct {
		name  string
		input string
		valid bool
	}{
		{"valid simple", "my-team", true},
		{"valid with numbers", "abc-123", true},
		{"valid single char", "a", true},
		{"invalid empty", "", false},
		{"invalid too long", strings.Repeat("a", 64), false},
		{"invalid uppercase", "MyTeam", false},
		{"invalid underscore", "my_team", false},
		{"invalid dot", "my.team", false},
		{"invalid slash", "my/team", false},
		{"invalid start hyphen", "-myteam", false},
		{"invalid end hyphen", "myteam-", false},
		{"valid middle hyphen", "my-team-name", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsValidNamespaceName(tt.input)
			if result != tt.valid {
				t.Errorf("IsValidNamespaceName(%q) = %v, want %v", tt.input, result, tt.valid)
			}
		})
	}
}

func TestExtractNamespaceHierarchy(t *testing.T) {
	tests := []struct {
		name     string
		labels   map[string]string
		expected *NamespaceHierarchy
	}{
		{
			name: "complete labels",
			labels: map[string]string{
				"catalyst.dev/team":        "my-team",
				"catalyst.dev/project":     "my-project",
				"catalyst.dev/environment": "dev",
			},
			expected: &NamespaceHierarchy{
				Team:        "my-team",
				Project:     "my-project",
				Environment: "dev",
			},
		},
		{
			name:     "nil labels",
			labels:   nil,
			expected: nil,
		},
		{
			name: "incomplete labels",
			labels: map[string]string{
				"catalyst.dev/team": "my-team",
			},
			expected: nil,
		},
		{
			name: "labels with extras",
			labels: map[string]string{
				"catalyst.dev/team":        "my-team",
				"catalyst.dev/project":     "my-project",
				"catalyst.dev/environment": "dev",
				"app.kubernetes.io/name":   "my-app",
			},
			expected: &NamespaceHierarchy{
				Team:        "my-team",
				Project:     "my-project",
				Environment: "dev",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ExtractNamespaceHierarchy(tt.labels)

			if tt.expected == nil {
				if result != nil {
					t.Errorf("ExtractNamespaceHierarchy() = %v, want nil", result)
				}
				return
			}

			if result == nil {
				t.Errorf("ExtractNamespaceHierarchy() = nil, want %v", tt.expected)
				return
			}

			if result.Team != tt.expected.Team ||
				result.Project != tt.expected.Project ||
				result.Environment != tt.expected.Environment {
				t.Errorf("ExtractNamespaceHierarchy() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestFRENV021Compliance(t *testing.T) {
	// FR-ENV-021: The System MUST validate and enforce the Kubernetes 63-character limit
	t.Run("never exceed 63 characters", func(t *testing.T) {
		testCases := [][]string{
			{"team", "project", "env"},
			{strings.Repeat("a", 30), strings.Repeat("b", 30), strings.Repeat("c", 30)},
			{"very-long-team-name", "very-long-project-name", "very-long-env-name"},
			{
				"my-super-long-team-name",
				"my-super-long-project-name",
				"feature-very-long-branch-name",
			},
		}

		for _, components := range testCases {
			result := GenerateNamespaceWithHash(components)
			if len(result) > 63 {
				t.Errorf("GenerateNamespaceWithHash(%v) exceeded 63 characters: length=%d", components, len(result))
			}
		}
	})

	t.Run("use hash when length exceeds 63", func(t *testing.T) {
		result := GenerateNamespaceWithHash([]string{
			"long-team-name-that-is-quite-lengthy",
			"long-project-name-that-is-also-quite-lengthy",
			"long-environment-name",
		})

		// If truncated, should have hash suffix
		if len(result) == 63 {
			parts := strings.Split(result, "-")
			lastPart := parts[len(parts)-1]
			if len(lastPart) != 5 {
				t.Errorf("Expected hash suffix of length 5, got %d", len(lastPart))
			}
		}
	})

	t.Run("maintain uniqueness with hashing", func(t *testing.T) {
		result1 := GenerateNamespaceWithHash([]string{
			"my-super-long-team-name",
			"my-super-long-project-name",
			"feature-branch-name-1",
		})

		result2 := GenerateNamespaceWithHash([]string{
			"my-super-long-team-name",
			"my-super-long-project-name",
			"feature-branch-name-2",
		})

		if result1 == result2 {
			t.Errorf("Different inputs produced same hash: %q", result1)
		}

		if len(result1) > 63 || len(result2) > 63 {
			t.Errorf("Results exceeded 63 characters")
		}
	})
}
