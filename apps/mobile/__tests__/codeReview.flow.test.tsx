import {
  MAX_CODE_REVIEW_CHARS,
  MAX_CODE_REVIEW_LINES,
  type CodeReviewResponse,
} from '@ai-mentor/shared';
import * as Clipboard from 'expo-clipboard';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert, TextInput, type AlertButton } from 'react-native';

import { useCodeReviewStore } from '@/features/code-review/codeReview.store';
import { apiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

import { completeProfile, testSession } from './fixtures';

/**
 * The code review flow through the real routes (Home → input → result → back),
 * with the API client mocked.
 */
jest.mock('@/lib/api/config', () => ({ apiBaseUrl: 'https://api.test' }));
jest.mock('@/lib/api/client', () => ({
  API_TIMEOUT_MS: 90_000,
  apiClient: { chat: jest.fn(), usage: jest.fn(), codeReview: jest.fn() },
}));

type FakeSupabase = typeof import('@/lib/supabase/__mocks__/client');
const fake = jest.requireMock('@/lib/supabase/client') as FakeSupabase;
const api = apiClient as jest.Mocked<typeof apiClient>;

const TIMEOUT = { timeout: 10000 };
jest.setTimeout(30000);

const CODE = 'function add(a, b) {\n  a + b;\n}';

function response(overrides: Partial<CodeReviewResponse> = {}): CodeReviewResponse {
  return {
    review: {
      summary: 'The function never returns the sum.',
      issues: [
        {
          severity: 'error',
          category: 'bug',
          line: 2,
          title: 'Missing return',
          explanation: 'The sum is computed and dropped.',
          suggestion: 'Return a + b.',
        },
      ],
      fixedCode: 'function add(a, b) {\n  return a + b;\n}',
      changes: ['Returns the sum.'],
      nextStep: 'Write a test for add().',
      confidence: 'high',
    },
    provider: 'gemini',
    promptVersion: 'code-review/v3',
    requestId: 'r',
    input: { language: 'javascript', action: 'fix', chars: CODE.length, lines: 3 },
    usage: { inputTokens: 1, outputTokens: 1, quota: { used: 4, limit: 10, period: 'month' } },
    ...overrides,
  };
}

const usage = {
  plan: 'free' as const,
  period: { start: '2026-10-01', end: '2026-11-01' },
  features: { chat: { used: 1, limit: 30 }, code_review: { used: 3, limit: 10 } },
};

/** Answers the secret dialog with the button labelled `choice`. */
function answerAlert(choice: 'Cancel' | 'Send anyway') {
  return jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    (buttons as AlertButton[]).find((button) => button.text === choice)?.onPress?.();
  });
}

async function openInput(initialUrl = '/code-review') {
  const router = renderRouter('./app', { initialUrl });
  expect(await screen.findByTestId('code-review-screen', {}, TIMEOUT)).toBeOnTheScreen();
  return router;
}

function typeCode(code: string) {
  fireEvent.changeText(screen.getByTestId('code-review-input'), code);
}

beforeEach(() => {
  fake.fakeDb.session = testSession;
  fake.fakeDb.profile = { ...completeProfile };
  useCodeReviewStore.getState().clear();
  api.usage.mockResolvedValue(usage);
  api.codeReview.mockReset();
});

