import { AppError } from '../errors/AppError.js';
import type { UserDataClientFactory } from '../lib/supabase.js';
import { PROFILE_COLUMNS, profileRowSchema, type ProfileRow } from '../schemas/me.schema.js';

export type ProfileService = {
  /**
   * Reads the signed-in user's own profile. The query runs with the user's
   * token, so Row Level Security returns at most their own row.
   */
  getOwnProfile(input: {
    accessToken: string;
    userId: string;
    signal: AbortSignal;
  }): Promise<ProfileRow>;
};

export function createProfileService(createUserClient: UserDataClientFactory): ProfileService {
  return {
    async getOwnProfile({ accessToken, userId, signal }) {
      const client = createUserClient(accessToken);
      const { data, error, status } = await client
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', userId)
        .abortSignal(signal)
        .maybeSingle();

      if (signal.aborted && signal.reason instanceof AppError) throw signal.reason;
      if (error) {
        if (status === 401 || status === 403) throw new AppError('UNAUTHORIZED', { cause: error });
        throw new AppError('SERVICE_UNAVAILABLE', { cause: error });
      }
      if (data === null) throw new AppError('PROFILE_NOT_FOUND');

      const row = profileRowSchema.safeParse(data);
      if (!row.success) throw new AppError('INTERNAL_ERROR', { cause: row.error });
      // Defense in depth: RLS already guarantees this.
      if (row.data.id !== userId) throw new AppError('PROFILE_NOT_FOUND');
      return row.data;
    },
  };
}
