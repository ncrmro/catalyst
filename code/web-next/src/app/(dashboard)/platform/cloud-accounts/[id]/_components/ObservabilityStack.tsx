"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { PRICING } from "@catalyst/billing";

type StackStatus = "disabled" | "deploying" | "active";

export function ObservabilityStack() {
  const [status, setStatus] = useState<StackStatus>("disabled");
  const [prometheus, setPrometheus] = useState(true);
  const [loki, setLoki] = useState(true);
  const [alertmanager, setAlertmanager] = useState(true);
  const [metricsRetention, setMetricsRetention] = useState("15");
  const [logsRetention, setLogsRetention] = useState("7");

  const handleToggleStack = () => {
    if (status === "disabled") {
      setStatus("deploying");
      setTimeout(() => setStatus("active"), 3000);
    } else {
      setStatus("disabled");
    }
  };

  const statusStyles = {
    disabled: "bg-surface-variant text-on-surface-variant",
    deploying: "bg-warning/10 text-warning",
    active: "bg-primary/10 text-primary",
  } as const;

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-on-surface">
            Observability Stack
          </h3>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}
            >
              {status}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={status !== "disabled"}
                onChange={handleToggleStack}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-variant rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
        </div>

        <p className="text-sm text-on-surface-variant">
          Deploy Prometheus, Grafana, Loki, and Alertmanager to your cluster.
        </p>

        {status === "deploying" && (
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            <p className="text-sm text-on-surface-variant">
              Deploying observability stack...
            </p>
          </div>
        )}

        {(status === "disabled" || status === "active") && (
          <>
            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-on-surface">
                  Prometheus / Grafana
                </span>
                <input
                  type="checkbox"
                  checked={prometheus}
                  onChange={() => setPrometheus(!prometheus)}
                  disabled={status === "disabled"}
                  className="rounded border-outline"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-on-surface">
                  Loki (Log Aggregation)
                </span>
                <input
                  type="checkbox"
                  checked={loki}
                  onChange={() => setLoki(!loki)}
                  disabled={status === "disabled"}
                  className="rounded border-outline"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-on-surface">Alertmanager</span>
                <input
                  type="checkbox"
                  checked={alertmanager}
                  onChange={() => setAlertmanager(!alertmanager)}
                  disabled={status === "disabled"}
                  className="rounded border-outline"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-outline/50">
              <div className="space-y-1.5">
                <label className="text-xs text-on-surface-variant">
                  Metrics Retention (days)
                </label>
                <input
                  type="number"
                  value={metricsRetention}
                  onChange={(e) => setMetricsRetention(e.target.value)}
                  disabled={status === "disabled"}
                  min="1"
                  max="90"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-outline bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-on-surface-variant">
                  Log Retention (days)
                </label>
                <input
                  type="number"
                  value={logsRetention}
                  onChange={(e) => setLogsRetention(e.target.value)}
                  disabled={status === "disabled"}
                  min="1"
                  max="90"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-outline bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>
            </div>

            {status === "active" && (
              <a
                href="#"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                onClick={(e) => e.preventDefault()}
              >
                Open Grafana Dashboard
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            )}
          </>
        )}

        <div className="pt-2 border-t border-outline/50">
          <span className="text-xs text-on-surface-variant">
            ${PRICING.OBSERVABILITY_STACK_MONTHLY}/mo per cluster
          </span>
        </div>
      </div>
    </Card>
  );
}
