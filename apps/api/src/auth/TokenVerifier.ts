export type VerifiedUser = { userId: string };

/** Verifies a Supabase access token. Throws AppError UNAUTHORIZED or SERVICE_UNAVAILABLE. */
export interface TokenVerifier {
  verify(token: string): Promise<VerifiedUser>;
}
