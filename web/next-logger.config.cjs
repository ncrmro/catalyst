const pino = require('pino')

const logger = (defaultConfig) =>
  pino({
    ...defaultConfig,
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    // In production, use structured JSON logging
    transport: process.env.NODE_ENV === 'production' ? undefined : {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  })

module.exports = {
  logger,
}