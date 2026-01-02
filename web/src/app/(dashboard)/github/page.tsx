"use client";

import { useState } from "react";

export default function GitHubAppPage() {
  const [state, setState] = useState("");
  const [registrationData, setRegistrationData] = useState<{
    success: boolean;
    message: string;
    installation_url?: string;
    state?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/github/register?state=${encodeURIComponent(state || "default")}`,
      );
      const data = await response.json();
      setRegistrationData(data);
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            GitHub App Integration
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Set up and manage your GitHub App installation
          </p>
        </div>

        <div className="mt-12 bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Install GitHub App
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="state"
                  className="block text-sm font-medium text-gray-700"
                >
                  State Parameter (Optional)
                </label>
                <input
                  type="text"
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Enter a state value for tracking"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleRegister}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading
                  ? "Initiating..."
                  : "Initiate GitHub App Installation"}
              </button>
            </div>

            {registrationData && (
              <div className="mt-6 p-4 bg-gray-50 rounded-md">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Registration Response:
                </h3>
                <pre className="text-xs text-gray-600 overflow-x-auto">
                  {JSON.stringify(registrationData, null, 2)}
                </pre>

                {registrationData.success &&
                  registrationData.installation_url && (
                    <div className="mt-4">
                      <a
                        href={registrationData.installation_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      >
                        Continue to GitHub Installation →
                      </a>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              API Endpoints
            </h2>

            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  Registration Endpoint
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    GET /api/github/register
                  </code>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Initiates GitHub App installation process
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  Webhook Endpoint
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    POST /api/github/webhook
                  </code>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Receives GitHub webhook events
                </p>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  Callback Endpoint
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    GET /api/github/callback
                  </code>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Handles OAuth callbacks after app installation
                </p>
              </div>
            </div>

            <div className="mt-6">
              <a
                href="/docs/github-app-setup.md"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View complete setup documentation →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
