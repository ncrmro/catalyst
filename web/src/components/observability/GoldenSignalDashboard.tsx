import { GlassCard } from "@tetrastack/react-glass-components";

export type SignalType = "latency" | "traffic" | "errors" | "saturation";

export interface SignalMetric {
	timestamp: number;
	value: number;
}

export interface GoldenSignal {
	type: SignalType;
	currentValue: number;
	unit: string;
	status: "healthy" | "warning" | "critical";
	trend: "up" | "down" | "flat";
	history: SignalMetric[];
}

export interface GoldenSignalDashboardProps {
	signals: GoldenSignal[];
}

export function GoldenSignalDashboard({ signals }: GoldenSignalDashboardProps) {
	const getSignalConfig = (type: SignalType) => {
		switch (type) {
			case "latency":
				return {
					label: "Latency (p99)",
					color: "text-blue-400",
					bg: "bg-blue-400/10",
				};
			case "traffic":
				return {
					label: "Traffic",
					color: "text-green-400",
					bg: "bg-green-400/10",
				};
			case "errors":
				return {
					label: "Error Rate",
					color: "text-red-400",
					bg: "bg-red-400/10",
				};
			case "saturation":
				return {
					label: "Saturation",
					color: "text-orange-400",
					bg: "bg-orange-400/10",
				};
		}
	};

	const getStatusColor = (status: GoldenSignal["status"]) => {
		switch (status) {
			case "healthy":
				return "text-success";
			case "warning":
				return "text-warning";
			case "critical":
				return "text-error";
		}
	};

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			{signals.map((signal) => {
				const config = getSignalConfig(signal.type);
				return (
					<GlassCard
						key={signal.type}
						className="flex flex-col h-32 justify-between"
					>
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-on-surface-variant uppercase tracking-wider">
								{config.label}
							</span>
							<span
								className={`text-xs font-bold uppercase ${getStatusColor(signal.status)}`}
							>
								{signal.status}
							</span>
						</div>

						<div className="flex items-end gap-2">
							<span className="text-3xl font-bold text-on-surface">
								{signal.currentValue.toLocaleString()}
							</span>
							<span className="text-sm text-on-surface-variant mb-1">
								{signal.unit}
							</span>
						</div>

						{/* Sparkline Placeholder */}
						<div className="h-8 w-full bg-white/5 rounded mt-2 flex items-end gap-[2px] overflow-hidden opacity-50">
							{signal.history.map((pt, i) => (
								<div
									key={i}
									className={`flex-1 ${config.bg.replace("/10", "/30")}`}
									style={{
										height: `${Math.min(100, (pt.value / Math.max(...signal.history.map((h) => h.value))) * 100)}%`,
									}}
								/>
							))}
						</div>
					</GlassCard>
				);
			})}
		</div>
	);
}
