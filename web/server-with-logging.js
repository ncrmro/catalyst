#!/usr/bin/env node
// Production server startup script with structured logging
// This script loads next-logger before starting the Next.js server
// to ensure all console output is structured JSON in production

const path = require('path')

// Ensure production environment
process.env.NODE_ENV = 'production'

// Load next-logger for structured logging in production
require('pino')
require('next-logger')

// Start the Next.js standalone server
require('./.next/standalone/server.js')