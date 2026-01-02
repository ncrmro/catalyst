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

export default function KubeconfigCore() {
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
		<div data-testid="kubeconfig-core">
			<h1>Kubernetes Configurations</h1>
			<p>
				Export kubeconfig for use in GitHub Actions, local development, or CI/CD
				pipelines
			</p>

			<div>
				<button onClick={handleCopy} data-testid="copy-button">
					{copySuccess ? (
						<>
							<span>✓</span>
							Copied!
						</>
					) : (
						<>
							<span>📋</span>
							Copy
						</>
					)}
				</button>
				<button onClick={handleDownload} data-testid="download-button">
					<span>⬇️</span>
					Download
				</button>
			</div>

			<pre data-testid="kubeconfig-content">
				<code>{kubeconfig}</code>
			</pre>
		</div>
	);
}
