import { fireEvent, screen } from '@testing-library/react-native';

import { homeSummaryMock } from '@/features/home/data/home.mock';
import { HomeScreen } from '@/features/home/HomeScreen';

import { renderWithProviders } from './test-utils';

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), replace: jest.fn() },
}));

describe('HomeScreen', () => {
  it('shows the loading state, then content', async () => {
    renderWithProviders(<HomeScreen loadSummary={() => Promise.resolve(homeSummaryMock)} />);
    expect(screen.getByTestId('home-loading')).toBeOnTheScreen();
    expect(await screen.findByTestId('next-step-card')).toBeOnTheScreen();
    expect(screen.getByText(homeSummaryMock.nextStep.topic)).toBeOnTheScreen();
    expect(screen.getByTestId('recent-empty')).toBeOnTheScreen();
    expect(screen.getByTestId('home-primary-action')).toBeEnabled();
  });

  it('shows the error state and recovers on retry', async () => {
    const loader = jest
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(homeSummaryMock);

    renderWithProviders(<HomeScreen loadSummary={loader} />);
    expect(await screen.findByTestId('home-error')).toBeOnTheScreen();
    expect(screen.getByTestId('home-primary-action')).toBeDisabled();

    fireEvent.press(screen.getByTestId('home-error-retry'));
    expect(await screen.findByTestId('next-step-card')).toBeOnTheScreen();
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
