import type { RequestHandler } from 'express';

import type { TokenVerifier } from '../auth/TokenVerifier.js';
import { AppError } from '../errors/AppError.js';

/** `Bearer <JWT>`: three base64url parts. Length-capped, no backtracking. */
const BEARER = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/;
const MAX_HEADER_LENGTH = 8_192;

/** Rejects the request with 401 unless it carries a valid Supabase access token. */
export function requireAuth(verifier: TokenVerifier): RequestHandler {
  return async (req, _res, next) => {
    const header = req.headers.authorization;
    const match =
      typeof header === 'string' && header.length <= MAX_HEADER_LENGTH ? BEARER.exec(header) : null;
    if (!match?.[1]) throw new AppError('UNAUTHORIZED');

    const accessToken = match[1];
    const { userId } = await verifier.verify(accessToken);
    req.auth = { userId, accessToken };
    next();
  };
}
