import { fireEvent, screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';

import { TabBar } from '@/components/navigation/TabBar';
import { tabConfig } from '@/constants/tabs';

import { renderWithProviders } from './test-utils';

function createProps(index: number) {
  const routes = tabConfig.map((tab) => ({ key: `${tab.name}-key`, name: tab.name }));
  const navigation = {
    emit: jest.fn(() => ({ defaultPrevented: false })),
    navigate: jest.fn(),
  };
  const props = {
    state: { index, routes },
    navigation,
    descriptors: {},
    insets: { top: 0, right: 0, bottom: 16, left: 0 },
  } as unknown as BottomTabBarProps;
  return { props, navigation };
}

describe('TabBar', () => {
  it('renders all five tabs with accessible labels', () => {
    const { props } = createProps(0);
    renderWithProviders(<TabBar {...props} />);
    for (const name of ['Home', 'Learn', 'Chat', 'Projects', 'Profile']) {
      expect(screen.getByRole('tab', { name })).toBeOnTheScreen();
    }
  });

  it('marks only the active tab as selected', () => {
    const { props } = createProps(2);
    renderWithProviders(<TabBar {...props} />);
    expect(screen.getByRole('tab', { name: 'Chat' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Home' })).not.toBeSelected();
  });

  it('navigates when an inactive tab is pressed', () => {
    const { props, navigation } = createProps(0);
    renderWithProviders(<TabBar {...props} />);
    fireEvent.press(screen.getByRole('tab', { name: 'Projects' }));
    expect(navigation.navigate).toHaveBeenCalledWith('projects', undefined);
  });

  it('does not navigate when the active tab is pressed again', () => {
    const { props, navigation } = createProps(0);
    renderWithProviders(<TabBar {...props} />);
    fireEvent.press(screen.getByRole('tab', { name: 'Home' }));
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
