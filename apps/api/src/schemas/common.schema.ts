import { z } from 'zod';

/** Query strings must be empty on routes that take no query parameters. */
export const emptyQuerySchema = z.object({}).strict();
