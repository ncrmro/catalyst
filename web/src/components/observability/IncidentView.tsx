import { GlassCard } from "@tetrastack/react-glass-components";
import { AlertList, type Alert } from "./AlertList";

export interface LogEntry {
  timestamp: Date;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  service: string;
}

export interface MetricSnapshot {
  name: string;
  values: { time: number; value: number }[];
  unit: string;
}

export interface IncidentViewProps {
  incidentId: string;
  relatedAlerts: Alert[];
  logs: LogEntry[];
  metrics: MetricSnapshot[];
}

export function IncidentView({ incidentId, relatedAlerts, logs, metrics }: IncidentViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Related Alerts Column */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-semibold text-on-surface">Related Alerts</h3>
          <AlertList alerts={relatedAlerts} />
        </div>

        {/* Investigation Context Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Correlated Metrics */}
          <GlassCard>
            <h3 className="text-lg font-semibold text-on-surface mb-4">Correlated Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metrics.map((metric) => (
                <div key={metric.name} className="p-4 bg-surface-variant/20 rounded-lg">
                  <div className="text-sm font-medium text-on-surface-variant mb-2">{metric.name}</div>
                  <div className="h-24 flex items-end gap-[1px]">
                    {metric.values.map((v, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-primary/40 hover:bg-primary/60 transition-colors rounded-t-sm"
                        style={{
                          height: `${(v.value / Math.max(...metric.values.map((m) => m.value))) * 100}%`,
                        }}
                        title={`${new Date(v.time).toLocaleTimeString()}: ${v.value}${metric.unit}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Correlated Logs */}
          <GlassCard>
            <h3 className="text-lg font-semibold text-on-surface mb-4">Contextual Logs</h3>
            <div className="font-mono text-sm space-y-1 max-h-[400px] overflow-y-auto pr-2">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={`p-2 rounded flex gap-3 ${
                    log.level === "error"
                      ? "bg-error/10 text-error-content"
                      : log.level === "warn"
                        ? "bg-warning/10 text-warning-content"
                        : "bg-surface-variant/20 text-on-surface-variant"
                  }`}
                >
                  <span className="shrink-0 opacity-70">{log.timestamp.toLocaleTimeString()}</span>
                  <span
                    className={`shrink-0 w-16 uppercase font-bold text-[10px] py-0.5 text-center rounded ${
                      log.level === "error"
                        ? "bg-error/20"
                        : log.level === "warn"
                          ? "bg-warning/20"
                          : "bg-surface/30"
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
