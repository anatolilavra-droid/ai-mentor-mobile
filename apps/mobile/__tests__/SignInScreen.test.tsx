import { AuthApiError } from '@supabase/supabase-js';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { SignInScreen } from '@/features/auth/screens/SignInScreen';

import { renderWithProviders } from './test-utils';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));

type FakeSupabase = typeof import('@/lib/supabase/__mocks__/client');
const { supabase } = jest.requireMock('@/lib/supabase/client') as FakeSupabase;

describe('SignInScreen', () => {
  it('shows field errors and does not call the server for empty input', async () => {
    renderWithProviders(<SignInScreen />, { profile: null });
    fireEvent.press(screen.getByTestId('sign-in-submit'));

    expect(await screen.findByText('Enter your email.')).toBeOnTheScreen();
    expect(screen.getByText('Enter your password.')).toBeOnTheScreen();
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('signs in with trimmed credentials', async () => {
    renderWithProviders(<SignInScreen />, { profile: null });
    fireEvent.changeText(screen.getByTestId('sign-in-email'), ' anatoliy@example.com ');
    fireEvent.changeText(screen.getByTestId('sign-in-password'), 'mentor2026');
    fireEvent.press(screen.getByTestId('sign-in-submit'));

    await waitFor(() =>
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'anatoliy@example.com',
        password: 'mentor2026',
      }),
    );
  });

  it('shows a clear message for wrong credentials', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: {},
      error: new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'),
    } as never);
    renderWithProviders(<SignInScreen />, { profile: null });
    fireEvent.changeText(screen.getByTestId('sign-in-email'), 'anatoliy@example.com');
    fireEvent.changeText(screen.getByTestId('sign-in-password'), 'wrong-pass1');
    fireEvent.press(screen.getByTestId('sign-in-submit'));

    expect(await screen.findByText('Email or password is incorrect.')).toBeOnTheScreen();
  });
});
