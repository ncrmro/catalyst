"use client";

import { cn } from "@/lib/utils";
import type { ManagedServicesConfig } from "@/types/project-config";

interface ManagedServicesFormProps {
  config: ManagedServicesConfig;
  onChange: (updates: Partial<ManagedServicesConfig>) => void;
}

export function ManagedServicesForm({
  config,
  onChange,
}: ManagedServicesFormProps) {
  const toggleService = (service: "postgres" | "redis", enabled: boolean) => {
    const currentServiceConfig =
      config[service] ||
      (service === "postgres"
        ? { version: "16", storageSize: "1Gi", database: "app", enabled: false }
        : { version: "7", storageSize: "256Mi", enabled: false });

    onChange({
      [service]: {
        ...currentServiceConfig,
        enabled,
      },
    });
  };

  const updateServiceConfig = (
    service: "postgres" | "redis",
    key: string,
    value: string,
  ) => {
    if (!config[service]) return;

    onChange({
      [service]: {
        ...config[service]!,
        [key]: value,
      },
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
        <div className="flex items-center justify-between mb-4">
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

        {config.postgres?.enabled && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Version
              </label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={config.postgres.version}
                onChange={(e) =>
                  updateServiceConfig("postgres", "version", e.target.value)
                }
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Storage
              </label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={config.postgres.storageSize}
                onChange={(e) =>
                  updateServiceConfig("postgres", "storageSize", e.target.value)
                }
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Database Name
              </label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={config.postgres.database}
                onChange={(e) =>
                  updateServiceConfig("postgres", "database", e.target.value)
                }
              />
            </div>
          </div>
        )}
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
        <div className="flex items-center justify-between mb-4">
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

        {config.redis?.enabled && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Version
              </label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={config.redis.version}
                onChange={(e) =>
                  updateServiceConfig("redis", "version", e.target.value)
                }
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Storage
              </label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={config.redis.storageSize}
                onChange={(e) =>
                  updateServiceConfig("redis", "storageSize", e.target.value)
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
