import type { RequestHandler } from 'express';

import { AppError } from '../errors/AppError.js';

export const notFound: RequestHandler = () => {
  throw new AppError('NOT_FOUND');
};
