import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { BusinessException } from '../exceptions/business.exception';

const WINDOW_SECONDS = 900;
const MAX_USER_FAILS = 5;
const MAX_IP_FAILS = 30;

@Injectable()
export class LoginThrottleService {
  constructor(private readonly redis: RedisService) {}

  private userLock(username: string): string {
    return `login:lock:user:${username}`;
  }

  private ipLock(ip: string): string {
    return `login:lock:ip:${ip}`;
  }

  private userFails(username: string): string {
    return `login:fail:user:${username}`;
  }

  private ipFails(ip: string): string {
    return `login:fail:ip:${ip}`;
  }

  async assertAllowed(username: string, ip?: string): Promise<void> {
    if (await this.redis.get(this.userLock(username))) {
      throw new BusinessException('失败次数过多，账号已锁定，请15分钟后再试', 42901);
    }
    if (ip && (await this.redis.get(this.ipLock(ip)))) {
      throw new BusinessException('尝试过于频繁，请稍后再试', 42901);
    }
  }

  async onSuccess(username: string): Promise<void> {
    await this.redis.del(this.userFails(username));
    await this.redis.del(this.userLock(username));
  }

  async onFailure(username: string, ip?: string): Promise<void> {
    const userFails = await this.redis.incr(this.userFails(username), WINDOW_SECONDS);
    let ipFailCount = 0;
    if (ip) {
      ipFailCount = await this.redis.incr(this.ipFails(ip), WINDOW_SECONDS);
    }
    if (userFails >= MAX_USER_FAILS || ipFailCount >= MAX_IP_FAILS) {
      if (userFails >= MAX_USER_FAILS) {
        await this.redis.set(this.userLock(username), '1', WINDOW_SECONDS);
        await this.redis.del(this.userFails(username));
      }
      if (ip && ipFailCount >= MAX_IP_FAILS) {
        await this.redis.set(this.ipLock(ip), '1', WINDOW_SECONDS);
        await this.redis.del(this.ipFails(ip));
      }
      throw new BusinessException('失败次数过多，请15分钟后再试', 42901);
    }
  }
}