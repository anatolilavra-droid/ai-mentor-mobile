import { ApiError, FinishReason, GoogleGenAI, type GenerateContentResponse } from '@google/genai';

import {
  AIProviderError,
  type AIProvider,
  type ChatMessage,
  type CodeReviewResult,
  type GenerateTextResult,
} from './AIProvider.js';

/** The one SDK call the adapter uses. Tests replace it; no network is needed. */
export type GeminiModels = Pick<GoogleGenAI['models'], 'generateContent'>;

/**
 * Thinking models count their reasoning against maxOutputTokens, so the limit
 * gets headroom on top of the prompt's answer budget. Tune with the smoke test.
 */
const THINKING_HEADROOM_TOKENS = 4_096;

const BLOCKED_FINISH_REASONS = new Set<string>([
  FinishReason.SAFETY,
  FinishReason.RECITATION,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
]);

/** The only schema keywords sent to Gemini: the shape of the answer, nothing else. */
const SHAPE_KEYWORDS = new Set(['type', 'properties', 'required', 'items', 'enum']);

/**
 * Reduces a JSON Schema to its shape. Gemini rejects some keywords that
 * z.toJSONSchema emits (`$schema`, large integer bounds, ...) with
 * 400 INVALID_ARGUMENT. Lengths, bounds and extra fields are still enforced:
 * AIService validates every answer against the full Zod schema.
 */
export function toGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (typeof schema !== 'object' || schema === null) return schema;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (!SHAPE_KEYWORDS.has(key)) continue;
    if (key === 'properties' && typeof value === 'object' && value !== null) {
      result.properties = Object.fromEntries(
        Object.entries(value).map(([name, property]) => [name, toGeminiSchema(property)]),
      );
    } else if (key === 'items') {
      result.items = toGeminiSchema(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function toContents(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }));
}

/** Translates SDK failures into provider-neutral errors. Abort errors pass through. */
function toProviderError(error: unknown, signal: AbortSignal): unknown {
  if (signal.aborted) return error;
  if (error instanceof ApiError) {
    if (error.status === 429)
      return new AIProviderError('rate_limited', 'Gemini rate limit', { cause: error });
    if (error.status === 408 || error.status === 504) {
      return new AIProviderError('timeout', 'Gemini timeout', { cause: error });
    }
    return new AIProviderError('unavailable', `Gemini error ${error.status}`, { cause: error });
  }
  return new AIProviderError('unavailable', 'Gemini request failed', { cause: error });
}

/** Rejects blocked answers and reads text and token usage. */
function readResponse(response: GenerateContentResponse) {
  if (response.promptFeedback?.blockReason) {
    throw new AIProviderError(
      'refused',
      `Gemini blocked the prompt: ${response.promptFeedback.blockReason}`,
    );
  }
  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason && BLOCKED_FINISH_REASONS.has(finishReason)) {
    throw new AIProviderError('refused', `Gemini stopped: ${finishReason}`);
  }
  const text = response.text?.trim() ?? '';
  if (!text) {
    throw new AIProviderError(
      'invalid_response',
      `Gemini returned no text (${finishReason ?? 'unknown'})`,
    );
  }
  const usage = response.usageMetadata;
  return {
    text,
    finishReason,
    usage: {
      inputTokens: usage?.promptTokenCount ?? 0,
      // Thinking tokens are billed as output.
      outputTokens: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
    },
  };
}

export type GeminiProviderOptions = {
  apiKey: string;
  model: string;
  /** Tests inject a fake; production builds the official client. */
  models?: GeminiModels;
};

/**
 * Google Gemini through the official SDK. The key stays on the server. The SDK
 * does not retry by default, so a call never outlives the AI timeout.
 */
export function createGeminiProvider(options: GeminiProviderOptions): AIProvider {
  const models = options.models ?? new GoogleGenAI({ apiKey: options.apiKey }).models;
  const { model } = options;

  async function generate(
    system: string,
    messages: ChatMessage[],
    maxOutputTokens: number,
    signal: AbortSignal,
    json?: { schema: unknown },
  ) {
    try {
      return await models.generateContent({
        model,
        contents: toContents(messages),
        config: {
          systemInstruction: system,
          maxOutputTokens: maxOutputTokens + THINKING_HEADROOM_TOKENS,
          abortSignal: signal,
          ...(json
            ? {
                responseMimeType: 'application/json',
                responseJsonSchema: toGeminiSchema(json.schema),
              }
            : {}),
        },
      });
    } catch (error) {
      throw toProviderError(error, signal);
    }
  }

  return {
    name: 'gemini',

    async generateText(input): Promise<GenerateTextResult> {
      const response = await generate(
        input.system,
        input.messages,
        input.maxOutputTokens,
        input.signal,
      );
      const { text, finishReason, usage } = readResponse(response);
      return {
        text,
        model: response.modelVersion ?? model,
        usage,
        finishReason:
          finishReason === FinishReason.STOP
            ? 'stop'
            : finishReason === FinishReason.MAX_TOKENS
              ? 'length'
              : 'other',
      };
    },

    async reviewCode(input): Promise<CodeReviewResult> {
      const response = await generate(
        input.system,
        input.messages,
        input.maxOutputTokens,
        input.signal,
        {
          schema: input.outputJsonSchema,
        },
      );
      const { text, usage } = readResponse(response);
      let output: unknown;
      try {
        output = JSON.parse(text);
      } catch (error) {
        throw new AIProviderError('invalid_response', 'Gemini returned invalid JSON', {
          cause: error,
        });
      }
      return { output, model: response.modelVersion ?? model, usage };
    },
  };
}
