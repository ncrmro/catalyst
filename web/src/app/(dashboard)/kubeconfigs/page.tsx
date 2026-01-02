"use client";

import { useState } from "react";

// Mock kubeconfig data that would be suitable for GitHub Actions and buildx
const generateMockKubeconfig = (clusterName: string = "catalyst-cluster") => {
  const token =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9." +
    Buffer.from(
      JSON.stringify({
        iss: `https://kubernetes.default.svc.cluster.local`,
        sub: `system:serviceaccount:default:github-actions`,
        aud: ["https://kubernetes.default.svc.cluster.local"],
        exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
        iat: Math.floor(Date.now() / 1000),
      }),
    ).toString("base64") +
    ".fake-signature-for-demo-purposes-only";

  return `apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUJlRENDQVIyZ0F3SUJBZ0lCQURBTkJna3Foa2lHOXcwQkFRc0ZBREFTTVJBd0RnWURWUVFERXdkcmRXSmwKTFdOaE1CNFhEVEkwTVRJeU5UQTNNVFV3TkZvWERUTTBNVEl5TXpBM01UVXdORm93RWpFUU1BNEdBMVVFQXhNSAphM1ZpWlMxallUQ0JuekFOQmdrcWhraUc5dzBCQVFFRkFBT0JqUUF3Z1lrQ2dZRUF4cXJmeGFyWEcvQ1ViQzNOCjJYbC9yWStLWGk5L2VKSXFyNHFPbVpPRTZzeGRwUFp6cC9PWHVDUnlwSGI1S1hMVUtRWDBGWjc2VVYxRVVOZEUKYm5jWlNZVG5HRnlYK0gyQlZMdHc3Q25hRXBpZXlwekJnOXluNGdLNTliNy9CdGJQNnl5Y0dNWTRaSmpVdlFjVgpxd1FEQUgvQnFKTm1QM01vVWFXZWJpczNma2tDQXdFQUFhTkNNRUF3RGdZRFZSMFBBUUgvQkFRREFnS2tNQThHCkExVWRFd0VCL3dRRk1BTUJBZjh3SFFZRFZSME9CQllFRktQSDJZeXZJdXFhSXJWRzZPS3RQZ3BkV3pscE1BMEcKQ1NxR1NJYjNEUUVCQ3dVQUE0R0JBRjI3MVVmYnU1SXY5NHJOclFZVEViK3BhYWg4UEE5L2JwTXFsNzdHQ0NJMgpGSUVyYjM2VGxOSVkwMUNSU2pBS0NpSzc4eFlHOTU5a2FBdkJkMUFJSHhrZ1VkZU50N1RoLzVTenoyNU9yN3Y2ClZiakNxMDhLQ0dvSjVLSDZZSVlucVBWc0VHM2JLb3pHL3F2M3JNa2hjTW55YzJ0d09peC9BQWpGVkN4RWFDZ3oKSEREQT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
    server: https://kubernetes.catalyst.local:6443
  name: ${clusterName}
contexts:
- context:
    cluster: ${clusterName}
    user: github-actions
  name: github-actions@${clusterName}
current-context: github-actions@${clusterName}
kind: Config
preferences: {}
users:
- name: github-actions
  user:
    token: ${token}
`;
};

