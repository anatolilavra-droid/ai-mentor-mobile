import { pino, type DestinationStream, type Logger, type LoggerOptions } from 'pino';

/**
 * Paths that must never reach the logs. Request bodies are not logged at all,
 * so chat messages and user code stay out of the logs as well.
 */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',
  '*.accessToken',
  '*.apiKey',
  '*.password',
  '*.token',
];

export type CreateLoggerOptions = {
  level: LoggerOptions['level'];
  pretty?: boolean;
  destination?: DestinationStream;
};

export function createLogger({ level, pretty = false, destination }: CreateLoggerOptions): Logger {
  const options: LoggerOptions = {
    level,
    base: { service: 'ai-mentor-api' },
    redact: { paths: REDACT_PATHS, censor: '[redacted]' },
    ...(pretty && !destination ? { transport: { target: 'pino-pretty' } } : {}),
  };
  return destination ? pino(options, destination) : pino(options);
}
