import { z } from 'zod';

/** Same values as the profiles table checks (supabase/migrations). */
export const experienceLevelSchema = z.enum(['beginner', 'junior', 'middle', 'advanced']);
export type ExperienceLevel = z.infer<typeof experienceLevelSchema>;

export const primaryGoalSchema = z.enum([
  'learn_javascript',
  'build_web_apps',
  'prepare_for_job',
  'improve_fundamentals',
  'learn_react',
  'personal_projects',
]);
export type PrimaryGoal = z.infer<typeof primaryGoalSchema>;

export const uiLanguageSchema = z.enum(['en', 'ru', 'de']);
export type UiLanguage = z.infer<typeof uiLanguageSchema>;

/** A technology slug such as `javascript`, `node.js` or `c#`. Simple pattern, no backtracking. */
export const technologySlugSchema = z.string().regex(/^[a-z0-9.+#-]{1,40}$/);

/** Query strings must be empty on routes that take no query parameters. */
export const emptyQuerySchema = z.object({}).strict();
