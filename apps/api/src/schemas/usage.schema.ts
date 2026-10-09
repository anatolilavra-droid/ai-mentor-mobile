import { z } from 'zod';

export const planSchema = z.enum(['free', 'pro']);
export type Plan = z.infer<typeof planSchema>;

/** A row from get_my_ai_quotas() / record_my_ai_usage(). Validated: the database is external. */
export const quotaRowSchema = z.object({
  feature: z.enum(['chat', 'code_review']),
  plan: planSchema,
  used: z.number().int().nonnegative(),
  monthly_limit: z.number().int().nonnegative(),
  period_start: z.iso.date(),
  period_end: z.iso.date(),
});
export type QuotaRow = z.infer<typeof quotaRowSchema>;

const featureUsageSchema = z
  .object({
    used: z.number().int().nonnegative(),
    limit: z.number().int().nonnegative(),
  })
  .strict();

export const usageResponseSchema = z
  .object({
    plan: planSchema,
    period: z.object({ start: z.iso.date(), end: z.iso.date() }).strict(),
    features: z.object({ chat: featureUsageSchema, code_review: featureUsageSchema }).strict(),
  })
  .strict();
export type UsageResponse = z.infer<typeof usageResponseSchema>;

/** A subscriptions row as PostgREST returns it. */
export const subscriptionRowSchema = z.object({
  plan: planSchema,
  status: z.enum(['active', 'canceled']),
});

export const subscriptionResponseSchema = z
  .object({
    plan: planSchema,
    status: z.enum(['active', 'canceled']),
  })
  .strict();
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;
