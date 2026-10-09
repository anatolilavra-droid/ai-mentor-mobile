import {
  createRemoteJWKSet,
  customFetch,
  errors as joseErrors,
  jwtVerify,
  type FetchImplementation,
} from 'jose';
import { z } from 'zod';

import { AppError } from '../errors/AppError.js';

import type { TokenVerifier, VerifiedUser } from './TokenVerifier.js';

/** The project signs tokens with an ECC (P-256) key, so only ES256 is accepted. */
const ALLOWED_ALGORITHMS = ['ES256'];
const AUDIENCE = 'authenticated';
const CLOCK_TOLERANCE_SECONDS = 30;
const JWKS_TIMEOUT_MS = 5_000;

const claimsSchema = z.object({
  sub: z.uuid(),
  role: z.literal('authenticated'),
});

/** JWKS problems mean we could not check the token, not that the token is bad. */
const UNAVAILABLE_CODES = new Set([
  joseErrors.JWKSTimeout.code,
  joseErrors.JWKSInvalid.code,
  joseErrors.JOSEError.code,
]);

function isJoseError(error: unknown): error is InstanceType<typeof joseErrors.JOSEError> {
  return error instanceof joseErrors.JOSEError;
}

export type JwksVerifierOptions = {
  supabaseUrl: string;
  /** Tests serve a local key set through this instead of the network. */
  fetchImpl?: FetchImplementation;
};

/**
 * Verifies Supabase access tokens locally against the project's public JWKS
 * (`/auth/v1/.well-known/jwks.json`). No JWT secret or service key is needed.
 */
export function createJwksVerifier({ supabaseUrl, fetchImpl }: JwksVerifierOptions): TokenVerifier {
  const issuer = `${supabaseUrl}/auth/v1`;
  const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`), {
    timeoutDuration: JWKS_TIMEOUT_MS,
    ...(fetchImpl ? { [customFetch]: fetchImpl } : {}),
  });

  return {
    async verify(token: string): Promise<VerifiedUser> {
      let payload: unknown;
      try {
        ({ payload } = await jwtVerify(token, jwks, {
          issuer,
          audience: AUDIENCE,
          algorithms: ALLOWED_ALGORITHMS,
          clockTolerance: CLOCK_TOLERANCE_SECONDS,
          requiredClaims: ['sub', 'exp'],
        }));
      } catch (error) {
        if (!isJoseError(error) || UNAVAILABLE_CODES.has(error.code)) {
          throw new AppError('SERVICE_UNAVAILABLE', { cause: error });
        }
        throw new AppError('UNAUTHORIZED', { cause: error });
      }

      const claims = claimsSchema.safeParse(payload);
      if (!claims.success) throw new AppError('UNAUTHORIZED');
      return { userId: claims.data.sub };
    },
  };
}
