import type { AIProvider, AIProviderName } from './AIProvider.js';
import { createMockProvider } from './mock.provider.js';

/** Phase 4 has only the mock provider. Real providers are added in Phase 5. */
export function createAIProvider(name: AIProviderName): AIProvider {
  switch (name) {
    case 'mock':
      return createMockProvider();
  }
}
