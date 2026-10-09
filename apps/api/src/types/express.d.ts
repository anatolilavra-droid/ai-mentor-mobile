import 'express';

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth. Present only on authenticated routes. */
      auth?: { userId: string; accessToken: string };
      /** Aborted when the request times out or the client disconnects. */
      abortSignal: AbortSignal;
    }
  }
}
