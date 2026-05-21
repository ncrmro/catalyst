# Structured Logging with next-logger

This project uses [next-logger](https://github.com/sainsburys-tech/next-logger) to provide structured JSON logging in production environments.

## Overview

In production, all console.log, console.error, console.warn, and console.debug statements are automatically converted to structured JSON logs using Pino as the logging backend. This enables better log aggregation and analysis in production environments.

## Usage

### Development

In development mode, logging remains human-readable:

```bash
npm run dev
```

### Production

For production deployment with structured logging:

```bash
npm run build
npm run start:production
```

The `start:production` script loads next-logger before starting the Next.js server, ensuring all logs are output as structured JSON.

## Log Levels

- `console.log()` → level 30 (info)
- `console.debug()` → level 30 (info)
- `console.warn()` → level 40 (warn)
- `console.error()` → level 50 (error)

## Example Output

Development:

```
Middleware invoked /login
✓ Ready in 1633ms
```

Production:

```json
{"level":30,"time":1756399286818,"pid":17067,"hostname":"server","name":"console","msg":"Middleware invoked /login"}
{"level":30,"time":1756399286999,"pid":17067,"hostname":"server","name":"console","msg":" ✓ Ready in 187ms"}
```

## Configuration

The next-logger configuration is located in:

- `instrumentation.ts` - Loads next-logger via Next.js instrumentation hook
- `next-logger.config.js` - Custom Pino configuration
- `server-with-logging.js` - Production server wrapper

## Kubernetes/Docker Deployment

For containerized deployments, use the production server script as your entrypoint:

```dockerfile
CMD ["node", "server-with-logging.js"]
```

This ensures structured logging is enabled when running in Kubernetes or other container orchestration platforms.
