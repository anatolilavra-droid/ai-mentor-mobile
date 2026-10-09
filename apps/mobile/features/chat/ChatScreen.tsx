import { MessageSquareText, PlugZap } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type ScrollView } from 'react-native';

import { InlineMessage } from '@/components/feedback/InlineMessage';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { EmptyState } from '@/components/states';
import { Button, Text } from '@/components/ui';
import { borderWidths, colors, layout, radii, spacing } from '@/constants/tokens';
import { apiBaseUrl } from '@/lib/api/config';
import { apiErrorMessageKey, isApiError, isRetryable } from '@/lib/api/errors';

import { Composer } from './components/Composer';
import { LimitReachedCard } from './components/LimitReachedCard';
import { MessageBubble } from './components/MessageBubble';
import { QuotaBadge } from './components/QuotaBadge';
import { ThinkingIndicator } from './components/ThinkingIndicator';
import { useChat } from './useChat';

const SUGGESTIONS = [
  'chat.suggestions.closure',
  'chat.suggestions.error',
  'chat.suggestions.letConst',
] as const;

function NotConnected() {
  const { t } = useTranslation();
  return (
    <Screen testID="chat-screen">
      <ScreenHeader
        eyebrow={t('chat.eyebrow')}
        title={t('chat.title')}
        subtitle={t('chat.subtitle')}
      />
      <EmptyState
        icon={PlugZap}
        title={t('chat.notConnected.title')}
        description={t('chat.notConnected.description')}
        testID="chat-not-connected"
      />
    </Screen>
  );
}

function Conversation() {
  const { t } = useTranslation();
  const { entries, send, retry, startOver, isPending, error } = useChat();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const submit = () => {
    if (!draft.trim() || isPending) return;
    send(draft);
    setDraft('');
  };

  const limitReached = isApiError(error) && error.code === 'USAGE_LIMIT_REACHED';
  const lastFailed = entries.at(-1)?.role === 'user' && !isPending && error;

  return (
    <Screen
      testID="chat-screen"
      scrollRef={scrollRef}
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      footer={
        <Composer value={draft} onChangeText={setDraft} onSend={submit} disabled={isPending} />
      }
    >
      <ScreenHeader
        eyebrow={t('chat.eyebrow')}
        title={t('chat.title')}
        subtitle={t('chat.subtitle')}
        size="title"
      />
      <View style={styles.toolbar}>
        <QuotaBadge />
        {entries.length > 0 ? (
          <Button
            label={t('chat.startOver')}
            variant="ghost"
            onPress={startOver}
            disabled={isPending}
          />
        ) : null}
      </View>

      {entries.length === 0 ? (
        <View style={{ gap: spacing.sm }}>
          <EmptyState
            icon={MessageSquareText}
            title={t('chat.emptyTitle')}
            description={t('chat.emptyDescription')}
            compact
            testID="chat-empty"
          />
          {SUGGESTIONS.map((key) => (
            <Pressable
              key={key}
              onPress={() => setDraft(t(key))}
              accessibilityRole="button"
              accessibilityHint={t('chat.suggestionHint')}
              style={styles.suggestion}
            >
              <Text variant="callout" color="secondary">
                {t(key)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.messages}>
          {entries.map((entry) => (
            <MessageBubble key={entry.id} entry={entry} />
          ))}
        </View>
      )}

      {isPending ? <ThinkingIndicator /> : null}

      {lastFailed && limitReached ? <LimitReachedCard quota={error.quota} /> : null}
      {lastFailed && !limitReached ? (
        <View style={styles.error}>
          <InlineMessage tone="error" message={t(apiErrorMessageKey(error))} testID="chat-error" />
          {isRetryable(error) ? (
            <Button
              label={t('common.retry')}
              variant="secondary"
              onPress={retry}
              testID="chat-retry"
            />
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

/** AI mentor chat. Without a configured API it explains that the mentor is not connected. */
export function ChatScreen() {
  return apiBaseUrl ? <Conversation /> : <NotConnected />;
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.minTouchTarget,
    marginBottom: spacing.sm,
  },
  messages: {
    gap: spacing.md,
  },
  suggestion: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: borderWidths.hairline,
    borderColor: colors.border.subtle,
  },
  error: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
