import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Text as NativeText, StyleSheet, View } from 'react-native';

import { CodeBlock, Divider, Text } from '@/components/ui';
import { codeFontVariant, colors, fontFamilies, radii, spacing } from '@/constants/tokens';

import { isSafeUrl, parseMarkdown, type Block, type Inline } from './parseMarkdown';

/** Opens an https link only after the user confirms the domain. */
function useOpenLink() {
  const { t } = useTranslation();
  return (url: string) => {
    if (!isSafeUrl(url)) return;
    const host = new URL(url).hostname;
    Alert.alert(t('chat.link.title'), t('chat.link.message', { host }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('chat.link.open'), onPress: () => void Linking.openURL(url) },
    ]);
  };
}

function InlineNodes({ nodes, onLink }: { nodes: Inline[]; onLink: (url: string) => void }) {
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.type) {
          case 'text':
            return <Fragment key={index}>{node.text}</Fragment>;
          case 'bold':
            return (
              <NativeText key={index} style={styles.bold}>
                <InlineNodes nodes={node.children} onLink={onLink} />
              </NativeText>
            );
          case 'italic':
            return (
              <NativeText key={index} style={styles.italic}>
                <InlineNodes nodes={node.children} onLink={onLink} />
              </NativeText>
            );
          case 'code':
            return (
              <NativeText key={index} style={styles.inlineCode}>
                {node.text}
              </NativeText>
            );
          case 'link':
            return (
              <NativeText
                key={index}
                style={styles.link}
                accessibilityRole="link"
                onPress={() => onLink(node.url)}
              >
                {node.text}
              </NativeText>
            );
        }
      })}
    </>
  );
}

function BlockView({ block, onLink }: { block: Block; onLink: (url: string) => void }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <Text variant="body" selectable>
          <InlineNodes nodes={block.inline} onLink={onLink} />
        </Text>
      );
    case 'heading':
      return (
        <Text variant={block.level === 1 ? 'headline' : 'bodyMedium'} accessibilityRole="header">
          <InlineNodes nodes={block.inline} onLink={onLink} />
        </Text>
      );
    case 'list':
      return (
        <View style={styles.list}>
          {block.items.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text variant="body" color="muted" style={styles.marker}>
                {block.ordered ? `${block.start + index}.` : '•'}
              </Text>
              <Text variant="body" style={styles.listText} selectable>
                <InlineNodes nodes={item} onLink={onLink} />
              </Text>
            </View>
          ))}
        </View>
      );
    case 'code':
      return <CodeBlock code={block.code} language={block.language} copyable />;
    case 'rule':
      return <Divider />;
  }
}

/**
 * Renders a mentor answer. Only Text and View: no HTML, no web views, no
 * scripts. Links open only for https after a confirmation.
 */
export function MarkdownView({ source, testID }: { source: string; testID?: string }) {
  const { t } = useTranslation();
  const parsed = useMemo(() => parseMarkdown(source), [source]);
  const openLink = useOpenLink();

  return (
    <View style={styles.root} testID={testID}>
      {parsed.blocks.map((block, index) => (
        <BlockView key={index} block={block} onLink={openLink} />
      ))}
      {parsed.truncated ? (
        <Text variant="caption" color="muted">
          {t('chat.answerTruncated')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  bold: {
    fontFamily: fontFamilies.sansSemiBold,
  },
  italic: {
    fontStyle: 'italic',
  },
  inlineCode: {
    fontFamily: fontFamilies.monoRegular,
    fontVariant: codeFontVariant,
    backgroundColor: colors.background.secondary,
    borderRadius: radii.sm,
    color: colors.text.secondary,
  },
  link: {
    color: colors.accent.primary,
    textDecorationLine: 'underline',
  },
  list: {
    gap: spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  marker: {
    minWidth: spacing.sm,
  },
  listText: {
    flex: 1,
  },
});
