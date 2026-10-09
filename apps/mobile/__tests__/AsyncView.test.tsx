import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AsyncView } from '@/components/states';
import type { AsyncState } from '@/types/async';

import { renderWithProviders } from './test-utils';

function renderState(state: AsyncState<string>, onRetry = jest.fn()) {
  renderWithProviders(
    <AsyncView
      state={state}
      onRetry={onRetry}
      testID="subject"
      loading={<Text>loading-view</Text>}
      empty={<Text>empty-view</Text>}
    >
      {(data) => <Text>{`content:${data}`}</Text>}
    </AsyncView>,
  );
  return onRetry;
}

describe('AsyncView', () => {
  it('renders the loading view', () => {
    renderState({ status: 'loading' });
    expect(screen.getByText('loading-view')).toBeOnTheScreen();
  });

  it('renders the empty view', () => {
    renderState({ status: 'empty' });
    expect(screen.getByText('empty-view')).toBeOnTheScreen();
  });

  it('renders content on success', () => {
    renderState({ status: 'success', data: 'hello' });
    expect(screen.getByText('content:hello')).toBeOnTheScreen();
  });

  it('renders a safe error message with a working retry', () => {
    const onRetry = renderState({ status: 'error', error: new Error('secret stack detail') });
    expect(screen.getByText('Something went off track')).toBeOnTheScreen();
    expect(screen.queryByText(/secret stack detail/)).toBeNull();
    fireEvent.press(screen.getByTestId('subject-error-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
