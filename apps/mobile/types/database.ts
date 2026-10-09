/**
 * Database types for the Supabase client, written to match
 * supabase/migrations. Keep in sync with every migration
 * (or regenerate with `supabase gen types typescript` once the CLI is available).
 */
export type ExperienceLevel = 'beginner' | 'junior' | 'middle' | 'advanced';
export type UiLanguage = 'ru' | 'en' | 'de';
export type PrimaryGoal =
  | 'learn_javascript'
  | 'build_web_apps'
  | 'prepare_for_job'
  | 'improve_fundamentals'
  | 'learn_react'
  | 'personal_projects';
export type TechnologyCategory = 'language' | 'frontend' | 'backend' | 'tools';

export type ProfileRow = {
  id: string;
  display_name: string | null;
  experience_level: ExperienceLevel | null;
  primary_goal: PrimaryGoal | null;
  custom_goal_details: string | null;
  daily_minutes: number | null;
  ui_language: UiLanguage;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  onboarding_skipped_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Fields the client may write directly (quick "Edit profile"). */
export type ProfileUpdate = Partial<
  Pick<ProfileRow, 'display_name' | 'daily_minutes' | 'ui_language'>
>;

export type TechnologyRow = {
  id: string;
  name: string;
  category: TechnologyCategory;
  sort_order: number;
  is_active: boolean;
};

export type UserTechnologyRow = {
  user_id: string;
  technology_id: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: never;
        Update: ProfileUpdate;
        Relationships: [];
      };
      technologies: {
        Row: TechnologyRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      user_technologies: {
        Row: UserTechnologyRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      complete_onboarding: {
        Args: {
          p_display_name: string;
          p_experience_level: ExperienceLevel;
          p_primary_goal: PrimaryGoal;
          p_custom_goal_details: string | null;
          p_daily_minutes: number;
          p_ui_language: UiLanguage;
          p_technologies: string[];
        };
        Returns: undefined;
      };
      save_personalization: {
        Args: {
          p_experience_level: ExperienceLevel;
          p_primary_goal: PrimaryGoal;
          p_custom_goal_details: string | null;
          p_technologies: string[];
        };
        Returns: undefined;
      };
      skip_onboarding: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
