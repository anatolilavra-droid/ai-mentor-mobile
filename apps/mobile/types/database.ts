/**
 * Database types for the Supabase client, written to match
 * supabase/migrations. Keep in sync with every migration
 * (or regenerate with `supabase gen types typescript` once the CLI is available).
 */
export type ExperienceLevel = 'beginner' | 'junior' | 'middle' | 'advanced';
export type UiLanguage = 'ru' | 'en' | 'de';

export type ProfileRow = {
  id: string;
  display_name: string | null;
  experience_level: ExperienceLevel | null;
  learning_goal: string | null;
  daily_minutes: number | null;
  ui_language: UiLanguage;
  created_at: string;
  updated_at: string;
};

export type ProfileUpdate = Partial<
  Pick<
    ProfileRow,
    'display_name' | 'experience_level' | 'learning_goal' | 'daily_minutes' | 'ui_language'
  >
>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: never;
        Update: ProfileUpdate;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
