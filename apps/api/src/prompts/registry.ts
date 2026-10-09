import { chatV1 } from './chat/v1.js';
import { codeReviewV1 } from './code-review/v1.js';

/**
 * The prompt version each feature uses. Switching a feature to a new version
 * is a one-line change here; old versions stay for reference and comparison.
 */
export const prompts = {
  chat: chatV1,
  codeReview: codeReviewV1,
} as const;
