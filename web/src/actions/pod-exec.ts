"use server";

/**
 * Pod Exec Actions Layer
 *
 * Server actions for executing commands in pod containers.
 * This layer handles authentication, authorization, and delegates to the kubernetes client.
 */

import {
	type ExecResult,
	exec,
	getClusterConfig,
} from "@catalyst/kubernetes-client";
import { auth } from "@/auth";

/**
 * Result type for exec actions
 */
export interface ExecActionResult {
	success: boolean;
	stdout?: string;
	stderr?: string;
	error?: string;
}

/**
 * Execute a command in a pod container
 *
 * @param namespace - Namespace of the pod
 * @param podName - Name of the pod
 * @param command - Command to execute (as a string that will be run via shell)
 * @param containerName - Optional container name (required if pod has multiple containers)
 * @returns Result with stdout and stderr
 */
export async function execInPod(
	namespace: string,
	podName: string,
	command: string,
	containerName?: string,
): Promise<ExecActionResult> {
	const session = await auth();

	if (!session?.user?.id) {
		return { success: false, error: "Not authenticated" };
	}

	// TODO: Add authorization check - verify user has access to this namespace/pod
	// This could check team membership against project/environment ownership

	try {
		const kubeConfig = await getClusterConfig();

		// Wrap command in shell for better compatibility
		const shellCommand = ["/bin/sh", "-c", command];

		const result: ExecResult = await exec(kubeConfig, {
			namespace,
			pod: podName,
			container: containerName,
			command: shellCommand,
			stdout: true,
			stderr: true,
			tty: false,
		});

		return {
			success: true,
			stdout: result.stdout,
			stderr: result.stderr,
		};
	} catch (error) {
		console.error("Exec error:", error);

		// Handle ExecError which includes stderr
		if (error && typeof error === "object" && "stderr" in error) {
			return {
				success: false,
				stderr: (error as { stderr: string }).stderr,
				error: error instanceof Error ? error.message : "Command failed",
			};
		}

		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to execute command",
		};
	}
}

/**
 * Execute a command and return combined output
 *
 * This is a simplified version that combines stdout and stderr
 * and is suitable for simple command execution.
 *
 * @param namespace - Namespace of the pod
 * @param podName - Name of the pod
 * @param command - Command to execute
 * @param containerName - Optional container name
 * @returns Result with combined output
 */
export async function execCommand(
	namespace: string,
	podName: string,
	command: string,
	containerName?: string,
): Promise<{ stdout: string; stderr: string }> {
	const result = await execInPod(namespace, podName, command, containerName);

	if (!result.success) {
		return {
			stdout: "",
			stderr: result.error || result.stderr || "Command failed",
		};
	}

	return {
		stdout: result.stdout || "",
		stderr: result.stderr || "",
	};
}
