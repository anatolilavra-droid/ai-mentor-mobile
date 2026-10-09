import type { HomeSummary } from '../types';

import { homeSummaryMock } from './home.mock';

const MOCK_LATENCY_MS = 600;

/**
 * Local data source for the Home screen. Phase 1 has no network: this
 * resolves mock data after a short delay so the loading state is real.
 */
export function getHomeSummary(): Promise<HomeSummary> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(homeSummaryMock), MOCK_LATENCY_MS);
  });
}
