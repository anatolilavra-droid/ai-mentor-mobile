import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ChatScreen } from '@/features/chat/ChatScreen';
import { useChatStore } from '@/features/chat/chat.store';
import { WAKE_HINT_AFTER_MS } from '@/features/chat/components/ThinkingIndicator';
import { apiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

import { renderWithProviders } from './test-utils';

jest.mock('@/lib/api/config', () => ({ apiBaseUrl: 'https://api.test' }));
jest.mock('@/lib/api/client', () => ({
  apiClient: { chat: jest.fn(), usage: jest.fn() },
}));

const api = apiClient as jest.Mocked<typeof apiClient>;

const usage = (used: number) => ({
  plan: 'free' as const,
  period: { start: '2026-10-01', end: '2026-11-01' },
  features: { chat: { used, limit: 30 }, code_review: { used: 0, limit: 10 } },
});

const answer = (text: string, used: number, provider: 'gemini' | 'mock' = 'gemini') => ({
  answer: text,
  provider,
  promptVersion: 'chat/v2',
  requestId: 'r',
  usage: { inputTokens: 1, outputTokens: 1, quota: { used, limit: 30, period: 'month' as const } },
  context: { historyUsed: 0, historyDropped: 0 },
});

function sendMessage(text: string) {
  fireEvent.changeText(screen.getByTestId('chat-input'), text);
  fireEvent.press(screen.getByTestId('chat-send'));
}

beforeEach(() => {
  useChatStore.getState().reset();
  api.usage.mockResolvedValue(usage(3));
  api.chat.mockReset();
});

describe('ChatScreen', () => {
  it('shows the quota and example questions when empty', async () => {
    renderWithProviders(<ChatScreen />);

    expect(await screen.findByText('3 / 30 this month')).toBeOnTheScreen();
    expect(screen.getByTestId('chat-empty')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('When should I use let and when const?'));
    expect(screen.getByTestId('chat-input').props.value).toBe(
      'When should I use let and when const?',
    );
  });

  it('sends a message, shows the formatted answer and updates the quota', async () => {
    api.chat.mockResolvedValue(answer('Use **const** by default.', 4));
    renderWithProviders(<ChatScreen />);

    sendMessage('let or const?');

    expect(await screen.findByText('const')).toBeOnTheScreen();
    expect(screen.getByText('let or const?')).toBeOnTheScreen();
    expect(api.chat).toHaveBeenCalledWith({ message: 'let or const?', history: [] });
    expect(await screen.findByText('4 / 30 this month')).toBeOnTheScreen();
    expect(screen.getByTestId('chat-input').props.value).toBe('');
  });

  it('sends the earlier conversation as history', async () => {
    api.chat.mockResolvedValueOnce(answer('A closure keeps variables.', 4));
    api.chat.mockResolvedValueOnce(answer('Simpler: a backpack of variables.', 5));
    renderWithProviders(<ChatScreen />);

    sendMessage('What is a closure?');
    await screen.findByText('A closure keeps variables.');
    sendMessage('Explain it simpler');
    await screen.findByText('Simpler: a backpack of variables.');

    expect(api.chat).toHaveBeenLastCalledWith({
      message: 'Explain it simpler',
      history: [
        { role: 'user', content: 'What is a closure?' },
        { role: 'assistant', content: 'A closure keeps variables.' },
      ],
    });
  });

  it('marks a demo (mock) answer', async () => {
    api.chat.mockResolvedValue(answer('Mock text', 1, 'mock'));
    renderWithProviders(<ChatScreen />);

    sendMessage('Hi');

    expect(await screen.findByText('Demo answer')).toBeOnTheScreen();
  });

  it('shows an error with Retry and resends the same message', async () => {
    api.chat.mockRejectedValueOnce(new ApiError('NETWORK'));
    api.chat.mockResolvedValueOnce(answer('Back online.', 4));
    renderWithProviders(<ChatScreen />);

    sendMessage('Hi there');

    expect(
      await screen.findByText('No connection to the mentor. Check your internet and try again.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Not sent')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('chat-retry'));

    expect(await screen.findByText('Back online.')).toBeOnTheScreen();
    expect(screen.queryByText('Not sent')).toBeNull();
    expect(api.chat).toHaveBeenLastCalledWith({ message: 'Hi there', history: [] });
  });

  it('shows the limit card without Retry when the monthly limit is used up', async () => {
    api.chat.mockRejectedValue(
      new ApiError('USAGE_LIMIT_REACHED', {
        status: 429,
        quota: { feature: 'chat', used: 30, limit: 30, resetsAt: '2026-11-01T00:00:00.000Z' },
      }),
    );
    renderWithProviders(<ChatScreen />);

    sendMessage('One more?');

    expect(await screen.findByTestId('chat-limit')).toBeOnTheScreen();
    expect(screen.getByText('30 of 30 messages used.')).toBeOnTheScreen();
    expect(screen.queryByTestId('chat-retry')).toBeNull();
  });

  it('shows the thinking state and a wake-up hint for a slow first answer', async () => {
    jest.useFakeTimers();
    let resolve: (value: ReturnType<typeof answer>) => void = () => undefined;
    api.chat.mockReturnValue(new Promise((done) => (resolve = done)));
    renderWithProviders(<ChatScreen />);

    sendMessage('Hi');

    expect(await screen.findByTestId('chat-thinking')).toBeOnTheScreen();
    expect(screen.queryByTestId('chat-waking')).toBeNull();
    expect(screen.getByTestId('chat-send').props.accessibilityState).toMatchObject({
      disabled: true,
    });

    act(() => jest.advanceTimersByTime(WAKE_HINT_AFTER_MS));
    expect(screen.getByTestId('chat-waking')).toBeOnTheScreen();

    await act(async () => resolve(answer('Awake now.', 4)));
    jest.useRealTimers();
    await waitFor(() => expect(screen.queryByTestId('chat-thinking')).toBeNull());
  });

  it('starts a new chat', async () => {
    api.chat.mockResolvedValue(answer('Answer one.', 4));
    renderWithProviders(<ChatScreen />);
    sendMessage('Question one');
    await screen.findByText('Answer one.');

    fireEvent.press(screen.getByText('New chat'));

    expect(screen.queryByText('Answer one.')).toBeNull();
    expect(screen.getByTestId('chat-empty')).toBeOnTheScreen();
  });
});
