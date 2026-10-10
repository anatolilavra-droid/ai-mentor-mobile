import { createApiClient } from '@/lib/api/client';
import { ApiError, apiErrorMessageKey, isRetryable } from '@/lib/api/errors';

const chatResponse = {
  answer: 'Hello',
  provider: 'gemini',
  promptVersion: 'chat/v2',
  requestId: 'req-1',
  usage: { inputTokens: 10, outputTokens: 5, quota: { used: 1, limit: 30, period: 'month' } },
  context: { historyUsed: 0, historyDropped: 0 },
};

const json = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

function setup(
  responses: (Response | Error)[],
  tokens: (string | null)[] = ['token-1', 'token-2'],
) {
  const fetchImpl = jest.fn(async () => {
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return next as Response;
  });
  const getAccessToken = jest.fn(async (refresh: boolean) => tokens[refresh ? 1 : 0] ?? null);
  const client = createApiClient({
    baseUrl: 'https://api.test',
    getAccessToken,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    createRequestId: () => 'fixed-request-id',
    timeoutMs: 50,
  });
  return { client, fetchImpl, getAccessToken };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ name: 'ApiError', code });
}

describe('API client', () => {
  it('sends the token, request id and JSON body, and validates the answer', async () => {
    const { client, fetchImpl } = setup([json(200, chatResponse)]);

    await expect(client.chat({ message: 'Hi', history: [] })).resolves.toEqual(chatResponse);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.test/api/ai/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: 'Hi', history: [] }),
        headers: expect.objectContaining({
          Authorization: 'Bearer token-1',
          'X-Request-Id': 'fixed-request-id',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('refreshes the session once after a 401 and retries', async () => {
    const unauthorized = { error: { code: 'UNAUTHORIZED', message: 'x', requestId: 'r' } };
    const { client, fetchImpl, getAccessToken } = setup([
      json(401, unauthorized),
      json(200, chatResponse),
    ]);

    await expect(client.chat({ message: 'Hi' })).resolves.toMatchObject({ answer: 'Hello' });
    expect(getAccessToken).toHaveBeenLastCalledWith(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('gives up after a second 401', async () => {
    const unauthorized = { error: { code: 'UNAUTHORIZED', message: 'x', requestId: 'r' } };
    const { client, fetchImpl } = setup([json(401, unauthorized), json(401, unauthorized)]);

    await expectCode(client.chat({ message: 'Hi' }), 'UNAUTHORIZED');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('maps the API error format, including quota details', async () => {
    const quota = { feature: 'chat', used: 30, limit: 30, resetsAt: '2026-11-01T00:00:00.000Z' };
    const { client } = setup([
      json(429, { error: { code: 'USAGE_LIMIT_REACHED', message: 'x', requestId: 'r-9', quota } }),
    ]);

    await expect(client.chat({ message: 'Hi' })).rejects.toMatchObject({
      code: 'USAGE_LIMIT_REACHED',
      status: 429,
      requestId: 'r-9',
      quota,
    });
  });

  it('reports network failures, timeouts and malformed answers', async () => {
    await expectCode(
      setup([new TypeError('Network request failed')]).client.chat({ message: 'Hi' }),
      'NETWORK',
    );
    await expectCode(
      setup([json(200, { answer: 'no schema' })]).client.chat({ message: 'Hi' }),
      'BAD_RESPONSE',
    );
    await expectCode(
      setup([json(500, '<html>oops</html>')]).client.chat({ message: 'Hi' }),
      'BAD_RESPONSE',
    );

    const slow = createApiClient({
      baseUrl: 'https://api.test',
      getAccessToken: async () => 'token',
      timeoutMs: 20,
      createRequestId: () => 'id',
      fetchImpl: ((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        })) as unknown as typeof fetch,
    });
    await expectCode(slow.chat({ message: 'Hi' }), 'CLIENT_TIMEOUT');
  });

  it('does not call the network without a URL or a session', async () => {
    const fetchImpl = jest.fn();
    const noUrl = createApiClient({ baseUrl: null, getAccessToken: async () => 't', fetchImpl });
    const noSession = createApiClient({
      baseUrl: 'https://api.test',
      getAccessToken: async () => null,
      fetchImpl,
    });

    await expectCode(noUrl.usage(), 'NOT_CONFIGURED');
    await expectCode(noSession.usage(), 'UNAUTHORIZED');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('API error messages', () => {
  it('maps every failure to a translated message and a retry decision', () => {
    expect(apiErrorMessageKey(new ApiError('NETWORK'))).toBe('chat.errors.network');
    expect(apiErrorMessageKey(new ApiError('TIMEOUT'))).toBe('chat.errors.timeout');
    expect(apiErrorMessageKey(new ApiError('AI_PROVIDER_ERROR'))).toBe('chat.errors.unavailable');
    expect(apiErrorMessageKey(new ApiError('AI_PROVIDER_BUSY'))).toBe('chat.errors.busy');
    expect(isRetryable(new ApiError('AI_PROVIDER_BUSY'))).toBe(true);
    expect(apiErrorMessageKey(new Error('x'))).toBe('chat.errors.generic');
    expect(isRetryable(new ApiError('NETWORK'))).toBe(true);
    expect(isRetryable(new ApiError('USAGE_LIMIT_REACHED'))).toBe(false);
  });
});
