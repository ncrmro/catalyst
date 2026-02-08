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
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// SecretsFetcher handles fetching secrets from the web API
type SecretsFetcher struct {
	WebAPIURL      string
	HTTPClient     *http.Client
	ServiceAccount string // Path to SA token
}

// SecretsResponse represents the API response format
type SecretsResponse struct {
	Secrets map[string]string `json:"secrets"`
}

// NewSecretsFetcher creates a new secrets fetcher with default configuration
func NewSecretsFetcher(webAPIURL string) *SecretsFetcher {
	return &SecretsFetcher{
		WebAPIURL:      webAPIURL,
		HTTPClient:     &http.Client{Timeout: 30 * time.Second},
		ServiceAccount: "/var/run/secrets/kubernetes.io/serviceaccount/token",
	}
}

// FetchSecrets fetches secrets for an environment from the web API
// The environmentId should come from the Environment CR's annotation "catalyst.dev/environment-id"
func (sf *SecretsFetcher) FetchSecrets(ctx context.Context, environmentId string) (map[string]string, error) {
	// 1. Read ServiceAccount token
	tokenBytes, err := os.ReadFile(sf.ServiceAccount)
	if err != nil {
		return nil, fmt.Errorf("failed to read SA token: %w", err)
	}
	token := string(tokenBytes)

	// 2. Make HTTP request
	url := fmt.Sprintf("%s/api/internal/secrets/%s", sf.WebAPIURL, environmentId)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := sf.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch secrets: %w", err)
	}
	defer resp.Body.Close()

	// 3. Handle errors
	if resp.StatusCode == 401 {
		return nil, fmt.Errorf("unauthorized: invalid ServiceAccount token")
	}
	if resp.StatusCode == 404 {
		return nil, fmt.Errorf("environment not found: %s", environmentId)
	}
	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code: %d, body: %s", resp.StatusCode, string(body))
	}

	// 4. Parse response
	var result SecretsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return result.Secrets, nil
}
