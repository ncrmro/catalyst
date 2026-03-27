# Proof of Concept - Terminal Access

This directory contains proof-of-concept code demonstrating terminal access to Kubernetes pods.

## Files

- `simple-exec-test.ts` - Basic kubectl exec demonstration using @kubernetes/client-node

## Prerequisites

1. Kubernetes cluster running (Kind, K3s, etc.)
2. Test pod deployed:
   ```bash
   kubectl run test-terminal-pod --image=alpine:latest --restart=Never -- sleep 3600
   ```

## Running the POC

From the web directory:

```bash
cd /web
npx tsx ../spikes/1771162568_ssh_terminal/poc/simple-exec-test.ts
```

## Expected Output

```
Testing kubectl exec with Kubernetes client-node...

Test 1: Echo command
Hello from pod!
Command completed with status: { code: 0, signal: null }

Test 2: List directory
total 0
drwxrwxrwt    2 root     root            40 Feb 15 13:45 .
drwxr-xr-x    1 root     root          4096 Feb 15 13:45 ..
Command completed with status: { code: 0, signal: null }

Test 3: Multiple commands
root
/
Sat Feb 15 13:45:00 UTC 2026
Command completed with status: { code: 0, signal: null }

✅ All tests passed!

Next step: Implement interactive TTY mode with SSE/WebSocket
```

## Next Steps

1. ✅ Verify basic exec works
2. 🔲 Implement TTY mode (set `tty: true`)
3. 🔲 Create bidirectional stream (stdin/stdout)
4. 🔲 Wrap in SSE or WebSocket API
5. 🔲 Add to existing terminal component

See the main spike README for full implementation details.
