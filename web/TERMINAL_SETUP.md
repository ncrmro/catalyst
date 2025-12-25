# Terminal WebSocket Setup Instructions

This document describes the manual steps needed to complete the terminal WebSocket implementation.

## Overview

The terminal implementation has been improved with:
1. Direct xterm.js usage (instead of the wrapper)
2. WebSocket support for real-time interactive shells
3. Fallback to request/response mode for compatibility
4. Better UI with connection status indicators

## Manual Steps Required

Due to environment limitations, the following manual steps are needed:

### 1. Install Dependencies

```bash
cd web
npm install
```

This will:
- Install the new xterm.js packages (@xterm/xterm and addons)
- Run the `prepare` script which patches Next.js for WebSocket support via next-ws

### 2. Create the WebSocket API Route

Run the setup script:

```bash
node scripts/setup-terminal-websocket.js
```

This will:
- Create the `/src/app/api/terminal` directory
- Create the `route.ts` file with the WebSocket handler
- Run `next-ws patch` to enable WebSocket support

Alternatively, you can manually create the directory and file:

```bash
mkdir -p src/app/api/terminal
```

Then copy the WebSocket route code from `scripts/setup-terminal-websocket.js` (the `routeContent` variable) to `src/app/api/terminal/route.ts`.

### 3. Update Pages to Use the New Terminal

Replace the old `Terminal` component imports with the new `ImprovedTerminal` component:

**Before:**
```typescript
import { Terminal, TerminalModal } from "@/components/terminal";
```

**After:**
```typescript
import { ImprovedTerminal, ImprovedTerminalModal } from "@/components/improved-terminal-wrapper";
```

**Usage with WebSocket (recommended):**
```typescript
<ImprovedTerminalModal
  isOpen={terminalOpen}
  onClose={() => setTerminalOpen(false)}
  namespace={namespace}
  podName={podName}
  containerName={containerName}
  useWebSocket={true}  // Enable WebSocket mode
/>
```

**Usage with request/response (fallback):**
```typescript
<ImprovedTerminalModal
  isOpen={terminalOpen}
  onClose={() => setTerminalOpen(false)}
  namespace={namespace}
  podName={podName}
  containerName={containerName}
  useWebSocket={false}  // Use request/response mode
  onExec={handleExec}   // Required for request/response mode
/>
```

### 4. Test the Implementation

Start the development server:

```bash
npm run dev
```

Navigate to a preview environment page and click the "Shell" button on a running container. The terminal should:
- Connect via WebSocket to the pod
- Show a green "Connected" indicator
- Provide real-time interactive shell access
- Support terminal resizing
- Handle disconnections gracefully

## Implementation Details

### WebSocket Route (`/api/terminal/route.ts`)

The WebSocket handler:
- Authenticates users via NextAuth
- Creates a Kubernetes shell session using the `@catalyst/kubernetes-client` package
- Forwards data bidirectionally between the WebSocket client and the pod shell
- Handles terminal resize events
- Manages session cleanup on disconnect

### Improved Terminal Component

Features:
- Direct xterm.js usage for better control
- WebSocket mode for real-time interaction
- Request/response fallback mode
- Auto-fitting to container size
- Connection status indicators
- Better error handling
- Improved color scheme

### Security

- User authentication via NextAuth session
- TODO: Add authorization check to verify user has access to the namespace/pod
- Sessions are tracked and cleaned up automatically
- WebSocket connections are closed on authentication failure

## Troubleshooting

### WebSocket Connection Fails

1. Check that `next-ws patch` was run: `npx next-ws patch`
2. Verify the WebSocket route exists at `/src/app/api/terminal/route.ts`
3. Check the browser console for connection errors
4. Ensure the pod is running and accessible

### Terminal Not Responding

1. Check that the Kubernetes connection is working
2. Verify the shell exists in the container (default: `/bin/sh`)
3. Try the fallback request/response mode

### Dependencies Not Installing

If npm install fails, try:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

1. Update the environment detail page to use the new terminal
2. Add authorization checks to verify user access
3. Add tests for the WebSocket connection
4. Consider adding terminal history/recording
5. Add support for multiple terminal sessions per user
