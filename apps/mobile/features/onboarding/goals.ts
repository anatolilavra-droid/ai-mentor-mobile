import { Briefcase, Code, Compass, Hammer, Layers, Rocket } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { PRIMARY_GOALS } from '@/features/profile/profile.schemas';
import type { PrimaryGoal } from '@/types/database';

/** Stable goal slugs (stored in the database) with their icon. Labels come from en.json. */
export const goalIcons: Record<PrimaryGoal, LucideIcon> = {
  learn_javascript: Code,
  build_web_apps: Layers,
  prepare_for_job: Briefcase,
  improve_fundamentals: Compass,
  learn_react: Rocket,
  personal_projects: Hammer,
};

export { PRIMARY_GOALS };
