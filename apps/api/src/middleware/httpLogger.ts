import type { IncomingMessage, ServerResponse } from 'node:http';

import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

import { resolveRequestId } from './requestId.js';

type LoggedRequest = IncomingMessage & { auth?: { userId: string } };

/**
 * One structured line per request: id, method, path (no query string), status,
 * duration and, after authentication, the user id. Headers and bodies are not logged.
 */
export function createHttpLogger(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId: resolveRequestId,
    quietReqLogger: true,
    customAttributeKeys: { reqId: 'requestId', responseTime: 'durationMs' },
    serializers: {
      req: (req: { method?: string; url?: string }) => ({
        method: req.method,
        path: (req.url ?? '').split('?')[0],
      }),
      res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
    },
    customProps: (req: LoggedRequest) => (req.auth ? { userId: req.auth.userId } : {}),
    customLogLevel: (_req, res: ServerResponse, error) => {
      if (error || res.statusCode >= 500) return 'error';
      if (res.statusCode === 401 || res.statusCode === 404) return 'debug';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: () => 'request completed',
    customErrorMessage: () => 'request failed',
    // errorHandler already logged the real error with its stack; the request
    // line keeps only status and timing, without pino-http's synthetic error.
    customErrorObject: (_req, _res, _error, value: Record<string, unknown>) => {
      const rest = { ...value };
      delete rest.err;
      return rest;
    },
  });
}
