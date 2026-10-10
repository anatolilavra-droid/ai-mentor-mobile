import { z } from 'zod';

import {
  AI_PROVIDERS,
  CODE_LANGUAGES,
  CODE_REVIEW_ACTIONS,
  CODE_REVIEW_FIXED_CODE_MAX_CHARS,
  CODE_REVIEW_MAX_CHANGES,
  CODE_REVIEW_MAX_ISSUES,
  CODE_REVIEW_MAX_STEPS,
  ISSUE_CATEGORIES,
  ISSUE_SEVERITIES,
  MAX_CODE_REVIEW_CHARS,
  MAX_CODE_REVIEW_LINES,
  REVIEW_CONFIDENCE,
} from './constants.js';
import { aiUsageSchema } from './usage.js';

export const codeLanguageSchema = z.enum(CODE_LANGUAGES);
export const codeReviewActionSchema = z.enum(CODE_REVIEW_ACTIONS);

/** Line endings become `\n`; nothing else in the code is changed. */
export function normalizeCode(code: string): string {
  return code.replace(/\r\n?/g, '\n');
}

/** Lines of (normalized) code. A final newline does not start a new line; empty code has 0. */
export function countCodeLines(code: string): number {
  if (code.length === 0) return 0;
  const lines = code.split('\n').length;
  return code.endsWith('\n') ? lines - 1 : lines;
}

export const CODE_INPUT_ISSUES = [
  'empty',
  'tooManyChars',
  'tooManyLines',
  'invalidCharacters',
] as const;
export type CodeInputIssue = (typeof CODE_INPUT_ISSUES)[number];

export type CodeInputCheck = {
  chars: number;
  lines: number;
  issues: CodeInputIssue[];
  valid: boolean;
};

/**
 * The one check for pasted code: the app uses it for live counters and the
 * send button, the API uses it in the request schema (the source of truth).
 */
export function checkCodeInput(code: string): CodeInputCheck {
  const normalized = normalizeCode(code);
  const chars = normalized.length;
  const lines = countCodeLines(normalized);
  const issues: CodeInputIssue[] = [];
  if (normalized.trim().length === 0) issues.push('empty');
  if (chars > MAX_CODE_REVIEW_CHARS) issues.push('tooManyChars');
  if (lines > MAX_CODE_REVIEW_LINES) issues.push('tooManyLines');
  if (normalized.includes('\0')) issues.push('invalidCharacters');
  return { chars, lines, issues, valid: issues.length === 0 };
}

/** POST /api/ai/code-review */
export const codeReviewRequestSchema = z
  .object({
    language: codeLanguageSchema,
    action: codeReviewActionSchema,
    code: z
      .string()
      // A cheap bound before any work; the exact limits are checked below.
      .max(MAX_CODE_REVIEW_CHARS * 2, 'tooManyChars')
      .transform(normalizeCode)
      .superRefine((code, ctx) => {
        for (const issue of checkCodeInput(code).issues) {
          ctx.addIssue({ code: 'custom', message: issue });
        }
      }),
  })
  .strict();
export type CodeReviewRequest = z.input<typeof codeReviewRequestSchema>;
export type ParsedCodeReviewRequest = z.output<typeof codeReviewRequestSchema>;

export const codeReviewIssueSchema = z
  .object({
    severity: z.enum(ISSUE_SEVERITIES),
    category: z.enum(ISSUE_CATEGORIES),
    line: z.number().int().positive().optional(),
    title: z.string().trim().min(1).max(200),
    explanation: z.string().trim().min(1).max(1_000),
    suggestion: z.string().trim().max(1_000),
  })
  .strict();
export type CodeReviewIssue = z.infer<typeof codeReviewIssueSchema>;

/** The structured answer the AI must return. Anything else is rejected. */
export const codeReviewOutputSchema = z
  .object({
    summary: z.string().trim().min(1).max(1_500),
    steps: z.array(z.string().trim().min(1).max(500)).max(CODE_REVIEW_MAX_STEPS).optional(),
    issues: z.array(codeReviewIssueSchema).max(CODE_REVIEW_MAX_ISSUES),
    fixedCode: z.string().max(CODE_REVIEW_FIXED_CODE_MAX_CHARS).optional(),
    changes: z.array(z.string().trim().min(1).max(300)).max(CODE_REVIEW_MAX_CHANGES).optional(),
    nextStep: z.string().trim().min(1).max(500),
    confidence: z.enum(REVIEW_CONFIDENCE),
  })
  .strict();
export type CodeReviewOutput = z.infer<typeof codeReviewOutputSchema>;

export const codeReviewResponseSchema = z
  .object({
    review: codeReviewOutputSchema,
    provider: z.enum(AI_PROVIDERS),
    promptVersion: z.string().min(1),
    requestId: z.string(),
    /** What was reviewed (never the code itself). */
    input: z
      .object({
        language: codeLanguageSchema,
        action: codeReviewActionSchema,
        chars: z.number().int().nonnegative(),
        lines: z.number().int().nonnegative(),
      })
      .strict(),
    usage: aiUsageSchema,
  })
  .strict();
export type CodeReviewResponse = z.infer<typeof codeReviewResponseSchema>;
