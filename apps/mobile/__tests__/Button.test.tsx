import { fireEvent, screen } from '@testing-library/react-native';

import { Button } from '@/components/ui';

import { renderWithProviders } from './test-utils';

describe('Button', () => {
  it('calls onPress and exposes an accessible label', () => {
    const onPress = jest.fn();
    renderWithProviders(<Button label="Continue" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled and reports the disabled state', () => {
    const onPress = jest.fn();
    renderWithProviders(<Button label="Build my plan" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Build my plan' });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it('calls onPressWhenDisabled instead of onPress and stays disabled', () => {
    const onPress = jest.fn();
    const onPressWhenDisabled = jest.fn();
    renderWithProviders(
      <Button
        label="Review"
        onPress={onPress}
        onPressWhenDisabled={onPressWhenDisabled}
        disabled
      />,
    );
    const button = screen.getByRole('button', { name: 'Review' });
    fireEvent.press(button);
    expect(onPressWhenDisabled).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it('never calls onPressWhenDisabled while loading', () => {
    const onPressWhenDisabled = jest.fn();
    renderWithProviders(
      <Button label="Review" onPressWhenDisabled={onPressWhenDisabled} disabled loading />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Review' }));
    expect(onPressWhenDisabled).not.toHaveBeenCalled();
  });
});
