#!/usr/bin/env node

/**
 * Production server wrapper for standalone builds
 *
 * This wrapper loads next-logger before starting the standalone Next.js server,
 * enabling structured JSON logging in production environments.
 */

// Load pino first as required by next-logger
require("pino");

// Load next-logger to patch console methods before Next.js starts
require("next-logger");

// Now start the standalone Next.js server
require("./server.js");
