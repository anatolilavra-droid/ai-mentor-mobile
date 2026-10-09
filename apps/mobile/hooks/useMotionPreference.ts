import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * True when the user asked the OS to reduce motion. Decorative animation
 * must respect it. Subscribes to changes, so toggling the system setting
 * takes effect without restarting the app.
 */
export function useMotionPreference(): { reduceMotion: boolean } {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) =>
      setReduceMotion(enabled),
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return { reduceMotion };
}
