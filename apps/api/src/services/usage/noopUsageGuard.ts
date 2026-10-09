import type { UsageGuard } from './UsageGuard.js';

/** Phase 4 placeholder: allows everything and records nothing. */
export const noopUsageGuard: UsageGuard = {
  check: async () => ({ allowed: true, quota: null }),
  record: async () => {},
};
