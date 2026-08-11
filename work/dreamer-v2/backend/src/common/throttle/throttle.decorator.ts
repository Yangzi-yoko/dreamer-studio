import { SetMetadata } from '@nestjs/common';

export const THROTTLE_KEY = 'throttle';

export interface ThrottleOptions {
  limit: number;
  windowSeconds: number;
}

export const Throttle = (options: ThrottleOptions) => SetMetadata(THROTTLE_KEY, options);