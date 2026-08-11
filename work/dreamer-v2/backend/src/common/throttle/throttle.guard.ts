import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BusinessException } from '../exceptions/business.exception';
import { RedisService } from '../redis/redis.service';
import { THROTTLE_KEY, ThrottleOptions } from './throttle.decorator';

@Injectable()
export class ThrottleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<ThrottleOptions>(THROTTLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) return true;
    const request = context.switchToHttp().getRequest();
    const rawIp = request.headers?.['x-forwarded-for'] || request.ip || '';
    const ip = rawIp.toString().split(',')[0].trim() || 'unknown';
    const route = `${request.method}:${request.path || request.originalUrl || request.url}`;
    const count = await this.redis.incr(`thr:${route}:${ip}`, options.windowSeconds);
    if (count > options.limit) {
      throw new BusinessException('请求过于频繁，请稍后再试', 42900);
    }
    return true;
  }
}