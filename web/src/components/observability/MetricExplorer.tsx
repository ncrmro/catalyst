import { GlassCard } from "@tetrastack/react-glass-components";

export interface QueryResult {
	metric: Record<string, string>;
	values: [number, string][]; // [timestamp, value]
}

export interface MetricExplorerProps {
	initialQuery?: string;
	onRunQuery?: (query: string) => void;
	results?: QueryResult[];
	isLoading?: boolean;
}

export function MetricExplorer({
	initialQuery = "",
	onRunQuery,
	results,
	isLoading,
}: MetricExplorerProps) {
	return (
		<GlassCard className="h-full flex flex-col">
			<div className="flex gap-4 mb-6">
				<div className="flex-1 relative">
					<input
						type="text"
						defaultValue={initialQuery}
						placeholder="Enter PromQL query (e.g. rate(http_requests_total[5m]))"
						className="w-full bg-surface-variant/20 border border-outline/30 rounded-lg px-4 py-2 text-on-surface font-mono text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								onRunQuery?.(e.currentTarget.value);
							}
						}}
					/>
					<div className="absolute right-3 top-2.5 text-xs text-on-surface-variant font-mono">
						PromQL
					</div>
				</div>
				<button
					className="bg-primary text-on-primary px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
					disabled={isLoading}
					onClick={(e) => {
						const input =
							e.currentTarget.previousElementSibling?.querySelector("input");
						if (input) onRunQuery?.(input.value);
					}}
				>
					{isLoading ? "Running..." : "Run Query"}
				</button>
			</div>

			<div className="flex-1 min-h-[300px] bg-surface-variant/10 rounded-lg border border-outline/30 p-4 relative overflow-hidden">
				{results && results.length > 0 ? (
					<div className="absolute inset-0 p-4 overflow-auto">
						{/* Mock Chart Area */}
						<div className="w-full h-full flex items-end justify-between gap-1 pb-6">
							{Array.from({ length: 40 }).map((_, i) => (
								<div
									key={i}
									className="bg-primary/50 hover:bg-primary/70 transition-colors w-full rounded-t"
									style={{
										height: `${20 + Math.random() * 60}%`,
									}}
								/>
							))}
						</div>

						{/* Legend Overlay */}
						<div className="absolute bottom-0 left-0 right-0 bg-surface/90 backdrop-blur border-t border-outline/30 p-2 text-xs font-mono max-h-32 overflow-y-auto">
							{results.map((res, i) => (
								<div key={i} className="flex items-center gap-2 mb-1">
									<div className="w-3 h-3 bg-primary/50 rounded-sm"></div>
									<span className="text-on-surface-variant">
										{Object.entries(res.metric)
											.map(([k, v]) => `${k}="${v}"`)
											.join(", ")}
									</span>
								</div>
							))}
						</div>
					</div>
				) : (
					<div className="absolute inset-0 flex items-center justify-center text-on-surface-variant/50">
						{isLoading ? (
							<div className="flex flex-col items-center gap-3">
								<div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
								<span>Executing query...</span>
							</div>
						) : (
							<div className="flex flex-col items-center gap-2">
								<svg
									className="w-10 h-10 mb-2"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
									/>
								</svg>
								<span>No data to display</span>
							</div>
						)}
					</div>
				)}
			</div>
		</GlassCard>
	);
}
