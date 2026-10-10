import type { Request } from 'express';

import { AppError } from '../errors/AppError.js';
import { getRequestId } from '../middleware/requestId.js';
import type {
  ChatRequest,
  ChatResponse,
  CodeReviewResponse,
  ParsedCodeReviewRequest,
} from '@ai-mentor/shared';
import type { AICall, AIService } from '../services/ai/ai.service.js';

function toCall(req: Request): AICall {
  if (!req.auth) throw new AppError('UNAUTHORIZED');
  return {
    userId: req.auth.userId,
    accessToken: req.auth.accessToken,
    signal: req.abortSignal,
    log: req.log,
  };
}

export function createChatHandler(aiService: AIService) {
  return async ({ req, body }: { req: Request; body: ChatRequest }): Promise<ChatResponse> => {
    const result = await aiService.chat(toCall(req), body);
    return { ...result, requestId: getRequestId(req) };
  };
}

export function createCodeReviewHandler(aiService: AIService) {
  return async ({
    req,
    body,
  }: {
    req: Request;
    body: ParsedCodeReviewRequest;
  }): Promise<CodeReviewResponse> => {
    const result = await aiService.reviewCode(toCall(req), body);
    return { ...result, requestId: getRequestId(req) };
  };
}
