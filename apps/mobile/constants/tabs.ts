import {
  CircleUser,
  FolderKanban,
  GraduationCap,
  House,
  MessageSquareText,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

/** Route name (file in app/(tabs)) → icon and translation key. Order = tab order. */
export const tabConfig = [
  { name: 'index', icon: House, labelKey: 'tabs.home' },
  { name: 'learn', icon: GraduationCap, labelKey: 'tabs.learn' },
  { name: 'chat', icon: MessageSquareText, labelKey: 'tabs.chat' },
  { name: 'projects', icon: FolderKanban, labelKey: 'tabs.projects' },
  { name: 'profile', icon: CircleUser, labelKey: 'tabs.profile' },
] as const satisfies readonly { name: string; icon: LucideIcon; labelKey: string }[];

export type TabRouteName = (typeof tabConfig)[number]['name'];
