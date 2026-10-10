import type { CodeLanguage } from '@ai-mentor/shared';

import type {
  AIProvider,
  CodeReviewInput,
  CodeReviewResult,
  GenerateTextInput,
  GenerateTextResult,
} from './AIProvider.js';

const MOCK_MODEL = 'mock-mentor-1';

const DEMO_NOTE = 'Demo review: no real AI was called, the code is unchanged';

/** A demo marker in the language's own comment syntax (JSON has none). */
const COMMENT: Record<CodeLanguage, ((text: string) => string) | null> = {
  javascript: (text) => `// ${text}`,
  typescript: (text) => `// ${text}`,
  python: (text) => `# ${text}`,
  css: (text) => `/* ${text} */`,
  html: (text) => `<!-- ${text} -->`,
  json: null,
};

/** The learner's code back from the prompt's <learner_code> block. */
function codeFromMessages(input: CodeReviewInput): string {
  const content = input.messages.findLast((message) => message.role === 'user')?.content ?? '';
  const match = /^<learner_code[^>]*>\n([\s\S]*)\n<\/learner_code>$/.exec(content);
  return match?.[1] ?? '';
}

/**
 * A deterministic answer that fills every part of the result screen for the
 * chosen action, so demo accounts and tests see the whole flow.
 */
function mockReview(input: CodeReviewInput) {
  const code = codeFromMessages(input);
  const base = {
    summary: `Mock ${input.action} of ${input.language} code (no real AI was called).`,
    issues: [
      {
        severity: 'info',
        category: 'readability',
        line: 1,
        title: 'Demo issue',
        explanation: 'This is a sample issue that shows how real findings will look.',
        suggestion: 'Read the code line by line and describe what each part does.',
      },
    ],
    nextStep: 'Read the code line by line and describe what each part does.',
    confidence: 'low',
  };
  if (input.action === 'explain') {
    return {
      ...base,
      steps: ['The demo reads your code.', 'A real review explains it step by step here.'],
    };
  }
  if (input.action === 'review') return base;
  const comment = COMMENT[input.language];
  return {
    ...base,
    fixedCode: comment ? `${comment(DEMO_NOTE)}\n${code}` : code,
    changes: [comment ? 'Added a demo comment at the top.' : 'No changes in the demo.'],
  };
}

/** Rough token estimate for the placeholder usage numbers. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Deterministic provider for development and tests. It never calls an external
 * AI API and needs no API key.
 */
export function createMockProvider(options: { delayMs?: number } = {}): AIProvider {
  const delayMs = options.delayMs ?? 0;

  return {
    name: 'mock',

    async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
      if (delayMs > 0) await sleep(delayMs, input.signal);
      const question = input.messages.findLast((message) => message.role === 'user')?.content ?? '';
      const preview = question.length > 80 ? `${question.slice(0, 80)}…` : question;
      const text = [
        'This is a mock answer from the AI mentor (no real AI was called).',
        `You asked: "${preview}"`,
        'Next step: try explaining the idea in your own words.',
      ].join('\n');
      return {
        text,
        model: MOCK_MODEL,
        usage: {
          inputTokens: estimateTokens(input.system) + estimateTokens(question),
          outputTokens: estimateTokens(text),
        },
        finishReason: 'stop',
      };
    },

    async reviewCode(input: CodeReviewInput): Promise<CodeReviewResult> {
      if (delayMs > 0) await sleep(delayMs, input.signal);
      const output = mockReview(input);
      return {
        output,
        model: MOCK_MODEL,
        usage: {
          inputTokens:
            estimateTokens(input.system) +
            input.messages.reduce((sum, message) => sum + estimateTokens(message.content), 0),
          outputTokens: estimateTokens(JSON.stringify(output)),
        },
      };
    },
  };
}
