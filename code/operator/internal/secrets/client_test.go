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

package secrets

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewSecretsFetcher(t *testing.T) {
	fetcher := NewSecretsFetcher("http://test-api")

	assert.Equal(t, "http://test-api", fetcher.WebAPIURL)
	assert.NotNil(t, fetcher.HTTPClient)
	assert.Equal(t, "/var/run/secrets/kubernetes.io/serviceaccount/token", fetcher.ServiceAccount)
}

func TestFetchSecrets_Success(t *testing.T) {
	// Create mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify request
		assert.Equal(t, "GET", r.Method)
		assert.Equal(t, "/api/internal/secrets/test-env-123", r.URL.Path)
		assert.Contains(t, r.Header.Get("Authorization"), "Bearer")

		// Return mock response
		response := SecretsResponse{
			Secrets: map[string]string{
				"DATABASE_URL": "postgresql://localhost/test",
				"API_KEY":      "sk-test-key",
				"DEBUG":        "true",
			},
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	// Create temp token file
	tmpDir := t.TempDir()
	tokenFile := filepath.Join(tmpDir, "token")
	require.NoError(t, os.WriteFile(tokenFile, []byte("test-token"), 0600))

	// Create fetcher
	fetcher := &SecretsFetcher{
		WebAPIURL:      server.URL,
		HTTPClient:     &http.Client{},
		ServiceAccount: tokenFile,
	}

	// Test
	secrets, err := fetcher.FetchSecrets(context.Background(), "test-env-123")

	require.NoError(t, err)
	assert.Len(t, secrets, 3)
	assert.Equal(t, "postgresql://localhost/test", secrets["DATABASE_URL"])
	assert.Equal(t, "sk-test-key", secrets["API_KEY"])
	assert.Equal(t, "true", secrets["DEBUG"])
}

func TestFetchSecrets_Unauthorized(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"error": "Unauthorized"}`))
	}))
	defer server.Close()

	tmpDir := t.TempDir()
	tokenFile := filepath.Join(tmpDir, "token")
	require.NoError(t, os.WriteFile(tokenFile, []byte("invalid-token"), 0600))

	fetcher := &SecretsFetcher{
		WebAPIURL:      server.URL,
		HTTPClient:     &http.Client{},
		ServiceAccount: tokenFile,
	}

	secrets, err := fetcher.FetchSecrets(context.Background(), "test-env-123")

	require.Error(t, err)
	assert.Nil(t, secrets)
	assert.Contains(t, err.Error(), "unauthorized")
}

func TestFetchSecrets_NotFound(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"error": "Environment not found"}`))
	}))
	defer server.Close()

	tmpDir := t.TempDir()
	tokenFile := filepath.Join(tmpDir, "token")
	require.NoError(t, os.WriteFile(tokenFile, []byte("test-token"), 0600))

	fetcher := &SecretsFetcher{
		WebAPIURL:      server.URL,
		HTTPClient:     &http.Client{},
		ServiceAccount: tokenFile,
	}

	secrets, err := fetcher.FetchSecrets(context.Background(), "nonexistent-env")

	require.Error(t, err)
	assert.Nil(t, secrets)
	assert.Contains(t, err.Error(), "environment not found")
}

func TestFetchSecrets_TokenFileNotFound(t *testing.T) {
	fetcher := &SecretsFetcher{
		WebAPIURL:      "http://test-api",
		HTTPClient:     &http.Client{},
		ServiceAccount: "/nonexistent/path/token",
	}

	secrets, err := fetcher.FetchSecrets(context.Background(), "test-env-123")

	require.Error(t, err)
	assert.Nil(t, secrets)
	assert.Contains(t, err.Error(), "failed to read SA token")
}

func TestFetchSecrets_EmptyResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		response := SecretsResponse{
			Secrets: map[string]string{},
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	tmpDir := t.TempDir()
	tokenFile := filepath.Join(tmpDir, "token")
	require.NoError(t, os.WriteFile(tokenFile, []byte("test-token"), 0600))

	fetcher := &SecretsFetcher{
		WebAPIURL:      server.URL,
		HTTPClient:     &http.Client{},
		ServiceAccount: tokenFile,
	}

	secrets, err := fetcher.FetchSecrets(context.Background(), "test-env-123")

	require.NoError(t, err)
	assert.NotNil(t, secrets)
	assert.Len(t, secrets, 0)
}

func TestFetchSecrets_InvalidJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{invalid json}`))
	}))
	defer server.Close()

	tmpDir := t.TempDir()
	tokenFile := filepath.Join(tmpDir, "token")
	require.NoError(t, os.WriteFile(tokenFile, []byte("test-token"), 0600))

	fetcher := &SecretsFetcher{
		WebAPIURL:      server.URL,
		HTTPClient:     &http.Client{},
		ServiceAccount: tokenFile,
	}

	secrets, err := fetcher.FetchSecrets(context.Background(), "test-env-123")

	require.Error(t, err)
	assert.Nil(t, secrets)
	assert.Contains(t, err.Error(), "failed to parse response")
}
