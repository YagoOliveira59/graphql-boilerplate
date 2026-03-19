// ─── Logger ───────────────────────────────────────────────────────────────────
// Winston logger with Google Cloud Trace support.
// Set LOG_HUMAN=false in production to output structured JSON logs.
// Set LOG_LEVEL to control verbosity (error | warn | info | http | verbose | debug | silly).

import { HeaderMap } from '@apollo/server'
import { IncomingHttpHeaders } from 'http'
import { config, createLogger, format, transports } from 'winston'

const { printf, combine, errors, timestamp, colorize } = format

const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let formattedMessage = `${timestamp} [${level}]: ${message}`
  if (Object.keys(metadata).length) formattedMessage += ' ' + JSON.stringify(metadata, null, 2)
  return formattedMessage
})

const logFormatter =
  process.env.LOG_HUMAN !== 'false'
    ? combine(errors({ stack: true }), timestamp(), colorize(), customFormat)
    : combine(errors({ stack: true }), timestamp(), format.json())

const logger = createLogger({
  levels: config.npm.levels,
  format: logFormatter,
  transports: [
    new transports.Console({
      silent: process.env.NODE_ENV === 'test',
      level: process.env.LOG_LEVEL || 'info'
    })
  ]
})

/**
 * Creates a child logger enriched with Google Cloud Trace context and operation name.
 * Useful for correlating logs with specific GraphQL operations in Cloud Logging.
 *
 * @see https://cloud.google.com/trace/docs/setup#force-trace
 */
export const getLoggerChildWithTrace = (
  headers: IncomingHttpHeaders | HeaderMap | undefined = undefined,
  operationName: string | undefined = undefined
) => {
  if (typeof headers === 'undefined') {
    return logger
  }

  let header: string | string[] | undefined
  if (headers instanceof HeaderMap) {
    header = headers.get('x-cloud-trace-context')
  } else {
    header = headers?.['x-cloud-trace-context']
  }

  let traceContext = ''
  if (Array.isArray(header)) {
    traceContext = header.shift() || ''
  } else {
    traceContext = header || ''
  }

  // Standard GCP LB Trace information format: TRACE/SPAN;OPTIONS
  const traceInfo = traceContext.split(/(\/|;)/)
  const trace = traceInfo[0]
  const span = traceInfo[2] || undefined
  const traceOptions = traceInfo[4] || undefined

  return logger.child({ trace, span, traceOptions, operationName })
}

export default logger
