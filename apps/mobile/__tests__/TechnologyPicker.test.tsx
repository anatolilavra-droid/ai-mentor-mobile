import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { TechnologyPicker } from '@/features/onboarding/components/TechnologyPicker';

import { renderWithProviders } from './test-utils';

const technologies = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((id, index) => ({
  id,
  name: id.toUpperCase(),
  category: 'language' as const,
  sort_order: index,
}));

function Harness({ initial = [] as string[] }) {
  const [selected, setSelected] = useState(initial);
  return (
    <TechnologyPicker
      technologies={technologies}
      selected={selected}
      onChange={setSelected}
      max={8}
    />
  );
}

describe('TechnologyPicker', () => {
  it('selects and unselects, so a technology is never picked twice', () => {
    renderWithProviders(<Harness />);
    const chip = screen.getByTestId('technology-a');
    fireEvent.press(chip);
    expect(chip).toBeChecked();
    fireEvent.press(chip);
    expect(chip).not.toBeChecked();
  });

  it('disables unselected technologies once 8 are picked', () => {
    renderWithProviders(<Harness initial={['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']} />);
    expect(screen.getByTestId('technology-i')).toBeDisabled();
    expect(screen.getByTestId('technology-a')).toBeEnabled();

    fireEvent.press(screen.getByTestId('technology-a'));
    expect(screen.getByTestId('technology-i')).toBeEnabled();
  });
});
