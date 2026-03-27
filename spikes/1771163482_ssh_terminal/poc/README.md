# Terminal Server - Proof of Concept

A WebSocket-based terminal server that provides shell access to Kubernetes pods.

## Features

- JWT-based authentication and authorization
- WebSocket streaming for real-time terminal I/O
- Automatic shell detection (bash → sh fallback)
- Session tracking and management
- Graceful shutdown handling
- Health check endpoint
- Comprehensive logging

## Quick Start

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
export JWT_SECRET="your-secret-key"
export PORT=8081
```

3. Ensure kubectl is configured with cluster access:
```bash
kubectl get nodes  # Should work
```

4. Run the server:
```bash
npm run dev
```

### Using Docker

1. Build the image:
```bash
docker build -t terminal-server:latest .
```

2. Run the container:
```bash
docker run -p 8081:8081 \
  -e JWT_SECRET="your-secret-key" \
  -v ~/.kube/config:/home/nodejs/.kube/config:ro \
  terminal-server:latest
```

## Testing

### Generate a JWT Token

Use this Node.js snippet to generate a test token:

```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign({
  userId: 'test-user',
  namespace: 'default',
  podName: 'test-pod',
  container: 'main',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 300 // 5 minutes
}, 'your-secret-key');

console.log(token);
```

### Connect with wscat

```bash
npm install -g wscat
wscat -c "ws://localhost:8081?token=YOUR_JWT_TOKEN"
```

### Test with a Real Pod

1. Create a test pod:
```bash
kubectl run test-terminal --image=alpine:latest --command -- sh -c "while true; do sleep 30; done"
```

2. Generate token for the pod:
```javascript
const token = jwt.sign({
  userId: 'test-user',
  namespace: 'default',
  podName: 'test-terminal',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 300
}, 'your-secret-key');
```

3. Connect:
```bash
wscat -c "ws://localhost:8081?token=${TOKEN}"
```

You should now have a shell in the Alpine pod!

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret for JWT token validation | `dev-secret-change-in-production` |
| `PORT` | WebSocket server port | `8081` |
| `LOG_LEVEL` | Logging verbosity (info, debug) | `info` |

## Architecture

```
Client (xterm.js) <--WebSocket--> Terminal Server <--kubectl exec--> Kubernetes Pod
                       ↓                                ↓
                  JWT Validation                  PTY Streaming
```

## API

### WebSocket Connection

Connect to `ws://host:8081?token=JWT_TOKEN`

**Token Payload**:
```json
{
  "userId": "user-123",
  "namespace": "pr-myapp-42",
  "podName": "web-deployment-abc123",
  "container": "app",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Health Check

`GET /health` or `GET /healthz`

**Response**:
```json
{
  "status": "ok",
  "activeSessions": 3,
  "uptime": 12345.67
}
```

## Security Considerations

1. **JWT Secret**: Use a strong, random secret in production
2. **Token Expiry**: Keep tokens short-lived (5 minutes recommended)
3. **RBAC**: Ensure the service account has minimal required permissions
4. **Network Policies**: Restrict which namespaces the server can access
5. **TLS**: Use WSS (WebSocket over TLS) in production
6. **Rate Limiting**: Add connection rate limiting per user
7. **Audit Logging**: All sessions are logged with user, namespace, pod details

## Deployment to Kubernetes

See parent directory's README.md for Helm chart deployment instructions.

## Limitations

- No session recording (could be added)
- No multi-user collaboration (could be added)
- No file upload/download (could be added)
- Basic error handling (could be enhanced)

## License

MIT