describe('code review flow', () => {
  it('opens from Home with the action preselected and goes back to Home', async () => {
    const router = renderRouter('./app', { initialUrl: '/' });
    expect(await screen.findByTestId('next-step-card', {}, TIMEOUT)).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('quick-action-fix'));
    expect(await screen.findByTestId('code-review-screen')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/code-review');
    expect(screen.getByTestId('code-review-action-fix')).toBeChecked();
    expect(screen.queryByTestId('tab-bar')).toBeNull();

    fireEvent.press(screen.getByTestId('code-review-back'));
    expect(await screen.findByTestId('home-screen')).toBeOnTheScreen();
  });

  it('opens from the chat header', async () => {
    const router = renderRouter('./app', { initialUrl: '/chat' });
    fireEvent.press(await screen.findByTestId('chat-open-code-review', {}, TIMEOUT));
    expect(await screen.findByTestId('code-review-screen')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/code-review');
  });

  it('does not override typed code with the action parameter', async () => {
    useCodeReviewStore.getState().setAction('review');
    useCodeReviewStore.getState().setCode('x = 1');
    await openInput('/code-review?action=fix');
    expect(screen.getByTestId('code-review-action-review')).toBeChecked();
  });

  it('shows live counters and blocks sending over either limit', async () => {
    await openInput();
    expect(await screen.findByText('3 / 10 this month')).toBeOnTheScreen();
    expect(screen.getByTestId('code-review-submit')).toBeDisabled();

    typeCode(CODE);
    expect(screen.getByTestId('code-review-counter')).toHaveTextContent(
      `${CODE.length} / 8,000 characters · 3 / 400 lines`,
    );
    expect(screen.getByTestId('code-review-submit')).toBeEnabled();

    typeCode('a'.repeat(MAX_CODE_REVIEW_CHARS + 1));
    expect(screen.getByTestId('code-review-input-error')).toHaveTextContent(
      'The code is longer than 8,000 characters. Shorten it to continue.',
    );
    expect(screen.getByTestId('code-review-submit')).toBeDisabled();

    typeCode(Array.from({ length: MAX_CODE_REVIEW_LINES + 1 }, () => 'x').join('\n'));
    expect(screen.getByTestId('code-review-input-error')).toHaveTextContent(
      'The code has more than 400 lines. Shorten it to continue.',
    );
    expect(screen.getByTestId('code-review-submit')).toBeDisabled();

    fireEvent.press(screen.getByTestId('code-review-submit'));
    expect(api.codeReview).not.toHaveBeenCalled();
  });

  it('orders the form as language, code, action', async () => {
    await openInput();
    const ids = screen
      .getAllByTestId(/^code-review-(language|input|action)$/)
      .map((element) => element.props.testID as string);
    expect(ids).toEqual(['code-review-language', 'code-review-input', 'code-review-action']);
    // Code is shown glyph by glyph: no `<=` → ⩽ or `++` ligatures.
    expect(screen.getByTestId('code-review-input')).toHaveStyle({
      fontVariant: ['no-common-ligatures', 'no-contextual'],
    });
  });

  it('explains the disabled button and points to the code field when pressed', async () => {
    const focus = jest.mocked((TextInput.prototype as unknown as { focus: () => void }).focus);
    await openInput();
    expect(screen.getByTestId('code-review-submit-hint')).toHaveTextContent(
      'Paste your code to start the review.',
    );

    fireEvent.press(screen.getByTestId('code-review-submit'));
    expect(focus).toHaveBeenCalledTimes(1);
    expect(api.codeReview).not.toHaveBeenCalled();

    typeCode('a'.repeat(MAX_CODE_REVIEW_CHARS + 1));
    expect(screen.getByTestId('code-review-submit-hint')).toHaveTextContent(
      'Fix the problem with your code above to start the review.',
    );

    typeCode(CODE);
    expect(screen.queryByTestId('code-review-submit-hint')).toBeNull();
  });

  it('says the AI service is busy and retries only when asked', async () => {
    api.codeReview.mockRejectedValueOnce(new ApiError('AI_PROVIDER_BUSY', { status: 503 }));
    api.codeReview.mockResolvedValueOnce(response());
    await openInput();
    typeCode(CODE);
    fireEvent.press(screen.getByTestId('code-review-submit'));

    expect(await screen.findByTestId('code-review-error')).toHaveTextContent(
      'The AI service is overloaded right now. Try again in a minute.',
    );
    expect(api.codeReview).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId('code-review-retry'));
    expect(await screen.findByTestId('code-review-result-screen')).toBeOnTheScreen();
    expect(api.codeReview).toHaveBeenCalledTimes(2);
  });

  it('sends, shows the result, copies the code and keeps the input on Back', async () => {
    api.codeReview.mockResolvedValue(response());
    const router = await openInput();
    fireEvent.press(screen.getByTestId('code-review-action-fix'));
    typeCode(CODE);
    fireEvent.press(screen.getByTestId('code-review-submit'));

    expect(await screen.findByTestId('code-review-result-screen')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/code-review/result');
    expect(api.codeReview).toHaveBeenCalledWith(
      { language: 'javascript', action: 'fix', code: CODE },
      expect.any(AbortSignal),
    );
    expect(screen.getByTestId('code-review-summary')).toHaveTextContent(
      'The function never returns the sum.',
    );
    expect(screen.getByText('Missing return')).toBeOnTheScreen();
    expect(screen.getByText('Error · Bug · Line 2')).toBeOnTheScreen();
    expect(screen.getByText('• Returns the sum.')).toBeOnTheScreen();
    expect(screen.queryByText('Demo answer')).toBeNull();

    fireEvent.press(screen.getByTestId('code-copy'));
    await waitFor(() =>
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith(response().review.fixedCode),
    );

    fireEvent.press(screen.getByTestId('code-review-result-back'));
    expect(await screen.findByTestId('code-review-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('code-review-input').props.value).toBe(CODE);
    expect(screen.getByTestId('code-review-action-fix')).toBeChecked();
    expect(await screen.findByText('4 / 10 this month')).toBeOnTheScreen();
  });

  it('marks demo answers and starts a new review on request', async () => {
    api.codeReview.mockResolvedValue(
      response({
        provider: 'mock',
        input: { language: 'python', action: 'explain', chars: 8, lines: 1 },
        review: {
          summary: 'Mock explain.',
          steps: ['Reads the code.'],
          issues: [],
          nextStep: 'Next.',
          confidence: 'low',
        },
      }),
    );
    await openInput();
    typeCode('print(1)');
    fireEvent.press(screen.getByTestId('code-review-submit'));

    expect(await screen.findByText('Demo answer')).toBeOnTheScreen();
    expect(screen.getByText('1. Reads the code.')).toBeOnTheScreen();
    expect(screen.getByTestId('code-review-no-issues')).toBeOnTheScreen();
    expect(screen.queryByTestId('code-copy')).toBeNull();

    fireEvent.press(screen.getByTestId('code-review-new'));
    expect(await screen.findByTestId('code-review-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('code-review-input').props.value).toBe('');
  });

  it('asks before sending a possible secret and sends nothing on Cancel', async () => {
    const alert = answerAlert('Cancel');
    await openInput();
    const code = 'const password = "hunter2hunter2";';
    typeCode(code);
    fireEvent.press(screen.getByTestId('code-review-submit'));

    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    const [title, message] = alert.mock.calls[0] ?? [];
    expect(title).toBe('Possible secret in the code');
    expect(message).toContain('The code may contain a potential secret.');
    expect(message).toContain('Line 1: a password or secret in the code');
    expect(message).not.toContain('hunter2');
    expect(api.codeReview).not.toHaveBeenCalled();
    expect(screen.getByTestId('code-review-input').props.value).toBe(code);
    alert.mockRestore();
  });

  it('sends a possible secret only after "Send anyway"', async () => {
    const alert = answerAlert('Send anyway');
    api.codeReview.mockResolvedValue(response());
    await openInput();
    typeCode('const password = "hunter2hunter2";');
    fireEvent.press(screen.getByTestId('code-review-submit'));

    expect(await screen.findByTestId('code-review-result-screen')).toBeOnTheScreen();
    expect(api.codeReview).toHaveBeenCalledTimes(1);
    alert.mockRestore();
  });

  it('shows a typed timeout error and retries only when asked', async () => {
    api.codeReview.mockRejectedValueOnce(new ApiError('TIMEOUT'));
    api.codeReview.mockResolvedValueOnce(response());
    await openInput();
    typeCode(CODE);
    fireEvent.press(screen.getByTestId('code-review-submit'));

    expect(await screen.findByTestId('code-review-error')).toHaveTextContent(
      'The review took too long. Try again or shorten the code.',
    );
    expect(screen.queryByTestId('code-review-thinking')).toBeNull();
    expect(screen.getByTestId('code-review-submit')).toBeEnabled();
    expect(api.codeReview).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId('code-review-retry'));
    expect(await screen.findByTestId('code-review-result-screen')).toBeOnTheScreen();
    expect(api.codeReview).toHaveBeenCalledTimes(2);
  });

  it('shows the code review limit card without Retry', async () => {
    api.codeReview.mockRejectedValue(
      new ApiError('USAGE_LIMIT_REACHED', {
        quota: { feature: 'code_review', used: 10, limit: 10, resetsAt: '2026-11-01T00:00:00Z' },
      }),
    );
    await openInput();
    typeCode(CODE);
    fireEvent.press(screen.getByTestId('code-review-submit'));

    expect(await screen.findByTestId('code-review-limit')).toBeOnTheScreen();
    expect(screen.getByText("You have used this month's code reviews")).toBeOnTheScreen();
    expect(screen.getByText('10 of 10 reviews used.')).toBeOnTheScreen();
    expect(screen.queryByTestId('code-review-retry')).toBeNull();
  });

  it('cancels a running review and clears the loading state', async () => {
    let signal: AbortSignal | undefined;
    api.codeReview.mockImplementation(
      (_request, requestSignal) =>
        new Promise((_resolve, reject) => {
          signal = requestSignal;
          requestSignal?.addEventListener('abort', () => reject(new ApiError('CANCELLED')));
        }),
    );
    await openInput();
    typeCode(CODE);
    fireEvent.press(screen.getByTestId('code-review-submit'));

    expect(await screen.findByTestId('code-review-thinking')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('code-review-cancel'));

    expect(await screen.findByTestId('code-review-submit')).toBeEnabled();
    expect(signal?.aborted).toBe(true);
    expect(screen.queryByTestId('code-review-error')).toBeNull();
  });

  it('sends the result route back to the input when there is no result', async () => {
    const router = renderRouter('./app', { initialUrl: '/code-review/result' });
    expect(await screen.findByTestId('code-review-screen', {}, TIMEOUT)).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/code-review');
  });

  it('forgets the pasted code on sign out', async () => {
    await openInput();
    typeCode(CODE);
    act(() => fake.emitAuthChange('SIGNED_OUT', null));
    expect(await screen.findByTestId('sign-in-screen', {}, TIMEOUT)).toBeOnTheScreen();
    expect(useCodeReviewStore.getState().code).toBe('');
  });
});
