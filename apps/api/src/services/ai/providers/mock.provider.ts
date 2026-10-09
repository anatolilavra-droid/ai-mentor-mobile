import type {
  AIProvider,
  CodeReviewInput,
  CodeReviewResult,
  GenerateTextInput,
  GenerateTextResult,
} from './AIProvider.js';

const MOCK_MODEL = 'mock-mentor-1';

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
      const output = {
        summary: `Mock ${input.task} review of ${input.language} code (no real AI was called).`,
        issues: [],
        nextStep: 'Read the code line by line and describe what each part does.',
      };
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
