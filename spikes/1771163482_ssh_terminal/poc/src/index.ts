/**
 * Terminal WebSocket Server - Proof of Concept
 * 
 * A WebSocket server that proxies terminal connections to Kubernetes pods.
 * Uses JWT tokens for authentication and authorization.
 * 
 * Environment Variables:
 * - JWT_SECRET: Secret for verifying JWT tokens
 * - PORT: WebSocket server port (default: 8081)
 * - LOG_LEVEL: Logging level (default: info)
 */

import { WebSocketServer, WebSocket } from 'ws';
import { KubeConfig, Exec } from '@kubernetes/client-node';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { URL } from 'url';

// ============================================================================
// Types
// ============================================================================

interface TerminalToken {
  userId: string;
  namespace: string;
  podName: string;
  container?: string;
  iat: number;
  exp: number;
}

interface TerminalSession {
  sessionId: string;
  userId: string;
  namespace: string;
  podName: string;
  container?: string;
  startTime: Date;
  ws: WebSocket;
}

// ============================================================================
// Configuration
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const PORT = parseInt(process.env.PORT || '8081', 10);
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Kubernetes config
const kc = new KubeConfig();
kc.loadFromDefault();

// Active sessions tracking
const sessions = new Map<string, TerminalSession>();

// ============================================================================
// Logging
// ============================================================================

const log = {
  info: (...args: any[]) => {
    console.log(new Date().toISOString(), '[INFO]', ...args);
  },
  error: (...args: any[]) => {
    console.error(new Date().toISOString(), '[ERROR]', ...args);
  },
  warn: (...args: any[]) => {
    console.warn(new Date().toISOString(), '[WARN]', ...args);
  },
  debug: (...args: any[]) => {
    if (LOG_LEVEL === 'debug') {
      console.log(new Date().toISOString(), '[DEBUG]', ...args);
    }
  },
};

// ============================================================================
// Token Validation
// ============================================================================

function validateToken(token: string): TerminalToken {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TerminalToken;
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new Error('Token expired');
    }

    return payload;
  } catch (err) {
    throw new Error(`Invalid token: ${err instanceof Error ? err.message : 'unknown error'}`);
  }
}

// ============================================================================
// Session Management
// ============================================================================

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

function addSession(session: TerminalSession): void {
  sessions.set(session.sessionId, session);
  log.info(`Session started: ${session.sessionId}`, {
    userId: session.userId,
    namespace: session.namespace,
    pod: session.podName,
    container: session.container,
    activeSessions: sessions.size,
  });
}

function removeSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    sessions.delete(sessionId);
    log.info(`Session ended: ${sessionId}`, {
      userId: session.userId,
      duration: Date.now() - session.startTime.getTime(),
      activeSessions: sessions.size,
    });
  }
}

// ============================================================================
// WebSocket Server
// ============================================================================

const server = createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', async (ws: WebSocket, req) => {
  const sessionId = generateSessionId();
  log.debug(`New WebSocket connection attempt: ${sessionId}`);

  try {
    // Extract token from query string
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      log.warn('Connection rejected: No token provided');
      ws.close(1008, 'No token provided');
      return;
    }

    // Validate JWT token
    let tokenData: TerminalToken;
    try {
      tokenData = validateToken(token);
    } catch (err) {
      log.warn('Connection rejected: Invalid token', { error: err });
      ws.close(1008, err instanceof Error ? err.message : 'Invalid token');
      return;
    }

    log.info('Token validated', {
      sessionId,
      userId: tokenData.userId,
      namespace: tokenData.namespace,
      pod: tokenData.podName,
      container: tokenData.container,
    });

    // Create session record
    const session: TerminalSession = {
      sessionId,
      userId: tokenData.userId,
      namespace: tokenData.namespace,
      podName: tokenData.podName,
      container: tokenData.container,
      startTime: new Date(),
      ws,
    };
    addSession(session);

    // Prepare exec parameters
    const namespace = tokenData.namespace;
    const podName = tokenData.podName;
    const container = tokenData.container;

    // Determine shell command (try bash first, fallback to sh)
    const command = ['/bin/bash', '-c', 'which bash >/dev/null 2>&1 && exec bash || exec sh'];

    // Create Kubernetes exec instance
    const exec = new Exec(kc);

    // Track if exec has started
    let execStarted = false;

    // Start exec with PTY
    log.debug(`Starting exec for session ${sessionId}`, {
      namespace,
      pod: podName,
      container,
      command,
    });

    try {
      await exec.exec(
        namespace,
        podName,
        container || undefined,
        command,
        ws as any, // stdout stream
        ws as any, // stderr stream
        ws as any, // stdin stream
        true,      // tty mode
        (status) => {
          log.info(`Exec completed for session ${sessionId}`, { status });
          if (status.status === 'Success') {
            ws.close(1000, 'Session completed normally');
          } else {
            ws.close(1011, `Exec failed: ${status.message || 'Unknown error'}`);
          }
          removeSession(sessionId);
        }
      );

      execStarted = true;
      log.info(`Exec stream established for session ${sessionId}`);

      // Send welcome message
      ws.send('\r\n\x1b[32m✓ Connected to pod shell\x1b[0m\r\n');

    } catch (err) {
      log.error(`Failed to start exec for session ${sessionId}`, { error: err });
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to pod';
      ws.send(`\r\n\x1b[31mError: ${errorMessage}\x1b[0m\r\n`);
      ws.close(1011, errorMessage);
      removeSession(sessionId);
      return;
    }

    // Handle WebSocket closure
    ws.on('close', (code, reason) => {
      log.debug(`WebSocket closed for session ${sessionId}`, {
        code,
        reason: reason.toString(),
      });
      removeSession(sessionId);
    });

    // Handle WebSocket errors
    ws.on('error', (err) => {
      log.error(`WebSocket error for session ${sessionId}`, { error: err });
      removeSession(sessionId);
    });

  } catch (err) {
    log.error('Unexpected error handling connection', { error: err });
    ws.close(1011, 'Internal server error');
    removeSession(sessionId);
  }
});

// ============================================================================
// Server Startup
// ============================================================================

server.listen(PORT, () => {
  log.info(`Terminal WebSocket server started`, {
    port: PORT,
    jwtSecret: JWT_SECRET.substring(0, 10) + '...',
    kubeContext: kc.getCurrentContext(),
  });
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('SIGTERM', () => {
  log.info('SIGTERM received, closing server...');
  
  // Close all active sessions
  sessions.forEach((session) => {
    session.ws.close(1001, 'Server shutting down');
  });
  
  wss.close(() => {
    server.close(() => {
      log.info('Server closed gracefully');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  log.info('SIGINT received, closing server...');
  
  // Close all active sessions
  sessions.forEach((session) => {
    session.ws.close(1001, 'Server shutting down');
  });
  
  wss.close(() => {
    server.close(() => {
      log.info('Server closed gracefully');
      process.exit(0);
    });
  });
});

// ============================================================================
// Health Check Endpoint (Optional)
// ============================================================================

server.on('request', (req, res) => {
  if (req.url === '/health' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      activeSessions: sessions.size,
      uptime: process.uptime(),
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});
