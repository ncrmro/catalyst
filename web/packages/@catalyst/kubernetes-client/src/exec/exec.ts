/**
 * Pod exec operations
 *
 * Execute commands in pod containers.
 */

import type { Writable } from "node:stream";

import type { KubeConfig } from "../config";
import { ExecError, KubernetesError } from "../errors";
import { loadKubernetesClient } from "../loader";

/**
 * Options for executing a command in a pod
 */
export interface ExecOptions {
	/** Namespace of the pod */
	namespace: string;
	/** Name of the pod */
	pod: string;
	/** Container name (required if pod has multiple containers) */
	container?: string;
	/** Command to execute (as array) */
	command: string[];
	/** Enable stdin */
	stdin?: boolean;
	/** Enable stdout */
	stdout?: boolean;
	/** Enable stderr */
	stderr?: boolean;
	/** Allocate a TTY */
	tty?: boolean;
}

/**
 * Result of a command execution
 */
export interface ExecResult {
	/** Exit code of the command */
	exitCode: number;
	/** Standard output */
	stdout: string;
	/** Standard error */
	stderr: string;
}

/**
 * Execute a command in a pod and wait for completion
 */
export async function exec(
	kubeConfig: KubeConfig,
	options: ExecOptions,
): Promise<ExecResult> {
	const k8s = await loadKubernetesClient();
	const execClient = new k8s.Exec(kubeConfig.getRawConfig());

	const {
		namespace,
		pod,
		container,
		command,
		stdin = false,
		stdout = true,
		stderr = true,
		tty = false,
	} = options;

	let stdoutData = "";
	let stderrData = "";
	let exitCode = 0;

	// Create writable streams to collect output
	const stdoutStream: Writable = {
		write(chunk: Buffer | string): boolean {
			stdoutData += typeof chunk === "string" ? chunk : chunk.toString();
			return true;
		},
		end(): void {},
	} as Writable;

	const stderrStream: Writable = {
		write(chunk: Buffer | string): boolean {
			stderrData += typeof chunk === "string" ? chunk : chunk.toString();
			return true;
		},
		end(): void {},
	} as Writable;

	try {
		await new Promise<void>((resolve, reject) => {
			execClient
				.exec(
					namespace,
					pod,
					container || "",
					command,
					stdout ? stdoutStream : null,
					stderr ? stderrStream : null,
					stdin ? process.stdin : null,
					tty,
					(status) => {
						if (status.status === "Success") {
							exitCode = 0;
							resolve();
						} else {
							// Try to parse exit code from message
							const match = status.message?.match(/exit code (\d+)/i);
							exitCode = match ? parseInt(match[1], 10) : 1;
							resolve();
						}
					},
				)
				.catch(reject);
		});
	} catch (error) {
		throw KubernetesError.fromApiError(error);
	}

	if (exitCode !== 0) {
		throw new ExecError(
			`Command failed with exit code ${exitCode}`,
			exitCode,
			stderrData,
		);
	}

	return {
		exitCode,
		stdout: stdoutData,
		stderr: stderrData,
	};
}

/**
 * Options for streaming exec
 */
export interface ExecStreamOptions extends ExecOptions {
	/** Callback for stdout data */
	onStdout?: (data: string) => void;
	/** Callback for stderr data */
	onStderr?: (data: string) => void;
	/** Callback when command completes */
	onClose?: (exitCode: number) => void;
}

/**
 * Handle for a streaming exec session
 */
export interface ExecStreamHandle {
	/** Write data to stdin */
	write(data: string | Buffer): void;
	/** Close the exec session */
	close(): void;
	/** Promise that resolves when command completes */
	result: Promise<ExecResult>;
}

/**
 * Execute a command with streaming I/O
 */
export async function execStream(
	kubeConfig: KubeConfig,
	options: ExecStreamOptions,
): Promise<ExecStreamHandle> {
	const k8s = await loadKubernetesClient();
	const execClient = new k8s.Exec(kubeConfig.getRawConfig());

	const {
		namespace,
		pod,
		container,
		command,
		stdin = true,
		stdout = true,
		stderr = true,
		tty = false,
		onStdout,
		onStderr,
		onClose,
	} = options;

	let stdoutData = "";
	let stderrData = "";
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let ws: any = null;

	const stdoutStream: Writable = {
		write(chunk: Buffer | string): boolean {
			const data = typeof chunk === "string" ? chunk : chunk.toString();
			stdoutData += data;
			onStdout?.(data);
			return true;
		},
		end(): void {},
	} as Writable;

	const stderrStream: Writable = {
		write(chunk: Buffer | string): boolean {
			const data = typeof chunk === "string" ? chunk : chunk.toString();
			stderrData += data;
			onStderr?.(data);
			return true;
		},
		end(): void {},
	} as Writable;

	// Create a passthrough for stdin
	const { PassThrough } = await import("node:stream");
	const stdinStream = new PassThrough();

	const resultPromise = new Promise<ExecResult>((resolve, reject) => {
		execClient
			.exec(
				namespace,
				pod,
				container || "",
				command,
				stdout ? stdoutStream : null,
				stderr ? stderrStream : null,
				stdin ? stdinStream : null,
				tty,
				(status) => {
					let exitCode = 0;
					if (status.status !== "Success") {
						const match = status.message?.match(/exit code (\d+)/i);
						exitCode = match ? parseInt(match[1], 10) : 1;
					}

					onClose?.(exitCode);
					resolve({
						exitCode,
						stdout: stdoutData,
						stderr: stderrData,
					});
				},
			)
			.then((socket: unknown) => {
				ws = socket;
			})
			.catch(reject);
	});

	return {
		write: (data: string | Buffer) => {
			stdinStream.write(data);
		},
		close: () => {
			stdinStream.end();
			if (ws && typeof ws.close === "function") {
				ws.close();
			}
		},
		result: resultPromise,
	};
}