export default function KubeconfigsPage() {
  const [kubeconfig] = useState(() => generateMockKubeconfig());
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(kubeconfig);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([kubeconfig], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kubeconfig.yaml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-on-background">
          Kubernetes Configurations
        </h1>
        <p className="mt-4 text-lg text-on-surface-variant">
          Export kubeconfig for use in GitHub Actions, local development, or
          CI/CD pipelines
        </p>
        <div className="mt-2 p-4 bg-primary-container rounded-lg border border-outline">
          <p className="text-sm text-on-primary-container">
            <strong>✨ GitHub Actions Ready:</strong> This kubeconfig includes
            the necessary permissions for building images with buildx within the
            cluster.
          </p>
        </div>
      </div>

      {/* Kubeconfig Card */}
      <div className="bg-surface border border-outline rounded-lg overflow-hidden">
        <div className="p-6 border-b border-outline">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-on-surface">
                Cluster Configuration
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Service account: github-actions (default namespace)
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="inline-flex items-center px-4 py-2 border border-outline text-sm font-medium rounded-md text-on-surface bg-surface hover:bg-secondary-container hover:text-on-secondary-container transition-colors"
              >
                {copySuccess ? (
                  <>
                    <span className="mr-2">✓</span>
                    Copied!
                  </>
                ) : (
                  <>
                    <span className="mr-2">📋</span>
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors"
              >
                <span className="mr-2">⬇️</span>
                Download
              </button>
            </div>
          </div>
        </div>

        {/* Kubeconfig Content */}
        <div className="p-6">
          <div className="bg-background border border-outline rounded-lg">
            <div className="p-4 border-b border-outline bg-surface">
              <h3 className="text-sm font-medium text-on-surface">
                kubeconfig.yaml
              </h3>
            </div>
            <div className="p-4 overflow-x-auto">
              <pre className="text-sm text-on-background font-mono whitespace-pre-wrap break-all">
                <code>{kubeconfig}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GitHub Actions Usage */}
        <div className="bg-surface border border-outline rounded-lg p-6">
          <h3 className="text-lg font-semibold text-on-surface mb-4">
            GitHub Actions Usage
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-on-surface mb-2">
                1. Add as Repository Secret
              </h4>
              <p className="text-sm text-on-surface-variant">
                Copy the kubeconfig content and add it as a secret named{" "}
                <code className="bg-background px-1 rounded">KUBECONFIG</code>{" "}
                in your repository settings.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-on-surface mb-2">
                2. Use in Workflow
              </h4>
              <div className="bg-background border border-outline rounded p-3">
                <pre className="text-xs text-on-background font-mono">
                  {`- name: Configure kubectl
  run: |
    echo "\${{ secrets.KUBECONFIG }}" > kubeconfig.yaml
    export KUBECONFIG=./kubeconfig.yaml
    kubectl get nodes`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Buildx Usage */}
        <div className="bg-surface border border-outline rounded-lg p-6">
          <h3 className="text-lg font-semibold text-on-surface mb-4">
            Docker Buildx Usage
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-on-surface mb-2">
                Build in Cluster
              </h4>
              <p className="text-sm text-on-surface-variant mb-2">
                Use the kubeconfig to build and push images directly within the
                cluster:
              </p>
              <div className="bg-background border border-outline rounded p-3">
                <pre className="text-xs text-on-background font-mono">
                  {`docker buildx create --driver kubernetes \\
  --driver-opt namespace=default \\
  --name k8s-builder
docker buildx build --builder k8s-builder \\
  -t localhost:5000/myapp:latest --push .`}
                </pre>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-on-surface mb-2">
                In-Cluster Registry
              </h4>
              <p className="text-sm text-on-surface-variant mb-2">
                The Kind testing environment includes an in-cluster container
                registry at{" "}
                <code className="bg-background px-1 rounded">
                  localhost:5000
                </code>{" "}
                for fast image caching and deployment.
              </p>
              <div className="bg-primary-container border border-outline rounded p-3 mt-2">
                <p className="text-xs text-on-primary-container">
                  <strong>💡 Tip:</strong> Images pushed to the in-cluster
                  registry are immediately available for deployment without
                  external network dependencies.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Note */}
      <div className="mt-6 p-4 bg-error-container border border-outline rounded-lg">
        <h3 className="text-sm font-semibold text-on-error-container mb-2">
          🔒 Security Note
        </h3>
        <p className="text-sm text-on-error-container">
          This kubeconfig contains authentication tokens. Keep it secure and
          only share with trusted systems. For production use, consider using
          shorter-lived tokens or OIDC-based authentication.
        </p>
      </div>
    </div>
  );
}
