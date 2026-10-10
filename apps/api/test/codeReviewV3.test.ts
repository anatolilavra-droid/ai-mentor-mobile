import type { CodeReviewOutput } from '@ai-mentor/shared';
import { describe, expect, it } from 'vitest';

import { codeReviewV2 } from '../src/prompts/code-review/v2.js';
import { codeReviewV3 } from '../src/prompts/code-review/v3.js';
import type { LearnerContext } from '../src/prompts/types.js';
import { isFixedCodeCollapsed } from '../src/services/ai/finalizeReview.js';

const learner: LearnerContext = {
  level: 'beginner',
  learningGoal: 'learn_javascript',
  technology: null,
  answerLanguage: 'en',
  technologies: ['javascript'],
  dailyMinutes: 30,
};

const input = { language: 'javascript', action: 'fix', code: 'let a = 1\nlet b = 2' } as const;

describe('code-review/v3 prompt', () => {
  it('asks for the whole fixed program with its line breaks', () => {
    const { system } = codeReviewV3.build(input, learner);

    expect(codeReviewV3.ref).toBe('code-review/v3');
    expect(system).toContain('keep the original line breaks');
    expect(system).toContain('one statement per line');
    expect(system).toContain('write each line break\n  as \\n.');
    expect(system).toContain('Never squeeze the program onto one line.');
  });

  it('keeps everything else from v2', () => {
    const v2 = codeReviewV2.build(input, learner);
    const v3 = codeReviewV3.build(input, learner);

    expect(v3.messages).toEqual(v2.messages);
    expect(v3.system.startsWith(v2.system.split('"fixedCode" is plain code')[0] ?? '')).toBe(true);
    expect(codeReviewV3.outputSchema).toBe(codeReviewV2.outputSchema);
    expect(codeReviewV3.maxOutputTokens).toBe(codeReviewV2.maxOutputTokens);
  });

  it('leaves the published v2 unchanged', () => {
    expect(codeReviewV2.ref).toBe('code-review/v2');
    expect(codeReviewV2.build(input, learner).system).not.toContain('line breaks');
  });
});

describe('isFixedCodeCollapsed', () => {
  const review = (fixedCode?: string): CodeReviewOutput => ({
    summary: 's',
    issues: [],
    ...(fixedCode !== undefined ? { fixedCode } : {}),
    nextStep: 'n',
    confidence: 'high',
  });

  it('flags multi-line input fixed on one line', () => {
    expect(isFixedCodeCollapsed(review('let a = 1; let b = 2;'), 2)).toBe(true);
    expect(isFixedCodeCollapsed(review('\nlet a = 1; let b = 2;\n'), 2)).toBe(true);
  });

  it('accepts multi-line fixed code, one-line input and reviews without code', () => {
    expect(isFixedCodeCollapsed(review('let a = 1;\nlet b = 2;'), 2)).toBe(false);
    expect(isFixedCodeCollapsed(review('let a = 1;'), 1)).toBe(false);
    expect(isFixedCodeCollapsed(review(), 7)).toBe(false);
  });
});
