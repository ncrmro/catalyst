'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function GitHubAppRedirect() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const redirectToGitHubApp = async () => {
      try {
        // Get state from URL parameters or use default
        const state = searchParams.get('state') || 'default';
        
        // Fetch the installation URL from our API
        const response = await fetch(`/api/github/register?state=${encodeURIComponent(state)}`);
        const data = await response.json();
        
        if (data.success && data.installation_url) {
          // Redirect to GitHub App installation
          window.location.href = data.installation_url;
        } else {
          console.error('Failed to get installation URL:', data);
          // Fallback to error display if needed
        }
      } catch (error) {
        console.error('GitHub App redirect error:', error);
      }
    };

    redirectToGitHubApp();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">GitHub App Installation</h1>
          <p className="mt-4 text-lg text-gray-600">
            Redirecting you to install the GitHub App...
          </p>
          <div className="mt-8">
            <div className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Preparing installation...
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            If you are not redirected automatically, 
            <a href="/api/github/register" className="text-blue-600 hover:text-blue-800 font-medium"> click here</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function GitHubAppPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">GitHub App Installation</h1>
            <p className="mt-4 text-lg text-gray-600">
              Loading...
            </p>
          </div>
        </div>
      </div>
    }>
      <GitHubAppRedirect />
    </Suspense>
  );
}