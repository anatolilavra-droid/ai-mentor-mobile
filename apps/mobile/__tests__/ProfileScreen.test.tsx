import { act, fireEvent, screen } from '@testing-library/react-native';

import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { usePreferencesStore } from '@/stores/preferences.store';
import { useToastStore } from '@/stores/toast.store';

import { renderWithProviders } from './test-utils';

describe('ProfileScreen', () => {
  beforeEach(() => {
    act(() => {
      usePreferencesStore.setState({ hapticsEnabled: true });
      useToastStore.setState({ current: null });
    });
  });

  it('renders the profile and settings', () => {
    renderWithProviders(<ProfileScreen />);
    expect(screen.getByRole('header', { name: 'Anatoliy' })).toBeOnTheScreen();
    expect(screen.getByText('Preferences')).toBeOnTheScreen();
    expect(screen.getByText('Free')).toBeOnTheScreen();
  });

  it('toggles haptics and confirms with success feedback', () => {
    renderWithProviders(<ProfileScreen />);
    fireEvent(screen.getByTestId('haptics-switch'), 'valueChange', false);
    expect(usePreferencesStore.getState().hapticsEnabled).toBe(false);
    expect(useToastStore.getState().current?.message).toBe('Preferences saved');
  });
});
