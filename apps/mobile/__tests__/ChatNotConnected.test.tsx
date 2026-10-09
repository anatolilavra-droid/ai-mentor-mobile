import { screen } from '@testing-library/react-native';

import { ChatScreen } from '@/features/chat/ChatScreen';

import { renderWithProviders } from './test-utils';

jest.mock('@/lib/api/config', () => ({ apiBaseUrl: null }));

describe('ChatScreen without an API address', () => {
  it('explains that the mentor is not connected and offers no input', () => {
    renderWithProviders(<ChatScreen />);

    expect(screen.getByTestId('chat-not-connected')).toBeOnTheScreen();
    expect(screen.queryByTestId('chat-input')).toBeNull();
  });
});
