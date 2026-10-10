import type { SecretFinding } from '@ai-mentor/shared';
import type { TFunction } from 'i18next';
import { Alert } from 'react-native';

/** At most this many lines are listed; the rest are summarized by the first ones. */
const MAX_LISTED = 5;

/**
 * Asks before sending code that may contain a secret. Lists only kinds and line
 * numbers (never the value). Resolves `true` only for an explicit "Send anyway";
 * Cancel and dismissing the dialog both resolve `false`.
 */
export function confirmPossibleSecrets(
  findings: readonly SecretFinding[],
  t: TFunction,
): Promise<boolean> {
  const lines = findings.slice(0, MAX_LISTED).map((finding) =>
    t('codeReview.secrets.line', {
      line: finding.line,
      kind: t(`codeReview.secrets.kinds.${finding.kind}`),
    }),
  );
  const message = [t('codeReview.secrets.intro'), lines.join('\n'), t('codeReview.secrets.risk')]
    .filter(Boolean)
    .join('\n\n');

  return new Promise((resolve) => {
    Alert.alert(
      t('codeReview.secrets.title'),
      message,
      [
        { text: t('codeReview.secrets.cancel'), style: 'cancel', onPress: () => resolve(false) },
        {
          text: t('codeReview.secrets.send'),
          style: 'destructive',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
