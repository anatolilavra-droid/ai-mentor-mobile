import { AuthApiError } from '@supabase/supabase-js';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ResetPasswordScreen } from '@/features/auth/screens/ResetPasswordScreen';

import { renderWithProviders } from './test-utils';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ email: 'anatoliy@example.com' }),
  Redirect: () => null,
}));

type FakeSupabase = typeof import('@/lib/supabase/__mocks__/client');
const { supabase } = jest.requireMock('@/lib/supabase/client') as FakeSupabase;

function fillForm(code = '123456', password = 'mentor2027') {
  fireEvent.changeText(screen.getByTestId('reset-code'), code);
  fireEvent.changeText(screen.getByTestId('reset-password'), password);
  fireEvent.changeText(screen.getByTestId('reset-confirm'), password);
  fireEvent.press(screen.getByTestId('reset-submit'));
}

describe('ResetPasswordScreen', () => {
  it('verifies the code, saves the password and releases the recovery guard', async () => {
    const { authValue } = renderWithProviders(<ResetPasswordScreen />, { profile: null });
    fillForm();

    await waitFor(() =>
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'mentor2027' }),
    );
    expect(authValue.setRecoveringPassword).toHaveBeenNthCalledWith(1, true);
    expect(authValue.setRecoveringPassword).toHaveBeenLastCalledWith(false);
  });

  it('keeps the reset open when the new password is rejected, and does not reuse the code', async () => {
    supabase.auth.updateUser.mockResolvedValueOnce({
      data: {},
      error: new AuthApiError('Same password', 422, 'same_password'),
    } as never);
    const { authValue } = renderWithProviders(<ResetPasswordScreen />, { profile: null });
    fillForm();

    expect(
      await screen.findByText('Choose a password different from your current one.'),
    ).toBeOnTheScreen();
    expect(authValue.setRecoveringPassword).not.toHaveBeenCalledWith(false);

    fireEvent.changeText(screen.getByTestId('reset-password'), 'mentor2028');
    fireEvent.changeText(screen.getByTestId('reset-confirm'), 'mentor2028');
    fireEvent.press(screen.getByTestId('reset-submit'));

    await waitFor(() =>
      expect(supabase.auth.updateUser).toHaveBeenLastCalledWith({ password: 'mentor2028' }),
    );
    expect(supabase.auth.verifyOtp).toHaveBeenCalledTimes(1);
    expect(authValue.setRecoveringPassword).toHaveBeenLastCalledWith(false);
  });

  it('closes the recovery guard when the code is wrong', async () => {
    supabase.auth.verifyOtp.mockResolvedValueOnce({
      data: {},
      error: new AuthApiError('Token has expired or is invalid', 403, 'otp_expired'),
    } as never);
    const { authValue } = renderWithProviders(<ResetPasswordScreen />, { profile: null });
    fillForm('000000');

    expect(
      await screen.findByText('The code is wrong or has expired. Request a new one.'),
    ).toBeOnTheScreen();
    expect(authValue.setRecoveringPassword).toHaveBeenLastCalledWith(false);
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });
});
