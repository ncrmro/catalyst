import { GlassCard } from "@tetrastack/react-glass-components";

export interface Alert {
  id: string;
  name: string;
  severity: "critical" | "warning" | "info";
  status: "firing" | "resolved";
  startsAt: Date;
  endsAt?: Date;
  summary: string;
  labels: Record<string, string>;
}

export interface AlertListProps {
  alerts: Alert[];
  onAlertClick?: (alertId: string) => void;
}

export function AlertList({ alerts, onAlertClick }: AlertListProps) {
  const getSeverityStyles = (severity: Alert["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-error/10 text-error border-error/20";
      case "warning":
        return "bg-warning/10 text-warning border-warning/20";
      case "info":
        return "bg-blue-400/10 text-blue-400 border-blue-400/20";
    }
  };

  const getStatusIcon = (status: Alert["status"]) => {
    if (status === "firing") {
      return (
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-error"></span>
        </div>
      );
    }
    return <div className="h-3 w-3 rounded-full bg-success"></div>;
  };

  if (alerts.length === 0) {
    return (
      <GlassCard className="text-center py-8">
        <svg
          className="w-12 h-12 mx-auto text-success/50 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-lg font-medium text-on-surface">
          No Active Alerts
        </h3>
        <p className="text-on-surface-variant">System is operating normally.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <GlassCard
          key={alert.id}
          className={`group transition-all hover:bg-white/5 border-l-4 ${
            alert.severity === "critical"
              ? "border-l-error"
              : alert.severity === "warning"
                ? "border-l-warning"
                : "border-l-blue-400"
          }`}
          onClick={() => onAlertClick?.(alert.id)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                {getStatusIcon(alert.status)}
                <h4 className="font-semibold text-on-surface truncate">
                  {alert.name}
                </h4>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getSeverityStyles(
                    alert.severity,
                  )}`}
                >
                  {alert.severity}
                </span>
              </div>
              <p className="text-sm text-on-surface-variant mb-3">
                {alert.summary}
              </p>

              <div className="flex flex-wrap gap-2">
                {Object.entries(alert.labels).map(([key, value]) => (
                  <span
                    key={key}
                    className="text-xs font-mono bg-surface-variant/50 text-on-surface-variant px-1.5 py-0.5 rounded"
                  >
                    {key}={value}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-xs text-on-surface-variant whitespace-nowrap text-right">
              <div>Started: {alert.startsAt.toLocaleTimeString()}</div>
              {alert.endsAt && (
                <div>Resolved: {alert.endsAt.toLocaleTimeString()}</div>
              )}
              {alert.status === "firing" && (
                <div className="text-error font-medium mt-1">
                  Active for{" "}
                  {Math.round((Date.now() - alert.startsAt.getTime()) / 60000)}m
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
