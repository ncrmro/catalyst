'use client';

import { useState } from 'react';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  owner: {
    login: string;
    type: 'User' | 'Organization';
    avatar_url: string;
  };
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
}

interface DeploymentEnvironment {
  name: string;
  dockerfilePath: string;
  dockerBakeFile: string;
  kubernetesManifest: string;
  helmChart: string;
  deploymentType: 'kubernetes' | 'helm' | 'none';
}

interface DeploymentConfig {
  production: DeploymentEnvironment;
  staging: DeploymentEnvironment;
  preview: DeploymentEnvironment;
}

interface DeploymentConfigFormProps {
  repo: GitHubRepo;
}

const defaultEnvironment: DeploymentEnvironment = {
  name: '',
  dockerfilePath: './Dockerfile',
  dockerBakeFile: '',
  kubernetesManifest: '',
  helmChart: '',
  deploymentType: 'none'
};

export function DeploymentConfigForm({ }: DeploymentConfigFormProps) {
  const [config, setConfig] = useState<DeploymentConfig>({
    production: { ...defaultEnvironment, name: 'production' },
    staging: { ...defaultEnvironment, name: 'staging' },
    preview: { ...defaultEnvironment, name: 'preview' }
  });
  
  const [activeTab, setActiveTab] = useState<keyof DeploymentConfig>('production');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const updateEnvironment = (env: keyof DeploymentConfig, field: keyof DeploymentEnvironment, value: string) => {
    setConfig(prev => ({
      ...prev,
      [env]: {
        ...prev[env],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // In a real implementation, this would call an API to save the configuration
      console.log('Saving deployment config:', config);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving config:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentEnv = config[activeTab];

  return (
    <div className="bg-surface border border-outline rounded-lg">
      {/* Environment Tabs */}
      <div className="border-b border-outline">
        <nav className="flex space-x-8 px-6 py-4">
          {(['production', 'staging', 'preview'] as const).map((env) => (
            <button
              key={env}
              onClick={() => setActiveTab(env)}
              className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === env
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline'
              }`}
            >
              {env.charAt(0).toUpperCase() + env.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Docker Configuration */}
        <div>
          <h3 className="text-lg font-semibold text-on-surface mb-4">Docker Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dockerfile" className="block text-sm font-medium text-on-surface mb-2">
                Dockerfile Path
              </label>
              <input
                type="text"
                id="dockerfile"
                value={currentEnv.dockerfilePath}
                onChange={(e) => updateEnvironment(activeTab, 'dockerfilePath', e.target.value)}
                placeholder="./Dockerfile"
                className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-on-surface-variant mt-1">
                Path to the Dockerfile relative to repository root
              </p>
            </div>
            <div>
              <label htmlFor="dockerBake" className="block text-sm font-medium text-on-surface mb-2">
                Docker Bake File
              </label>
              <input
                type="text"
                id="dockerBake"
                value={currentEnv.dockerBakeFile}
                onChange={(e) => updateEnvironment(activeTab, 'dockerBakeFile', e.target.value)}
                placeholder="docker-bake.hcl (optional)"
                className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-on-surface-variant mt-1">
                Optional Docker Bake file for advanced builds
              </p>
            </div>
          </div>
        </div>

        {/* Deployment Type */}
        <div>
          <h3 className="text-lg font-semibold text-on-surface mb-4">Deployment Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-2">
                Deployment Type
              </label>
              <div className="flex space-x-4">
                {(['none', 'kubernetes', 'helm'] as const).map((type) => (
                  <label key={type} className="flex items-center">
                    <input
                      type="radio"
                      name="deploymentType"
                      value={type}
                      checked={currentEnv.deploymentType === type}
                      onChange={(e) => updateEnvironment(activeTab, 'deploymentType', e.target.value as 'kubernetes' | 'helm' | 'none')}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 mr-2 ${
                      currentEnv.deploymentType === type
                        ? 'border-primary bg-primary'
                        : 'border-outline'
                    }`}>
                      {currentEnv.deploymentType === type && (
                        <div className="w-2 h-2 bg-on-primary rounded-full m-0.5"></div>
                      )}
                    </div>
                    <span className="text-sm text-on-surface">
                      {type === 'none' ? 'No deployment' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Kubernetes Manifest */}
            {currentEnv.deploymentType === 'kubernetes' && (
              <div>
                <label htmlFor="kubernetesManifest" className="block text-sm font-medium text-on-surface mb-2">
                  Kubernetes Manifest Path
                </label>
                <input
                  type="text"
                  id="kubernetesManifest"
                  value={currentEnv.kubernetesManifest}
                  onChange={(e) => updateEnvironment(activeTab, 'kubernetesManifest', e.target.value)}
                  placeholder="k8s/deployment.yaml"
                  className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <p className="text-xs text-on-surface-variant mt-1">
                  Path to Kubernetes deployment manifest files
                </p>
              </div>
            )}

            {/* Helm Chart */}
            {currentEnv.deploymentType === 'helm' && (
              <div>
                <label htmlFor="helmChart" className="block text-sm font-medium text-on-surface mb-2">
                  Helm Chart Path
                </label>
                <input
                  type="text"
                  id="helmChart"
                  value={currentEnv.helmChart}
                  onChange={(e) => updateEnvironment(activeTab, 'helmChart', e.target.value)}
                  placeholder="charts/app"
                  className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <p className="text-xs text-on-surface-variant mt-1">
                  Path to Helm chart directory
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Environment-specific Information */}
        <div className="bg-primary-container border border-outline rounded-lg p-4">
          <h4 className="text-sm font-medium text-on-primary-container mb-2">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Environment
          </h4>
          <div className="text-xs text-on-primary-container space-y-1">
            {activeTab === 'production' && (
              <>
                <p>• Production deployments are triggered on pushes to main branch</p>
                <p>• Uses production secrets and environment variables</p>
                <p>• Requires manual approval for deployment</p>
              </>
            )}
            {activeTab === 'staging' && (
              <>
                <p>• Staging deployments are triggered on pushes to develop branch</p>
                <p>• Uses staging secrets and environment variables</p>
                <p>• Automatically deployed for testing</p>
              </>
            )}
            {activeTab === 'preview' && (
              <>
                <p>• Preview deployments are created for pull requests</p>
                <p>• Uses preview secrets and environment variables</p>
                <p>• Automatically cleaned up when PR is closed</p>
              </>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4 border-t border-outline">
          <div className="flex items-center space-x-2">
            {saveSuccess && (
              <div className="flex items-center text-sm text-green-600">
                <span className="mr-2">✓</span>
                Configuration saved successfully
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2 rounded-md font-medium text-sm transition-colors ${
              isSubmitting
                ? 'bg-outline text-on-surface-variant cursor-not-allowed'
                : 'bg-primary text-on-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>

      {/* Configuration Preview */}
      <div className="border-t border-outline p-6 bg-background">
        <h3 className="text-lg font-semibold text-on-background mb-4">Configuration Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['production', 'staging', 'preview'] as const).map((env) => (
            <div key={env} className="bg-surface border border-outline rounded-lg p-4">
              <h4 className="font-medium text-on-surface mb-2 capitalize">{env}</h4>
              <div className="text-xs text-on-surface-variant space-y-1">
                <p>Dockerfile: {config[env].dockerfilePath || 'Not set'}</p>
                <p>Deployment: {config[env].deploymentType}</p>
                {config[env].deploymentType === 'kubernetes' && config[env].kubernetesManifest && (
                  <p>Manifest: {config[env].kubernetesManifest}</p>
                )}
                {config[env].deploymentType === 'helm' && config[env].helmChart && (
                  <p>Helm Chart: {config[env].helmChart}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}