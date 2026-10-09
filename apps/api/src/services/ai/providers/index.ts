import type { AIProvider } from './AIProvider.js';
import { createGeminiProvider } from './gemini.provider.js';
import { createMockProvider } from './mock.provider.js';

export type AIProviderConfig =
  { provider: 'mock' } | { provider: 'gemini'; apiKey: string; model: string };

/** Builds the configured provider. The mock needs no key and never calls the network. */
export function createAIProvider(config: AIProviderConfig): AIProvider {
  switch (config.provider) {
    case 'mock':
      return createMockProvider();
    case 'gemini':
      return createGeminiProvider({ apiKey: config.apiKey, model: config.model });
    default: {
      const unknown: never = config;
      throw new Error(`Unknown AI provider: ${String(unknown)}`);
    }
  }
}
