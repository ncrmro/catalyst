"use client";

import type { ITerminalInitOnlyOptions, ITerminalOptions } from "@xterm/xterm";
import { useEffect, useMemo, useRef, useState } from "react";
import { useXTerm } from "react-xtermjs";

/**
 * Props for the Terminal component
 */
export interface TerminalProps {
	/** Namespace of the pod */
	namespace: string;
	/** Name of the pod */
	podName: string;
	/** Container name (optional) */
	containerName?: string;
	/** Execute command callback */
	onExec: (command: string) => Promise<{ stdout: string; stderr: string }>;
	/** Close callback */
	onClose?: () => void;
	/** CSS class for the container */
	className?: string;
}

/**
 * Terminal component using react-xtermjs
 *
 * Note: Due to Next.js 15 not supporting WebSocket route handlers,
 * this terminal uses a request/response model via server actions
 * rather than a true interactive shell.
 */
export function Terminal({
	namespace,
	podName,
	containerName,
	onExec,
	onClose,
	className = "",
}: TerminalProps) {
	const [isLoading, setIsLoading] = useState(false);
	const commandBufferRef = useRef("");
	const promptRef = useRef(`${namespace}/${podName}$ `);
	const isLoadingRef = useRef(false);
	const onExecRef = useRef(onExec);
	const onCloseRef = useRef(onClose);
	const instanceRef = useRef<ReturnType<typeof useXTerm>["instance"]>(null);

	// Keep refs in sync with props
	useEffect(() => {
		onExecRef.current = onExec;
		onCloseRef.current = onClose;
	}, [onExec, onClose]);

	// Terminal configuration - memoized to prevent re-renders
	const options = useMemo<ITerminalOptions & ITerminalInitOnlyOptions>(
		() => ({
			cursorBlink: true,
			fontSize: 14,
			fontFamily: 'Menlo, Monaco, "Courier New", monospace',
			theme: {
				background: "#1e1e1e",
				foreground: "#d4d4d4",
				cursor: "#aeafad",
				selectionBackground: "#264f78",
			},
			rows: 24,
			cols: 80,
		}),
		[],
	);

	// Command execution - uses refs to avoid stale closures
	const executeCommand = async (command: string) => {
		const inst = instanceRef.current;
		if (!inst || isLoadingRef.current) return;

		isLoadingRef.current = true;
		setIsLoading(true);

		try {
			const result = await onExecRef.current(command);

			if (result.stdout) {
				result.stdout.split("\n").forEach((line) => {
					inst.writeln(line);
				});
			}

			if (result.stderr) {
				inst.writeln(`\x1b[31m${result.stderr}\x1b[0m`);
			}
		} catch (error) {
			inst.writeln(
				`\x1b[31mError: ${error instanceof Error ? error.message : "Command failed"}\x1b[0m`,
			);
		} finally {
			isLoadingRef.current = false;
			setIsLoading(false);
			inst.write(promptRef.current);
		}
	};

	// Memoized listeners to prevent re-renders
	const listeners = useMemo(
		() => ({
			onData: (data: string) => {
				const inst = instanceRef.current;
				if (!inst) return;

				const charCode = data.charCodeAt(0);

				if (charCode === 13) {
					// Enter
					inst.writeln("");
					if (commandBufferRef.current.trim()) {
						executeCommand(commandBufferRef.current.trim());
					} else {
						inst.write(promptRef.current);
					}
					commandBufferRef.current = "";
				} else if (charCode === 127 || charCode === 8) {
					// Backspace
					if (commandBufferRef.current.length > 0) {
						commandBufferRef.current = commandBufferRef.current.slice(0, -1);
						inst.write("\b \b");
					}
				} else if (charCode === 3) {
					// Ctrl+C
					inst.writeln("^C");
					commandBufferRef.current = "";
					inst.write(promptRef.current);
				} else if (charCode === 4) {
					// Ctrl+D
					onCloseRef.current?.();
				} else if (charCode >= 32) {
					// Printable
					commandBufferRef.current += data;
					inst.write(data);
				}
			},
		}),
		[executeCommand], // Empty deps - uses refs for all mutable values
	);

	// Use the xterm hook with memoized options and listeners
	const { ref, instance } = useXTerm({
		options,
		listeners,
	});

	// Keep instance ref in sync
	useEffect(() => {
		instanceRef.current = instance;
	}, [instance]);

	// Write welcome message when terminal is ready
	useEffect(() => {
		if (!instance) return;

		// Small delay to ensure terminal is fully initialized
		const timer = setTimeout(() => {
			// Write welcome message
			instance.writeln(
				`\x1b[32mConnected to ${namespace}/${podName}${containerName ? ` (${containerName})` : ""}\x1b[0m`,
			);
			instance.writeln(
				"\x1b[33mNote: This is a command-by-command terminal. Type a command and press Enter.\x1b[0m",
			);
			instance.writeln("");
			instance.write(promptRef.current);
		}, 100);

		return () => clearTimeout(timer);
	}, [instance, namespace, podName, containerName]);

	return (
		<div className={`relative ${className}`}>
			<div
				ref={ref}
				className="h-full w-full min-h-[400px] bg-[#1e1e1e] rounded-lg overflow-hidden"
			/>
			{isLoading && (
				<div className="absolute top-2 right-2 px-2 py-1 bg-yellow-600 text-white text-xs rounded">
					Running...
				</div>
			)}
		</div>
	);
}

/**
 * Terminal modal component
 */
export interface TerminalModalProps extends Omit<TerminalProps, "className"> {
	isOpen: boolean;
	onClose: () => void;
}

export function TerminalModal({
	isOpen,
	onClose,
	...terminalProps
}: TerminalModalProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
			/>

			{/* Modal content */}
			<div className="relative z-10 w-full max-w-4xl mx-4">
				<div className="bg-surface rounded-lg shadow-xl border border-outline/50 overflow-hidden">
					{/* Header */}
					<div className="flex items-center justify-between px-4 py-2 bg-surface-variant border-b border-outline/50">
						<h3 className="text-sm font-medium text-on-surface">
							Terminal - {terminalProps.namespace}/{terminalProps.podName}
							{terminalProps.containerName
								? ` (${terminalProps.containerName})`
								: ""}
						</h3>
						<button
							onClick={onClose}
							className="p-1 hover:bg-surface rounded transition-colors"
						>
							<svg
								className="w-5 h-5 text-on-surface-variant"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					{/* Terminal */}
					<Terminal
						{...terminalProps}
						onClose={onClose}
						className="h-[500px]"
					/>
				</div>
			</div>
		</div>
	);
}
