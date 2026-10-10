import type { LearnerContext } from './types.js';

const LANGUAGE_NAMES = { en: 'English', ru: 'Russian', de: 'German' } as const;

const LEVEL_GUIDANCE = {
  beginner: 'The learner is a beginner: avoid jargon, define every new term, use tiny examples.',
  junior:
    'The learner is a junior developer: explain clearly, short examples, mention best practices.',
  middle: 'The learner is a middle developer: be concise, focus on trade-offs and reasoning.',
  advanced: 'The learner is advanced: be precise and brief, skip the basics.',
} as const;

/**
 * Describes the learner for the system prompt. Every value here is an enum or
 * a validated slug, so no free user text reaches the system prompt.
 */
export function describeLearner(learner: LearnerContext): string {
  const lines = [
    learner.level ? LEVEL_GUIDANCE[learner.level] : LEVEL_GUIDANCE.beginner,
    `Answer in ${LANGUAGE_NAMES[learner.answerLanguage]}. Keep code, identifiers and error messages in their original form.`,
  ];
  if (learner.learningGoal) lines.push(`The learner's main goal: ${learner.learningGoal}.`);
  if (learner.technology) lines.push(`The question is about: ${learner.technology}.`);
  return lines.join('\n');
}

/**
 * describeLearner plus the onboarding context (technologies, daily time).
 * Used from chat/v2 on; v1 prompts keep describeLearner unchanged.
 */
export function describeLearnerProfile(learner: LearnerContext): string {
  const lines = [describeLearner(learner)];
  if (learner.technologies.length > 0) {
    lines.push(`Technologies the learner studies: ${learner.technologies.join(', ')}.`);
  }
  if (learner.dailyMinutes) {
    lines.push(
      `The learner has about ${learner.dailyMinutes} minutes a day: keep suggested exercises small enough for that.`,
    );
  }
  return lines.join('\n');
}

/**
 * Wraps user text in clear delimiters. The system prompt tells the model to
 * treat everything inside as data, not as instructions.
 */
export function asUserData(tag: string, content: string): string {
  return `<${tag}>\n${content}\n</${tag}>`;
}

/**
 * Like asUserData, with optional attributes, and the closing tag inside the
 * content is neutralized so pasted text cannot end the block early. Used from
 * code-review/v2 on; v1 prompts keep asUserData unchanged.
 */
export function asDelimitedData(
  tag: string,
  content: string,
  attributes: Record<string, string> = {},
): string {
  const attrs = Object.entries(attributes)
    .map(([name, value]) => ` ${name}="${value.replace(/[^a-z0-9_-]/gi, '')}"`)
    .join('');
  const safe = content.replace(new RegExp(`</(\\s*)${tag}`, 'gi'), `<\\/$1${tag}`);
  return `<${tag}${attrs}>\n${safe}\n</${tag}>`;
}
