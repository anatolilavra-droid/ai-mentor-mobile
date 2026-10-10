import { MAX_CODE_REVIEW_LINES } from '@ai-mentor/shared';

import { codeReviewErrorKey } from '@/features/code-review/codeReview.errors';
import { useCodeReviewStore } from '@/features/code-review/codeReview.store';
import { createApiClient } from '@/lib/api/client';
import { ApiError, isRetryable } from '@/lib/api/errors';

const reviewResponse = {
  review: {
    summary: 'Looks fine.',
    issues: [],
    nextStep: 'Add a test.',
    confidence: 'high',
  },
  provider: 'gemini',
  promptVersion: 'code-review/v2',
  requestId: 'req-1',
  input: { language: 'python', action: 'review', chars: 8, lines: 1 },
  usage: { inputTokens: 10, outputTokens: 5, quota: { used: 1, limit: 10, period: 'month' } },
};

const json = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

function setup(respond: (init: RequestInit) => Promise<Response>) {
  const fetchImpl = jest.fn((_url: string, init: RequestInit) => respond(init));
  const client = createApiClient({
    baseUrl: 'https://api.test',
    getAccessToken: async () => 'token-1',
    fetchImpl: fetchImpl as unknown as typeof fetch,
    createRequestId: () => 'fixed-request-id',
    timeoutMs: 1_000,
  });
  return { client, fetchImpl };
}

const request = { language: 'python', action: 'review', code: 'print(1)' } as const;

describe('code review API client', () => {
  it('posts the request and validates the response', async () => {
    const { client, fetchImpl } = setup(async () => json(200, reviewResponse));

    await expect(client.codeReview(request)).resolves.toEqual(reviewResponse);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.test/api/ai/code-review',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(request) }),
    );
  });

  it('keeps validation details as stable keys', async () => {
    const { client } = setup(async () =>
      json(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid',
          requestId: 'r',
          details: [{ path: 'code', message: 'tooManyLines' }],
        },
      }),
    );

    const error = await client.codeReview(request).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).details).toEqual([{ path: 'code', message: 'tooManyLines' }]);
    expect(codeReviewErrorKey(error)).toBe('codeReview.input.tooManyLines');
  });

  it('reports a caller abort as CANCELLED, not as a network error', async () => {
    const { client } = setup(
      (init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const controller = new AbortController();
    const pending = client.codeReview(request, controller.signal);
    controller.abort();

    await expect(pending).rejects.toMatchObject({ code: 'CANCELLED' });
    expect(isRetryable(new ApiError('CANCELLED'))).toBe(false);
  });
});

describe('code review error messages', () => {
  it.each([
    ['TIMEOUT', 'codeReview.errors.timeout'],
    ['CLIENT_TIMEOUT', 'codeReview.errors.timeout'],
    ['AI_INVALID_RESPONSE', 'codeReview.errors.invalidResponse'],
    ['NETWORK', 'chat.errors.network'],
    ['RATE_LIMITED', 'chat.errors.rateLimited'],
    ['AI_PROVIDER_ERROR', 'chat.errors.unavailable'],
    ['AI_PROVIDER_BUSY', 'codeReview.errors.busy'],
  ] as const)('%s → %s', (code, key) => {
    expect(codeReviewErrorKey(new ApiError(code))).toBe(key);
  });

  it('ignores unknown validation details', () => {
    const error = new ApiError('VALIDATION_ERROR', {
      details: [{ path: 'code', message: `more than ${MAX_CODE_REVIEW_LINES}` }],
    });
    expect(codeReviewErrorKey(error)).toBe('chat.errors.invalid');
  });

  it('offers Retry for temporary failures only', () => {
    expect(isRetryable(new ApiError('TIMEOUT'))).toBe(true);
    expect(isRetryable(new ApiError('AI_INVALID_RESPONSE'))).toBe(true);
    expect(isRetryable(new ApiError('AI_PROVIDER_BUSY'))).toBe(true);
    expect(isRetryable(new ApiError('USAGE_LIMIT_REACHED'))).toBe(false);
    expect(isRetryable(new ApiError('VALIDATION_ERROR'))).toBe(false);
  });
});

describe('code review store', () => {
  it('starts over without forgetting the language and action, and clears fully', () => {
    const store = useCodeReviewStore.getState();
    store.setLanguage('python');
    store.setAction('fix');
    store.setCode('print(1)');
    store.startOver();
    expect(useCodeReviewStore.getState()).toMatchObject({
      language: 'python',
      action: 'fix',
      code: '',
      result: null,
    });

    store.setCode('x');
    store.clear();
    expect(useCodeReviewStore.getState()).toMatchObject({
      language: 'javascript',
      action: 'explain',
      code: '',
    });
  });
});
