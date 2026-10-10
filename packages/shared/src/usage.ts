import { z } from 'zod';

import { PLANS, SUBSCRIPTION_STATUSES } from './constants.js';

export const planSchema = z.enum(PLANS);
export const subscriptionStatusSchema = z.enum(SUBSCRIPTION_STATUSES);

/** Monthly quota of one feature after an AI call. */
export const quotaSchema = z
  .object({
    used: z.number().int().nonnegative(),
    limit: z.number().int().nonnegative(),
    period: z.literal('month'),
  })
  .strict();
export type Quota = z.infer<typeof quotaSchema>;

/** Token usage of one AI call and the monthly quota of its feature after it. */
export const aiUsageSchema = z
  .object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    quota: quotaSchema,
  })
  .strict();
export type AIUsage = z.infer<typeof aiUsageSchema>;

const featureUsageSchema = z
  .object({
    used: z.number().int().nonnegative(),
    limit: z.number().int().nonnegative(),
  })
  .strict();

/** GET /api/usage */
export const usageResponseSchema = z
  .object({
    plan: planSchema,
    period: z.object({ start: z.iso.date(), end: z.iso.date() }).strict(),
    features: z.object({ chat: featureUsageSchema, code_review: featureUsageSchema }).strict(),
  })
  .strict();
export type UsageResponse = z.infer<typeof usageResponseSchema>;

/** GET /api/subscription. A canceled subscription reports the plan it actually gets (free). */
export const subscriptionResponseSchema = z
  .object({
    plan: planSchema,
    status: subscriptionStatusSchema,
  })
  .strict();
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;
