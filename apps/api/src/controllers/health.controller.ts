import type { HealthResponse } from '../schemas/health.schema.js';

/** Liveness only: no environment, dependency or host details. */
export function createHealthHandler(version: string) {
  const startedAt = Date.now();
  return async (): Promise<HealthResponse> => ({
    status: 'ok',
    version,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
  });
}
