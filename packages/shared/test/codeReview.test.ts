import { describe, expect, it } from 'vitest';

import {
  MAX_CODE_REVIEW_CHARS,
  MAX_CODE_REVIEW_LINES,
  checkCodeInput,
  codeReviewOutputSchema,
  codeReviewRequestSchema,
  codeReviewResponseSchema,
  countCodeLines,
  normalizeCode,
} from '../src/index.js';

const lines = (count: number) => Array.from({ length: count }, (_, i) => `x${i}`).join('\n');

const validOutput = {
  summary: 'Adds two numbers.',
  issues: [
    {
      severity: 'warning',
      category: 'bug',
      line: 2,
      title: 'Missing return',
      explanation: 'The function never returns the sum.',
      suggestion: 'Return a + b.',
    },
  ],
  nextStep: 'Write a test for add().',
  confidence: 'high',
};

describe('code input check', () => {
  it('normalizes line endings and counts lines', () => {
    expect(normalizeCode('a\r\nb\rc')).toBe('a\nb\nc');
    expect(countCodeLines('')).toBe(0);
    expect(countCodeLines('a')).toBe(1);
    expect(countCodeLines('a\nb')).toBe(2);
    expect(countCodeLines('a\nb\n')).toBe(2);
    expect(checkCodeInput('a\r\nb').lines).toBe(2);
    expect(checkCodeInput('a\r\nb').chars).toBe(3);
  });

  it('accepts code exactly at both limits', () => {
    expect(checkCodeInput('a'.repeat(MAX_CODE_REVIEW_CHARS)).valid).toBe(true);
    const atLines = checkCodeInput(lines(MAX_CODE_REVIEW_LINES));
    expect(atLines.lines).toBe(MAX_CODE_REVIEW_LINES);
    expect(atLines.valid).toBe(true);
  });

  it('rejects code over either limit, reporting each one', () => {
    expect(checkCodeInput('a'.repeat(MAX_CODE_REVIEW_CHARS + 1)).issues).toEqual(['tooManyChars']);
    expect(checkCodeInput(lines(MAX_CODE_REVIEW_LINES + 1)).issues).toEqual(['tooManyLines']);
    const both = '\n'.repeat(MAX_CODE_REVIEW_CHARS) + 'a';
    expect(checkCodeInput(both).issues).toEqual(['tooManyChars', 'tooManyLines']);
  });

  it('rejects empty, blank and NUL-containing code', () => {
    expect(checkCodeInput('').issues).toEqual(['empty']);
    expect(checkCodeInput('  \n\t ').issues).toEqual(['empty']);
    expect(checkCodeInput('a\0b').issues).toEqual(['invalidCharacters']);
  });
});

describe('code review request schema', () => {
  const request = { language: 'javascript', action: 'fix', code: 'let a = 1;\r\n' };

  it('accepts a valid request and normalizes the code', () => {
    const parsed = codeReviewRequestSchema.parse(request);
    expect(parsed.code).toBe('let a = 1;\n');
  });

  it('rejects unknown languages, actions and extra fields', () => {
    expect(codeReviewRequestSchema.safeParse({ ...request, language: 'ruby' }).success).toBe(false);
    expect(codeReviewRequestSchema.safeParse({ ...request, action: 'run' }).success).toBe(false);
    expect(codeReviewRequestSchema.safeParse({ ...request, plan: 'pro' }).success).toBe(false);
  });

  it('reports input issues as stable keys', () => {
    const result = codeReviewRequestSchema.safeParse({
      ...request,
      code: lines(MAX_CODE_REVIEW_LINES + 1),
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual(['tooManyLines']);
    const huge = codeReviewRequestSchema.safeParse({
      ...request,
      code: 'a'.repeat(MAX_CODE_REVIEW_CHARS * 2 + 1),
    });
    expect(huge.error?.issues.map((issue) => issue.message)).toEqual(['tooManyChars']);
    const empty = codeReviewRequestSchema.safeParse({ ...request, code: '   ' });
    expect(empty.error?.issues.map((issue) => issue.message)).toEqual(['empty']);
  });
});

describe('code review output schema', () => {
  it('accepts a valid answer', () => {
    expect(codeReviewOutputSchema.safeParse(validOutput).success).toBe(true);
    expect(
      codeReviewOutputSchema.safeParse({
        ...validOutput,
        steps: ['Declares add', 'Adds'],
        fixedCode: 'function add(a, b) {\n  return a + b;\n}',
        changes: ['Returns the sum'],
      }).success,
    ).toBe(true);
  });

  it('rejects extra fields, unknown enums and bad lines', () => {
    expect(codeReviewOutputSchema.safeParse({ ...validOutput, html: '<b>' }).success).toBe(false);
    expect(codeReviewOutputSchema.safeParse({ ...validOutput, confidence: 'sure' }).success).toBe(
      false,
    );
    const issue = validOutput.issues[0];
    expect(
      codeReviewOutputSchema.safeParse({ ...validOutput, issues: [{ ...issue, line: 0 }] }).success,
    ).toBe(false);
    expect(
      codeReviewOutputSchema.safeParse({
        ...validOutput,
        issues: [{ ...issue, severity: 'fatal' }],
      }).success,
    ).toBe(false);
  });

  it('describes the API response without the code', () => {
    const response = {
      review: validOutput,
      provider: 'mock',
      promptVersion: 'code-review/v2',
      requestId: 'r-1',
      input: { language: 'python', action: 'review', chars: 10, lines: 2 },
      usage: { inputTokens: 1, outputTokens: 2, quota: { used: 1, limit: 10, period: 'month' } },
    };
    expect(codeReviewResponseSchema.safeParse(response).success).toBe(true);
    expect(
      codeReviewResponseSchema.safeParse({ ...response, input: { ...response.input, code: 'x' } })
        .success,
    ).toBe(false);
  });
});
