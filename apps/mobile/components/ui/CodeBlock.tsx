import * as Clipboard from 'expo-clipboard';
import { Check, Copy } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { borderWidths, colors, layout, radii, spacing } from '@/constants/tokens';
import { useToastStore } from '@/stores/toast.store';

import { Icon } from './Icon';
import { Text } from './Text';

type CodeBlockProps = {
  code: string;
  language: string;
  /** Show a "Copy" button that puts the code on the clipboard. */
  copyable?: boolean;
};

const COPIED_RESET_MS = 2_000;

/** Monospaced, horizontally scrollable code — never wraps, so indentation stays honest. */
export function CodeBlock({ code, language, copyable = false }: CodeBlockProps) {
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.show);
  const [copied, setCopied] = useState(false);
  const label = language || t('codeBlock.plainLanguage');

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      showToast(t('codeBlock.copied'), 'success');
    } catch {
      showToast(t('codeBlock.copyFailed'), 'neutral');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="label" color="muted">
          {label}
        </Text>
        {copyable ? (
          <Pressable
            onPress={copy}
            accessibilityRole="button"
            accessibilityLabel={t('codeBlock.copyA11y', { language: label })}
            hitSlop={spacing.xs}
            style={styles.copy}
            testID="code-copy"
          >
            <Icon icon={copied ? Check : Copy} size="sm" color={copied ? 'accent' : 'muted'} />
            <Text variant="caption" color={copied ? 'accent' : 'muted'}>
              {copied ? t('codeBlock.copiedShort') : t('codeBlock.copy')}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.code}
        accessibilityLabel={`${label} code`}
      >
        <Text variant="code" color="secondary" selectable>
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.md,
    borderWidth: borderWidths.hairline,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.secondary,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  copy: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingLeft: spacing.xs,
  },
  code: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
});
