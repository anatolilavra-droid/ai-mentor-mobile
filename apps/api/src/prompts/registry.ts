import { chatV2 } from './chat/v2.js';
import { codeReviewV2 } from './code-review/v2.js';

/**
 * The prompt version each feature uses. Switching a feature to a new version
 * is a one-line change here; old versions (chat/v1, code-review/v1) stay for reference and comparison.
 */
export const prompts = {
  chat: chatV2,
  codeReview: codeReviewV2,
} as const;
