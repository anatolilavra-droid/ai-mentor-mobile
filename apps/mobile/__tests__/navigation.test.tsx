import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

/**
 * Integration test: renders the real route files with Expo Router and
 * walks through every tab, like a user would.
 */
describe('app navigation', () => {
  it('opens Home first and reaches every tab', async () => {
    const router = renderRouter('./app', { initialUrl: '/' });

    // Home resolves its local data, then shows real content.
    expect(await screen.findByTestId('next-step-card', {}, { timeout: 3000 })).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/');

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
  }, 15000);

  it('shows the not-found screen for unknown routes', async () => {
    renderRouter('./app', { initialUrl: '/does-not-exist' });
    expect(await screen.findByTestId('not-found-screen')).toBeOnTheScreen();
  });
});
