import { SignJWT, type CryptoKey } from 'jose';

import { projectKeys, TEST_ISSUER, TEST_KID } from './keys.js';

export const USER_A = '11111111-1111-4111-8111-111111111111';
export const USER_B = '22222222-2222-4222-8222-222222222222';

type TokenOptions = {
  sub?: string;
  role?: string;
  audience?: string;
  issuer?: string;
  /** Seconds from now; negative means already expired. */
  expiresIn?: number;
  key?: CryptoKey;
  kid?: string;
};

/** Signs a Supabase-like access token with the test project key by default. */
export async function signToken(options: TokenOptions = {}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role: options.role ?? 'authenticated' })
    .setProtectedHeader({ alg: 'ES256', kid: options.kid ?? TEST_KID, typ: 'JWT' })
    .setSubject(options.sub ?? USER_A)
    .setAudience(options.audience ?? 'authenticated')
    .setIssuer(options.issuer ?? TEST_ISSUER)
    .setIssuedAt(now)
    .setExpirationTime(now + (options.expiresIn ?? 3600))
    .sign(options.key ?? projectKeys.privateKey);
}

export async function signHs256Token(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(USER_A)
    .setAudience('authenticated')
    .setIssuer(TEST_ISSUER)
    .setExpirationTime(now + 3600)
    .sign(new TextEncoder().encode('a-shared-secret-that-must-never-be-accepted'));
}

/** `alg: none` with a dummy signature segment, the classic algorithm-confusion attempt. */
export function unsignedToken(): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({
      sub: USER_A,
      role: 'authenticated',
      aud: 'authenticated',
      iss: TEST_ISSUER,
      exp: now + 3600,
    }),
    'x',
  ].join('.');
}

export const bearer = (token: string) => `Bearer ${token}`;
