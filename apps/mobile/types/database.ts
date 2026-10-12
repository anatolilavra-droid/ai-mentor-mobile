/**
 * Database types for the Supabase client, written to match
 * supabase/migrations. Keep in sync with every migration
 * (or regenerate with `supabase gen types typescript` once the CLI is available).
 */
import type {
  ExperienceLevel,
  LearningModuleRow,
  LearningPlanLimitsRow,
  LearningPlanRow,
  LearningTaskRow,
  PrimaryGoal,
  TechnologyCategory,
  UiLanguage,
} from '@ai-mentor/shared';

/** Enums shared with the API (@ai-mentor/shared). */
export type { ExperienceLevel, PrimaryGoal, TechnologyCategory, UiLanguage };

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

/** Learning plans (Phase 7a). Rows are written only by the database functions. */
export type LearningPlanTableRow = LearningPlanRow & { user_id: string };
export type LearningModuleTableRow = LearningModuleRow & { user_id: string };
export type LearningTaskTableRow = LearningTaskRow & { user_id: string };

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
      learning_plans: {
        Row: LearningPlanTableRow;
        Insert: never;
        /** Only active → archived, through RLS; the app uses archive_learning_plan. */
        Update: { status?: 'archived' };
        Relationships: [];
      };
      learning_modules: {
        Row: LearningModuleTableRow;
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'learning_modules_plan_fkey';
            columns: ['plan_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'learning_plans';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      learning_tasks: {
        Row: LearningTaskTableRow;
        Insert: never;
        /** Only completed_at (the database sets the time); the app uses set_learning_task_completed. */
        Update: { completed_at?: string | null };
        Relationships: [
          {
            foreignKeyName: 'learning_tasks_plan_fkey';
            columns: ['plan_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'learning_plans';
            referencedColumns: ['id', 'user_id'];
          },
          {
            foreignKeyName: 'learning_tasks_module_fkey';
            columns: ['module_id', 'plan_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'learning_modules';
            referencedColumns: ['id', 'plan_id', 'user_id'];
          },
        ];
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
      get_my_learning_plan_limits: {
        Args: Record<string, never>;
        Returns: LearningPlanLimitsRow[];
      };
      set_learning_task_completed: {
        Args: { p_task_id: string; p_completed: boolean };
        Returns: {
          task_id: string;
          plan_id: string;
          completed_at: string | null;
          done: number;
          total: number;
        }[];
      };
      archive_learning_plan: {
        Args: { p_plan_id: string };
        Returns: { plan_id: string; status: 'archived'; archived_at: string }[];
      };
      delete_learning_plan: {
        Args: { p_plan_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
