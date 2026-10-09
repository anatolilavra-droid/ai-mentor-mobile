import * as Haptics from 'expo-haptics';

import { usePreferencesStore } from '@/stores/preferences.store';

function run(effect: () => Promise<void>) {
  if (!usePreferencesStore.getState().hapticsEnabled) return;
  // Haptics are a nice-to-have: never let an unsupported device surface an error.
  effect().catch(() => undefined);
}

export const haptics = {
  selection: () => run(() => Haptics.selectionAsync()),
  press: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
