import { z } from 'zod';

/** Code review contract. Phase 4 defines it for the provider abstraction; the route comes later. */
export const CODE_REVIEW_MAX_LENGTH = 8_000;

export const codeLanguageSchema = z.enum([
  'javascript',
  'typescript',
  'html',
  'css',
  'python',
  'json',
]);
export type CodeLanguage = z.infer<typeof codeLanguageSchema>;

export const codeReviewTaskSchema = z.enum(['explain', 'fix', 'improve']);
export type CodeReviewTask = z.infer<typeof codeReviewTaskSchema>;

export const codeReviewRequestSchema = z
  .object({
    language: codeLanguageSchema,
    task: codeReviewTaskSchema,
    code: z.string().min(1).max(CODE_REVIEW_MAX_LENGTH),
  })
  .strict();

export type CodeReviewRequest = z.infer<typeof codeReviewRequestSchema>;

/** The structured output the AI must return. Anything else is rejected. */
export const codeReviewOutputSchema = z
  .object({
    summary: z.string().min(1).max(2_000),
    issues: z
      .array(
        z
          .object({
            severity: z.enum(['info', 'warning', 'error']),
            line: z.number().int().positive().optional(),
            message: z.string().min(1).max(1_000),
            suggestion: z.string().max(2_000),
          })
          .strict(),
      )
      .max(50),
    improvedCode: z
      .string()
      .max(CODE_REVIEW_MAX_LENGTH * 2)
      .optional(),
    nextStep: z.string().min(1).max(500),
  })
  .strict();

export type CodeReviewOutput = z.infer<typeof codeReviewOutputSchema>;
