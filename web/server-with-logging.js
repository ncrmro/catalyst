#!/usr/bin/env node

/**
 * Production server with structured logging
 *
 * This server wrapper ensures that next-logger is loaded before the Next.js server starts,
 * enabling structured JSON logging in production environments.
 */

// Load pino first as required by next-logger
import "pino";

// Load next-logger to patch console methods before Next.js starts
import "next-logger";

// Now start the Next.js server
import { createServer } from "http";
import { parse } from "url";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT, 10) || 3000;

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      // Parse the URL
      const parsedUrl = parse(req.url, true);

      // Handle the request with Next.js
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
