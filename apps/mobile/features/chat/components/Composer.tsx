import { CHAT_MESSAGE_MAX_LENGTH } from '@ai-mentor/shared';
import { SendHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import {
  borderWidths,
  colors,
  fontFamilies,
  fontSizes,
  layout,
  lineHeights,
  opacity,
  radii,
  spacing,
} from '@/constants/tokens';

/** Show the counter once the message gets close to the limit. */
const COUNTER_FROM = CHAT_MESSAGE_MAX_LENGTH - 1_000;
const MAX_INPUT_HEIGHT = 160;

type ComposerProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
};

/** Message input with the send button in the thumb zone. */
export function Composer({ value, onChangeText, onSend, disabled }: ComposerProps) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const canSend = !disabled && value.trim().length > 0;

  return (
    <View style={{ gap: spacing.xxs }}>
      <View style={[styles.composer, focused && styles.focused]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={t('chat.inputPlaceholder')}
          placeholderTextColor={colors.text.muted}
          multiline
          maxLength={CHAT_MESSAGE_MAX_LENGTH}
          style={styles.input}
          accessibilityLabel={t('chat.inputA11y')}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          testID="chat-input"
        />
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={t('chat.send')}
          accessibilityState={{ disabled: !canSend }}
          style={[styles.send, !canSend && styles.sendDisabled]}
          testID="chat-send"
        >
          <Icon icon={SendHorizontal} size="md" color="onAccent" />
        </Pressable>
      </View>
      {value.length >= COUNTER_FROM ? (
        <Text
          variant="caption"
          color={value.length >= CHAT_MESSAGE_MAX_LENGTH ? 'warning' : 'muted'}
          align="right"
        >
          {t('chat.counter', { count: value.length, max: CHAT_MESSAGE_MAX_LENGTH })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    minHeight: layout.minTouchTarget + spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xxs,
    paddingVertical: spacing.xxs,
    borderRadius: radii.lg,
    backgroundColor: colors.surface.default,
    borderWidth: borderWidths.hairline,
    borderColor: colors.border.strong,
  },
  focused: {
    borderColor: colors.accent.primary,
  },
  input: {
    flex: 1,
    maxHeight: MAX_INPUT_HEIGHT,
    paddingVertical: spacing.xs,
    color: colors.text.primary,
    fontFamily: fontFamilies.sansRegular,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
  send: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primary,
  },
  sendDisabled: {
    opacity: opacity.disabled,
  },
});
