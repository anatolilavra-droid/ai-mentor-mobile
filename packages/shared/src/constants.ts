/**
 * Values shared by the database, the API and the app. Keep them in sync with
 * the checks in supabase/migrations.
 */

export const EXPERIENCE_LEVELS = ['beginner', 'junior', 'middle', 'advanced'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const PRIMARY_GOALS = [
  'learn_javascript',
  'build_web_apps',
  'prepare_for_job',
  'improve_fundamentals',
  'learn_react',
  'personal_projects',
] as const;
export type PrimaryGoal = (typeof PRIMARY_GOALS)[number];

export const UI_LANGUAGES = ['en', 'ru', 'de'] as const;
export type UiLanguage = (typeof UI_LANGUAGES)[number];

export const TECHNOLOGY_CATEGORIES = ['language', 'frontend', 'backend', 'tools'] as const;
export type TechnologyCategory = (typeof TECHNOLOGY_CATEGORIES)[number];

/** Profile and onboarding limits (profiles / technologies tables). */
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 50;
/** Starts with a letter (any script); then letters, digits, spaces, . - ' _ */
export const DISPLAY_NAME_PATTERN = /^\p{L}[\p{L}\p{M}\p{N} .'_-]*$/u;
export const DAILY_MINUTES_MIN = 5;
export const DAILY_MINUTES_MAX = 480;
export const DAILY_MINUTE_PRESETS = [15, 30, 45, 60] as const;
export const CUSTOM_GOAL_DETAILS_MAX = 500;
export const TECHNOLOGIES_MIN = 1;
export const TECHNOLOGIES_MAX = 8;
/** Technology catalog ids, e.g. `javascript`, `react-native`. */
export const TECHNOLOGY_ID_PATTERN = /^[a-z0-9-]{1,32}$/;

/** Plans and usage (plan_limits / subscriptions / usage_counters tables). */
export const PLANS = ['free', 'pro'] as const;
export type Plan = (typeof PLANS)[number];
export const SUBSCRIPTION_STATUSES = ['active', 'canceled'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export const USAGE_FEATURES = ['chat', 'code_review'] as const;
export type UsageFeature = (typeof USAGE_FEATURES)[number];

/** Chat request limits. */
export const CHAT_MESSAGE_MAX_LENGTH = 10_000;
/** Hard bounds on the history a request may carry; the server trims further. */
export const CHAT_HISTORY_MAX_ITEMS = 40;
export const CHAT_HISTORY_MAX_TOTAL_CHARS = 60_000;
/** Default trimming: last 12 messages, at most 24 000 characters, 4 000 per older message. */
export const CHAT_HISTORY_DEFAULTS = {
  maxMessages: 12,
  maxChars: 24_000,
  perMessageMax: 4_000,
} as const;
/** Longest AI answer the API returns and the app renders. */
export const AI_ANSWER_MAX_LENGTH = 40_000;

/** Code review: languages, actions and input limits (checked by the app and the API). */
export const CODE_LANGUAGES = [
  'javascript',
  'typescript',
  'html',
  'css',
  'python',
  'json',
] as const;
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];
export const CODE_REVIEW_ACTIONS = ['explain', 'review', 'fix', 'improve'] as const;
export type CodeReviewAction = (typeof CODE_REVIEW_ACTIONS)[number];
export const MAX_CODE_REVIEW_CHARS = 8_000;
export const MAX_CODE_REVIEW_LINES = 400;

/** Code review answer bounds. */
export const CODE_REVIEW_MAX_ISSUES = 30;
export const CODE_REVIEW_MAX_STEPS = 15;
export const CODE_REVIEW_MAX_CHANGES = 15;
export const CODE_REVIEW_FIXED_CODE_MAX_CHARS = 16_000;
export const ISSUE_SEVERITIES = ['error', 'warning', 'info'] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];
export const ISSUE_CATEGORIES = [
  'bug',
  'security',
  'performance',
  'readability',
  'style',
  'best_practice',
] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];
export const REVIEW_CONFIDENCE = ['high', 'medium', 'low'] as const;
export type ReviewConfidence = (typeof REVIEW_CONFIDENCE)[number];

/** AI providers the API may report in a response. */
export const AI_PROVIDERS = ['mock', 'gemini'] as const;
export type AIProviderName = (typeof AI_PROVIDERS)[number];
