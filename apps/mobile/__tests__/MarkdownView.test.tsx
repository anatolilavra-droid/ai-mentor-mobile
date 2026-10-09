import { fireEvent, screen } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { Alert, Linking } from 'react-native';

import { MarkdownView } from '@/features/chat/markdown/MarkdownView';

import { renderWithProviders } from './test-utils';

describe('MarkdownView', () => {
  it('renders formatted text, lists and code blocks', () => {
    renderWithProviders(
      <MarkdownView
        source={'## Steps\n\n1. **First** step\n2. Use `let`\n\n```js\nlet a = 1;\n```'}
      />,
    );

    expect(screen.getByText('Steps')).toBeOnTheScreen();
    expect(screen.getByText('First')).toBeOnTheScreen();
    expect(screen.getByText('let')).toBeOnTheScreen();
    expect(screen.getByText('let a = 1;')).toBeOnTheScreen();
    expect(screen.getByText('2.')).toBeOnTheScreen();
  });

  it('shows HTML as plain text', () => {
    renderWithProviders(<MarkdownView source={'<b>not bold</b><script>alert(1)</script>'} />);
    expect(screen.getByText('<b>not bold</b><script>alert(1)</script>')).toBeOnTheScreen();
  });

  it('copies a code block to the clipboard', async () => {
    renderWithProviders(<MarkdownView source={'```ts\nconst x = 1;\n```'} />);

    fireEvent.press(screen.getByTestId('code-copy'));

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('const x = 1;');
    expect(await screen.findByText('Copied')).toBeOnTheScreen();
  });

  it('asks before opening an https link and never opens unsafe links', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    renderWithProviders(
      <MarkdownView
        source={'[MDN](https://developer.mozilla.org/) and [bad](javascript:alert(1))'}
      />,
    );

    fireEvent.press(screen.getByRole('link', { name: 'MDN' }));
    expect(alert).toHaveBeenCalledWith(
      'Open link?',
      'This opens developer.mozilla.org in your browser.',
      expect.any(Array),
    );
    expect(openURL).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: 'bad' })).toBeNull();

    const buttons = alert.mock.calls[0]?.[2] ?? [];
    buttons.find((button) => button.text === 'Open')?.onPress?.();
    expect(openURL).toHaveBeenCalledWith('https://developer.mozilla.org/');
  });
});
