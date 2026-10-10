import { CODE_INPUT_ISSUES, type CodeInputIssue } from '@ai-mentor/shared';

import { apiErrorMessageKey, isApiError } from '@/lib/api/errors';
import type { TranslationKey } from '@/lib/i18n';

export const INPUT_ISSUE_KEYS: Record<CodeInputIssue, TranslationKey> = {
  empty: 'codeReview.input.empty',
  tooManyChars: 'codeReview.input.tooManyChars',
  tooManyLines: 'codeReview.input.tooManyLines',
  invalidCharacters: 'codeReview.input.invalidCharacters',
};

const isInputIssue = (value: string): value is CodeInputIssue =>
  (CODE_INPUT_ISSUES as readonly string[]).includes(value);

/** The translated message for a failed review. Server details are stable keys, never shown raw. */
export function codeReviewErrorKey(error: unknown): TranslationKey {
  if (!isApiError(error)) return apiErrorMessageKey(error);
  switch (error.code) {
    case 'TIMEOUT':
    case 'CLIENT_TIMEOUT':
      return 'codeReview.errors.timeout';
    case 'AI_INVALID_RESPONSE':
      return 'codeReview.errors.invalidResponse';
    case 'AI_PROVIDER_BUSY':
      return 'codeReview.errors.busy';
    case 'VALIDATION_ERROR': {
      const issue = error.details.find(
        (detail) => detail.path === 'code' && isInputIssue(detail.message),
      )?.message;
      return issue && isInputIssue(issue) ? INPUT_ISSUE_KEYS[issue] : apiErrorMessageKey(error);
    }
    default:
      return apiErrorMessageKey(error);
  }
}
