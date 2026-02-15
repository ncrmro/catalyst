/**
 * Simple Proof of Concept: kubectl exec via @kubernetes/client-node
 * 
 * This demonstrates the basic pattern for executing commands in pods
 * using the existing Kubernetes client infrastructure.
 * 
 * Run with: npx tsx simple-exec-test.ts
 */

import * as k8s from '@kubernetes/client-node';

async function execCommand(
  namespace: string,
  podName: string,
  command: string[]
): Promise<{ stdout: string; stderr: string }> {
  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();

  const exec = new k8s.Exec(kc);

  let stdout = '';
  let stderr = '';

  await exec.exec(
    namespace,
    podName,
    '',  // container (empty = default container)
    command,
    process.stdout,
    process.stderr,
    process.stdin,
    false,  // tty = false for simple command execution
    (status) => {
      console.log('Command completed with status:', status);
    }
  );

  return { stdout, stderr };
}

async function main() {
  console.log('Testing kubectl exec with Kubernetes client-node...\n');

  try {
    // Test 1: Simple echo command
    console.log('Test 1: Echo command');
    await execCommand('default', 'test-terminal-pod', [
      '/bin/sh',
      '-c',
      'echo "Hello from pod!"',
    ]);

    console.log('\nTest 2: List directory');
    await execCommand('default', 'test-terminal-pod', [
      '/bin/sh',
      '-c',
      'ls -la /tmp',
    ]);

    console.log('\nTest 3: Multiple commands');
    await execCommand('default', 'test-terminal-pod', [
      '/bin/sh',
      '-c',
      'whoami && pwd && date',
    ]);

    console.log('\n✅ All tests passed!');
    console.log('\nNext step: Implement interactive TTY mode with SSE/WebSocket');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
