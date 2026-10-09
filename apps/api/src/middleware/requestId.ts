import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const REQUEST_ID_HEADER = 'X-Request-Id';

/** Only simple IDs are accepted from clients, so a header cannot inject content into logs. */
const SAFE_REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

/**
 * Reuses a well-formed incoming X-Request-Id or creates a new UUID, and echoes
 * it in the response. Used as pino-http's `genReqId`, which stores it on `req.id`.
 */
export function resolveRequestId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers['x-request-id'];
  const id =
    typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, id);
  return id;
}

export function getRequestId(req: { id?: unknown }): string {
  return typeof req.id === 'string' ? req.id : 'unknown';
}
