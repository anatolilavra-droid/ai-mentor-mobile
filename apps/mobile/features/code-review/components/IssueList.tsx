import type { CodeReviewIssue, IssueSeverity } from '@ai-mentor/shared';
import { Info, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon, Text, type IconColor, type TextColor } from '@/components/ui';
import { borderWidths, colors, radii, spacing } from '@/constants/tokens';

const SEVERITY: Record<IssueSeverity, { icon: LucideIcon; color: IconColor & TextColor }> = {
  error: { icon: OctagonAlert, color: 'error' },
  warning: { icon: TriangleAlert, color: 'warning' },
  info: { icon: Info, color: 'accent' },
};

function IssueCard({ issue, index }: { issue: CodeReviewIssue; index: number }) {
  const { t } = useTranslation();
  const severity = SEVERITY[issue.severity];
  const meta = [
    t(`codeReview.result.severity.${issue.severity}`),
    t(`codeReview.result.category.${issue.category}`),
    issue.line ? t('codeReview.result.line', { line: issue.line }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.card} testID={`code-review-issue-${index}`}>
      <View style={styles.header}>
        <Icon icon={severity.icon} size="sm" color={severity.color} />
        <Text variant="caption" color={severity.color}>
          {meta}
        </Text>
      </View>
      <Text variant="bodyMedium" selectable>
        {issue.title}
      </Text>
      <Text variant="callout" color="secondary" selectable>
        {issue.explanation}
      </Text>
      {issue.suggestion ? (
        <View style={styles.suggestion}>
          <Text variant="label" color="muted">
            {t('codeReview.result.suggestion')}
          </Text>
          <Text variant="callout" color="secondary" selectable>
            {issue.suggestion}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Problems found in the code, already ordered by the server (errors first). Plain text only. */
export function IssueList({ issues }: { issues: readonly CodeReviewIssue[] }) {
  const { t } = useTranslation();
  if (issues.length === 0) {
    return (
      <Text variant="callout" color="secondary" testID="code-review-no-issues">
        {t('codeReview.result.noIssues')}
      </Text>
    );
  }
  return (
    <View style={styles.list}>
      {issues.map((issue, index) => (
        <IssueCard key={`${index}-${issue.title}`} issue={issue} index={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  card: {
    gap: spacing.xxs,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: borderWidths.hairline,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  suggestion: {
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
});
