import type { HomeSummary } from '../types';

/** Static Phase 1 data. Replaced by the API in a later phase. */
export const homeSummaryMock: HomeSummary = {
  nextStep: {
    topic: 'Understand async / await',
    track: 'JavaScript Foundations',
    progress: 0.42,
    lessonsLeft: 3,
  },
  concept: {
    title: 'Await pauses the function, not the app',
    language: 'TypeScript',
    code: [
      'async function loadUser(id: string) {',
      '  const response = await fetch(`/users/${id}`);',
      '  return response.json();',
      '}',
    ].join('\n'),
  },
  savedAnswers: [],
};
