import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType | null = null;

  constructor(private readonly config: ConfigService) {}

  private async getClient(): Promise<RedisClientType | null> {
    if (this.client?.isOpen) return this.client;
    try {
      const redisConfig = this.config.get('redis');
      this.client = createClient({
        socket: {
          host: redisConfig.host,
          port: redisConfig.port,
          connectTimeout: 2000,
          reconnectStrategy: false,
        },
        password: redisConfig.password || undefined,
      });
      this.client.on('error', (err) => this.logger.warn(`redis: ${err.message}`));
      await this.client.connect();
      return this.client;
    } catch (err) {
      this.logger.warn(`redis unavailable, degrade gracefully: ${(err as Error).message}`);
      return null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const client = await this.getClient();
    if (!client) return null;
    const raw = await client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const client = await this.getClient();
    if (!client) return;
    await client.set(key, JSON.stringify(value), ttlSeconds ? { EX: ttlSeconds } : undefined);
  }

  async del(key: string): Promise<void> {
    const client = await this.getClient();
    if (!client) return;
    await client.del(key);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) await this.client.quit();
  }
}
