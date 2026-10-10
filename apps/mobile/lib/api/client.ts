import {
  chatResponseSchema,
  codeReviewResponseSchema,
  errorResponseSchema,
  usageResponseSchema,
  type ChatRequest,
  type ChatResponse,
  type CodeReviewRequest,
  type CodeReviewResponse,
  type UsageResponse,
} from '@ai-mentor/shared';
import * as Crypto from 'expo-crypto';
import type { z } from 'zod';

import { requireSupabase } from '@/lib/supabase/client';

import { apiBaseUrl } from './config';
import { ApiError } from './errors';

/** A free Render service can need up to a minute to wake up. */
export const API_TIMEOUT_MS = 90_000;

export type ApiClientDeps = {
  baseUrl: string | null;
  /** The current access token; `refresh` forces a new one (after a 401). */
  getAccessToken: (refresh: boolean) => Promise<string | null>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  createRequestId?: () => string;
};

/** RFC 4122 v4 id from secure random bytes, sent as X-Request-Id. */
export function createRequestId(): string {
  const bytes = Crypto.getRandomBytes(16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Supabase keeps the session fresh; after a 401 we ask it for a new token once. */
async function supabaseAccessToken(refresh: boolean): Promise<string | null> {
  const auth = requireSupabase().auth;
  if (refresh) {
    const { data } = await auth.refreshSession();
    return data.session?.access_token ?? null;
  }
  const { data } = await auth.getSession();
  return data.session?.access_token ?? null;
}

type RequestOptions<T extends z.ZodType> = {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  schema: T;
  signal?: AbortSignal;
};

export function createApiClient(deps: ApiClientDeps) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? API_TIMEOUT_MS;
  const newRequestId = deps.createRequestId ?? createRequestId;

  async function send<T extends z.ZodType>(
    options: RequestOptions<T>,
    retriedAuth: boolean,
  ): Promise<z.infer<T>> {
    if (!deps.baseUrl) throw new ApiError('NOT_CONFIGURED');
    const token = await deps.getAccessToken(retriedAuth);
    if (!token) throw new ApiError('UNAUTHORIZED');
    // The caller may have given up while the token was loading.
    if (options.signal?.aborted) throw new ApiError('CANCELLED');

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onCallerAbort = () => controller.abort();
    options.signal?.addEventListener('abort', onCallerAbort, { once: true });

    let response: Response;
    try {
      response = await fetchImpl(`${deps.baseUrl}${options.path}`, {
        method: options.method,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Request-Id': newRequestId(),
          ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch (error) {
      if (timedOut) throw new ApiError('CLIENT_TIMEOUT', { cause: error });
      if (options.signal?.aborted) throw new ApiError('CANCELLED', { cause: error });
      throw new ApiError('NETWORK', { cause: error });
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', onCallerAbort);
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (error) {
      throw new ApiError('BAD_RESPONSE', { status: response.status, cause: error });
    }

    if (!response.ok) {
      const parsed = errorResponseSchema.safeParse(json);
      if (!parsed.success) throw new ApiError('BAD_RESPONSE', { status: response.status });
      const { code, requestId, quota, details } = parsed.data.error;
      if (code === 'UNAUTHORIZED' && !retriedAuth) return send(options, true);
      throw new ApiError(code, { status: response.status, requestId, quota, details });
    }

    const parsed = options.schema.safeParse(json);
    if (!parsed.success)
      throw new ApiError('BAD_RESPONSE', { status: response.status, cause: parsed.error });
    return parsed.data;
  }

  return {
    chat(body: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
      return send(
        { method: 'POST', path: '/api/ai/chat', body, schema: chatResponseSchema, signal },
        false,
      );
    },
    /** One code review. Never retried automatically: every call may use the AI quota. */
    codeReview(body: CodeReviewRequest, signal?: AbortSignal): Promise<CodeReviewResponse> {
      return send(
        {
          method: 'POST',
          path: '/api/ai/code-review',
          body,
          schema: codeReviewResponseSchema,
          signal,
        },
        false,
      );
    },
    usage(signal?: AbortSignal): Promise<UsageResponse> {
      return send(
        { method: 'GET', path: '/api/usage', schema: usageResponseSchema, signal },
        false,
      );
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** The app's client: configured URL and the Supabase session token. */
export const apiClient = createApiClient({
  baseUrl: apiBaseUrl,
  getAccessToken: supabaseAccessToken,
});
