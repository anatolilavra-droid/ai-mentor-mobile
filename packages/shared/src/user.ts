import { z } from 'zod';

/** Supabase auth user id. */
export const userIdSchema = z.uuid();

/** The signed-in user as the API knows them: only the id from the verified token. */
export type AuthUser = { userId: string };
