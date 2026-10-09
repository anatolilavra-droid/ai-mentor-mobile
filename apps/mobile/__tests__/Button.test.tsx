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
});
