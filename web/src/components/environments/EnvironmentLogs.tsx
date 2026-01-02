"use client";

import type { PodInfo } from "@catalyst/kubernetes-client";
import { GlassButton } from "@tetrastack/react-glass-components";
import { useCallback, useEffect, useRef, useState } from "react";
import { LogViewer } from "@/components/log-viewer";

interface EnvironmentLogsProps {
	namespace: string;
}

interface LogStreamEvent {
	pod: string;
	container?: string;
	log: string;
	error?: string;
	connected?: boolean;
	pods?: string[];
}

/**
 * EnvironmentLogs - Display logs from pods in a namespace
 *
 * Features:
 * - Pod selector (All pods or specific pod)
 * - Tail lines selector (50/100/500)
 * - Follow mode with SSE streaming
 * - Manual refresh
 */
export function EnvironmentLogs({ namespace }: EnvironmentLogsProps) {
	const [pods, setPods] = useState<PodInfo[]>([]);
	const [selectedPod, setSelectedPod] = useState<string>("all");
	const [tailLines, setTailLines] = useState(100);
	const [logs, setLogs] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [isStreaming, setIsStreaming] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const eventSourceRef = useRef<EventSource | null>(null);
	const logsContainerRef = useRef<HTMLDivElement>(null);

	// Fetch pod list
	const fetchPods = useCallback(async () => {
		try {
			const response = await fetch(
				`/api/k8s?resource=pods&namespace=${encodeURIComponent(namespace)}`,
			);
			if (!response.ok) {
				throw new Error("Failed to fetch pods");
			}
			const data = await response.json();
			setPods(data.pods || []);
		} catch (err) {
			console.error("Error fetching pods:", err);
		}
	}, [namespace]);

	// Fetch logs (one-shot)
	const fetchLogs = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const podParam =
				selectedPod !== "all" ? `&pod=${encodeURIComponent(selectedPod)}` : "";
			const response = await fetch(
				`/api/k8s?resource=logs&namespace=${encodeURIComponent(namespace)}${podParam}&tailLines=${tailLines}`,
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to fetch logs");
			}

			const data = await response.json();
			setLogs(data.logs || "");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
			setLogs("");
		} finally {
			setIsLoading(false);
		}
	}, [namespace, selectedPod, tailLines]);

	// Start streaming logs
	const startStreaming = useCallback(() => {
		// Close existing connection
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
		}

		setIsStreaming(true);
		setError(null);

		const podParam =
			selectedPod !== "all" ? `&pod=${encodeURIComponent(selectedPod)}` : "";
		const url = `/api/k8s?resource=logs:stream&namespace=${encodeURIComponent(namespace)}${podParam}&tailLines=${tailLines}&follow=true`;

		const eventSource = new EventSource(url);
		eventSourceRef.current = eventSource;

		eventSource.onmessage = (event) => {
			try {
				const data: LogStreamEvent = JSON.parse(event.data);

				if (data.error) {
					setError(data.error);
					return;
				}

				if (data.connected) {
					// Connection established
					return;
				}

				if (data.log) {
					setLogs((prev) => {
						const prefix = selectedPod === "all" ? `[${data.pod}] ` : "";
						const newLine = `${prefix}${data.log}`;
						return prev ? `${prev}${newLine}` : newLine;
					});

					// Auto-scroll to bottom
					if (logsContainerRef.current) {
						logsContainerRef.current.scrollTop =
							logsContainerRef.current.scrollHeight;
					}
				}
			} catch {
				console.error("Failed to parse log event");
			}
		};

		eventSource.onerror = () => {
			setIsStreaming(false);
			eventSource.close();
		};
	}, [namespace, selectedPod, tailLines]);

	// Stop streaming
	const stopStreaming = useCallback(() => {
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
			eventSourceRef.current = null;
		}
		setIsStreaming(false);
	}, []);

	// Toggle streaming
	const toggleStreaming = useCallback(() => {
		if (isStreaming) {
			stopStreaming();
		} else {
			setLogs(""); // Clear logs when starting stream
			startStreaming();
		}
	}, [isStreaming, stopStreaming, startStreaming]);

	// Initial load
	useEffect(() => {
		fetchPods();
		fetchLogs();
	}, [fetchPods, fetchLogs]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
			}
		};
	}, []);

	// Stop streaming when pod selection changes
	useEffect(() => {
		if (isStreaming) {
			stopStreaming();
		}
	}, [stopStreaming, isStreaming]);

	return (
		<div className="space-y-4">
			{/* Controls */}
			<div className="flex flex-wrap items-center gap-3">
				{/* Pod selector */}
				<div className="flex items-center gap-2">
					<label
						htmlFor="pod-select"
						className="text-sm text-on-surface-variant"
					>
						Pod:
					</label>
					<select
						id="pod-select"
						value={selectedPod}
						onChange={(e) => setSelectedPod(e.target.value)}
						className="bg-surface-container text-on-surface text-sm rounded px-2 py-1 border border-outline/30"
						disabled={isStreaming}
					>
						<option value="all">All pods</option>
						{pods.map((pod) => (
							<option key={pod.name} value={pod.name}>
								{pod.name}
							</option>
						))}
					</select>
				</div>

				{/* Tail lines selector */}
				<div className="flex items-center gap-2">
					<label
						htmlFor="tail-select"
						className="text-sm text-on-surface-variant"
					>
						Lines:
					</label>
					<select
						id="tail-select"
						value={tailLines}
						onChange={(e) => setTailLines(parseInt(e.target.value, 10))}
						className="bg-surface-container text-on-surface text-sm rounded px-2 py-1 border border-outline/30"
						disabled={isStreaming}
					>
						<option value={50}>50</option>
						<option value={100}>100</option>
						<option value={500}>500</option>
					</select>
				</div>

				{/* Action buttons */}
				<div className="flex items-center gap-2 ml-auto">
					<GlassButton
						size="small"
						onClick={fetchLogs}
						disabled={isLoading || isStreaming}
					>
						{isLoading ? "Loading..." : "Refresh"}
					</GlassButton>

					<GlassButton
						size="small"
						variant={isStreaming ? "error" : "primary"}
						onClick={toggleStreaming}
					>
						{isStreaming ? "Stop" : "Follow"}
					</GlassButton>
				</div>
			</div>

			{/* Error display */}
			{error && (
				<div className="bg-error-container text-on-error-container rounded p-3 text-sm">
					{error}
				</div>
			)}

			{/* Logs display */}
			<div ref={logsContainerRef}>
				{isLoading && !logs ? (
					<div className="flex items-center justify-center py-12">
						<div className="text-on-surface-variant">Loading logs...</div>
					</div>
				) : logs ? (
					<LogViewer logs={logs} maxHeight="max-h-96" showLineNumbers />
				) : (
					<div className="flex items-center justify-center py-12 bg-surface-container rounded">
						<div className="text-on-surface-variant">
							{pods.length === 0
								? "No pods found in this namespace"
								: "No logs available"}
						</div>
					</div>
				)}
			</div>

			{/* Streaming indicator */}
			{isStreaming && (
				<div className="flex items-center gap-2 text-sm text-on-surface-variant">
					<span className="relative flex h-2 w-2">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
						<span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
					</span>
					Streaming logs...
				</div>
			)}
		</div>
	);
}
