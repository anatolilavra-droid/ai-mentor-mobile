import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif/400Regular';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif/400Regular_Italic';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';

import { fontFamilies } from './tokens';

/** Font map passed to `useFonts`. Keys must match `fontFamilies`. */
export const fontAssets = {
  [fontFamilies.display]: InstrumentSerif_400Regular,
  [fontFamilies.displayItalic]: InstrumentSerif_400Regular_Italic,
  [fontFamilies.sansRegular]: Inter_400Regular,
  [fontFamilies.sansMedium]: Inter_500Medium,
  [fontFamilies.sansSemiBold]: Inter_600SemiBold,
  [fontFamilies.monoRegular]: JetBrainsMono_400Regular,
  [fontFamilies.monoMedium]: JetBrainsMono_500Medium,
} as const;
