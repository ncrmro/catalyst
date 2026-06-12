"use client";

interface ProviderSelectorProps {
  onSelect: (provider: string) => void;
}

const providers = [
  { id: "aws", name: "Amazon Web Services", enabled: true },
  { id: "gcp", name: "Google Cloud Platform", enabled: false },
  { id: "azure", name: "Microsoft Azure", enabled: false },
];

export function ProviderSelector({ onSelect }: ProviderSelectorProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-on-surface">
        Select a cloud provider
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {providers.map((provider) => (
          <button
            key={provider.id}
            disabled={!provider.enabled}
            onClick={() => provider.enabled && onSelect(provider.id)}
            className={`relative p-6 rounded-xl border text-left transition-all ${
              provider.enabled
                ? "border-outline hover:border-primary hover:ring-1 hover:ring-primary cursor-pointer"
                : "border-outline/50 opacity-60 cursor-not-allowed"
            }`}
          >
            <div className="w-10 h-10 bg-surface-variant rounded-lg flex items-center justify-center mb-3">
              <span className="text-xs font-bold text-on-surface-variant">
                {provider.id.toUpperCase()}
              </span>
            </div>
            <p className="text-sm font-medium text-on-surface">
              {provider.name}
            </p>
            {!provider.enabled && (
              <span className="absolute top-3 right-3 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-surface-variant text-on-surface-variant">
                Coming Soon
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
