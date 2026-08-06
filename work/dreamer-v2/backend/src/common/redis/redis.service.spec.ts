import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: { get: (k: string) => ({ host: '127.0.0.1', port: 6379, password: '' } as any) } },
      ],
    }).compile();
    service = moduleRef.get(RedisService);
  });

  it('degraded get returns null when redis is down', async () => {
    const value = await service.get('missing');
    expect(value).toBeNull();
  });
});
