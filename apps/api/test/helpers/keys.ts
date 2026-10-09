import { exportJWK, generateKeyPair, type CryptoKey, type JWK } from 'jose';

export const TEST_SUPABASE_URL = 'https://test-project.supabase.co';
export const TEST_ISSUER = `${TEST_SUPABASE_URL}/auth/v1`;
export const TEST_KID = 'test-key-1';

export type TestKeys = { privateKey: CryptoKey; publicJwk: JWK };

async function createKeys(kid: string): Promise<TestKeys> {
  const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
  const publicJwk = { ...(await exportJWK(publicKey)), kid, alg: 'ES256', use: 'sig' };
  return { privateKey, publicJwk };
}

/** The "project" signing key, served by the fake JWKS endpoint. */
export const projectKeys = await createKeys(TEST_KID);

/** A key the project does not know, but with the same kid (forged signature). */
export const foreignKeys = await createKeys(TEST_KID);

/** Serves the project's public key set instead of the network. */
export async function jwksFetch(): Promise<Response> {
  return Response.json({ keys: [projectKeys.publicJwk] });
}
