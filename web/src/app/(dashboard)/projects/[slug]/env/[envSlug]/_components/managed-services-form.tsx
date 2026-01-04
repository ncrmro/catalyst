"use client";

import { cn } from "@/lib/utils";
import type { ManagedServices } from "@/types/environment-config";

interface ManagedServicesFormProps {
  config: ManagedServices;
  onChange: (updates: Partial<ManagedServices>) => void;
}

export function ManagedServicesForm({
  config,
  onChange,
}: ManagedServicesFormProps) {
  const toggleService = (
    service: "postgres" | "redis" | "opensearch",
    enabled: boolean,
  ) => {
    onChange({
      [service]: { enabled },
    });
  };

  return (
    <div className="space-y-4">
      {/* Postgres */}
      <div
        className={cn(
          "rounded-lg border p-4",
          config.postgres?.enabled
            ? "border-primary/50 bg-primary/5"
            : "border-input",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-on-surface">PostgreSQL</span>
            <span className="text-xs bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded">
              Database
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={config.postgres?.enabled || false}
              onChange={(e) => toggleService("postgres", e.target.checked)}
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Provision a managed PostgreSQL database for this environment
        </p>
      </div>

      {/* Redis */}
      <div
        className={cn(
          "rounded-lg border p-4",
          config.redis?.enabled
            ? "border-primary/50 bg-primary/5"
            : "border-input",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-on-surface">Redis</span>
            <span className="text-xs bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded">
              Cache
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={config.redis?.enabled || false}
              onChange={(e) => toggleService("redis", e.target.checked)}
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Provision a managed Redis cache for this environment
        </p>
      </div>

      {/* OpenSearch */}
      <div
        className={cn(
          "rounded-lg border p-4",
          config.opensearch?.enabled
            ? "border-primary/50 bg-primary/5"
            : "border-input",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-on-surface">OpenSearch</span>
            <span className="text-xs bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded">
              Search
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={config.opensearch?.enabled || false}
              onChange={(e) => toggleService("opensearch", e.target.checked)}
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Provision a managed OpenSearch cluster for this environment
        </p>
      </div>
    </div>
  );
}
