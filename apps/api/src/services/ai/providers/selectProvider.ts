import type { AIProvider } from './AIProvider.js';

/**
 * Picks the provider for one user. A real provider is used only for the users
 * listed in `allowedUserIds`; everyone else gets the fallback (mock). While the
 * real provider runs on a free tier, this keeps other people's data away from it.
 */
export function createProviderSelector(options: {
  provider: AIProvider;
  fallback: AIProvider;
  allowedUserIds: readonly string[];
}): (userId: string) => AIProvider {
  const allowed = new Set(options.allowedUserIds);
  return (userId) =>
    options.provider.name === 'mock' || allowed.has(userId) ? options.provider : options.fallback;
}
