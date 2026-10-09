import { planSchema, subscriptionStatusSchema, USAGE_FEATURES } from '@ai-mentor/shared';
import { z } from 'zod';

/** A row from get_my_ai_quotas() / record_my_ai_usage() (server-only). Validated: the database is external. */
export const quotaRowSchema = z.object({
  feature: z.enum(USAGE_FEATURES),
  plan: planSchema,
  used: z.number().int().nonnegative(),
  monthly_limit: z.number().int().nonnegative(),
  period_start: z.iso.date(),
  period_end: z.iso.date(),
});
export type QuotaRow = z.infer<typeof quotaRowSchema>;

/** A subscriptions row as PostgREST returns it (server-only). */
export const subscriptionRowSchema = z.object({
  plan: planSchema,
  status: subscriptionStatusSchema,
});
