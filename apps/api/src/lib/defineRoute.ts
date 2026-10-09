import type { Request, RequestHandler, Router } from 'express';
import type { z } from 'zod';

import { AppError } from '../errors/AppError.js';
import { requireJson, validate } from '../middleware/validate.js';

type Infer<T> = T extends z.ZodType ? z.infer<T> : undefined;

export type RouteDefinition<TBody extends z.ZodType | undefined, TResponse extends z.ZodType> = {
  method: 'get' | 'post';
  path: string;
  /** Runs before validation, in order (for example auth, then a rate limiter). */
  middleware?: RequestHandler[];
  body?: TBody;
  query?: z.ZodType;
  response: TResponse;
  handler: (input: { req: Request; body: Infer<TBody> }) => Promise<z.input<TResponse>>;
};

/**
 * Registers a typed route: request types come from the Zod schemas, and every
 * response is checked against `response` so the contract cannot drift and no
 * unexpected field leaves the server.
 */
export function defineRoute<TBody extends z.ZodType | undefined, TResponse extends z.ZodType>(
  router: Router,
  route: RouteDefinition<TBody, TResponse>,
): void {
  const handlers: RequestHandler[] = [...(route.middleware ?? [])];
  if (route.body) handlers.push(requireJson);
  if (route.body || route.query) handlers.push(validate({ body: route.body, query: route.query }));

  handlers.push(async (req, res) => {
    const result = await route.handler({ req, body: req.body as Infer<TBody> });
    const parsed = route.response.safeParse(result);
    if (!parsed.success) {
      throw new AppError('INTERNAL_ERROR', { cause: parsed.error });
    }
    if (!res.headersSent) res.status(200).json(parsed.data);
  });

  router[route.method](route.path, ...handlers);
}
