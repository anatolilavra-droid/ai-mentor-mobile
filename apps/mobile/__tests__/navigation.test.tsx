import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { completeProfile, newProfile, testSession } from './fixtures';

/**
 * Integration tests: the real route files and guards, with the Supabase fake.
 */
type FakeSupabase = typeof import('@/lib/supabase/__mocks__/client');
const fake = jest.requireMock('@/lib/supabase/client') as FakeSupabase;

// The first render cold-starts Expo Router; leave room on a loaded CI machine.
const TIMEOUT = { timeout: 10000 };
jest.setTimeout(30000);

describe('auth guards', () => {
  it('sends a signed-out user to sign in, even from a protected URL', async () => {
    renderRouter('./app', { initialUrl: '/profile' });
    expect(await screen.findByTestId('sign-in-screen', {}, TIMEOUT)).toBeOnTheScreen();
    expect(screen.queryByTestId('profile-screen')).toBeNull();
    expect(screen.queryByTestId('tab-bar')).toBeNull();
  });

  it('restores a stored session and opens the app', async () => {
    fake.fakeDb.session = testSession;
    fake.fakeDb.profile = { ...completeProfile };
    renderRouter('./app', { initialUrl: '/' });
    expect(await screen.findByTestId('next-step-card', {}, TIMEOUT)).toBeOnTheScreen();
    expect(screen.getByText(/Anatoliy/)).toBeOnTheScreen();
  });

  it('sends a new user to onboarding, with the tabs closed', async () => {
    fake.fakeDb.session = testSession;
    fake.fakeDb.profile = { ...newProfile };
    const router = renderRouter('./app', { initialUrl: '/profile' });
    expect(await screen.findByTestId('onboarding-welcome', {}, TIMEOUT)).toBeOnTheScreen();
    expect(screen.queryByTestId('tab-bar')).toBeNull();
    expect(router.getPathname()).toBe('/onboarding');
  });

  it('shows an error with retry when the profile cannot load', async () => {
    fake.fakeDb.session = testSession;
    fake.fakeDb.profileError = new Error('offline');
    renderRouter('./app', { initialUrl: '/' });
    expect(await screen.findByTestId('profile-load-error', {}, TIMEOUT)).toBeOnTheScreen();

    fake.fakeDb.profileError = null;
    fake.fakeDb.profile = { ...completeProfile };
    fireEvent.press(screen.getByTestId('profile-load-retry'));
    expect(await screen.findByTestId('next-step-card', {}, TIMEOUT)).toBeOnTheScreen();
  });

  it('returns to sign in after signing out', async () => {
    fake.fakeDb.session = testSession;
    fake.fakeDb.profile = { ...completeProfile };
    renderRouter('./app', { initialUrl: '/' });
    expect(await screen.findByTestId('next-step-card', {}, TIMEOUT)).toBeOnTheScreen();

    const consoleError = jest.spyOn(console, 'error');
    act(() => fake.emitAuthChange('SIGNED_OUT', null));
    expect(await screen.findByTestId('sign-in-screen', {}, TIMEOUT)).toBeOnTheScreen();
    // Signed-in screens must leave without a render error (the profile cache is cleared).
    expect(screen.queryByTestId('route-error')).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('tab navigation', () => {
  it('reaches every tab when signed in', async () => {
    fake.fakeDb.session = testSession;
    fake.fakeDb.profile = { ...completeProfile };
    const router = renderRouter('./app', { initialUrl: '/' });
    expect(await screen.findByTestId('next-step-card', {}, TIMEOUT)).toBeOnTheScreen();

    const tabs = [
      ['Learn', 'learn-screen', '/learn'],
      ['Chat', 'chat-screen', '/chat'],
      ['Projects', 'projects-screen', '/projects'],
      ['Profile', 'profile-screen', '/profile'],
      ['Home', 'home-screen', '/'],
    ] as const;

    for (const [label, screenId, pathname] of tabs) {
      fireEvent.press(screen.getByRole('tab', { name: label }));
      expect(await screen.findByTestId(screenId)).toBeOnTheScreen();
      expect(router.getPathname()).toBe(pathname);
    }
  }, 20000);

  it('shows the not-found screen for unknown routes', async () => {
    renderRouter('./app', { initialUrl: '/does-not-exist' });
    expect(await screen.findByTestId('not-found-screen', {}, TIMEOUT)).toBeOnTheScreen();
  });
});
