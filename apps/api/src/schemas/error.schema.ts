import { z } from 'zod';

import { ERROR_CODES } from '../errors/codes.js';

export const errorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.enum(ERROR_CODES),
        message: z.string(),
        requestId: z.string(),
        details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
        quota: z
          .object({
            feature: z.enum(['chat', 'code_review']),
            used: z.number().int().nonnegative(),
            limit: z.number().int().nonnegative(),
            resetsAt: z.string(),
          })
          .strict()
          .optional(),
      })
      .strict(),
  })
  .strict();

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
