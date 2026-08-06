import { MemberAuthService } from './member-auth.service';

describe('MemberAuthService', () => {
  const memberRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const jwt: any = { sign: jest.fn(() => 'member-token') };
  const redis: any = { get: jest.fn().mockResolvedValue(null), set: jest.fn(), incr: jest.fn(), expire: jest.fn() };
  const service = new MemberAuthService(memberRepo, jwt, redis);

  it('register creates member and returns token', async () => {
    memberRepo.findOneBy.mockResolvedValue(null);
    const res = await service.register('13800000003', '新用户', 'ip1', 'fp1');
    expect(res.accessToken).toBe('member-token');
    expect(res.member.phone).toBe('13800000003');
  });

  it('register rejects duplicate phone', async () => {
    memberRepo.findOneBy.mockResolvedValue({ id: 1 });
    await expect(service.register('13800000003', '新用户', 'ip1', 'fp1')).rejects.toThrow('手机号已注册');
  });

  it('register rejects ip rate limit', async () => {
    redis.get.mockResolvedValueOnce('5');
    await expect(service.register('13800000004', '新用户', 'ip1', 'fp1')).rejects.toThrow('注册太频繁');
  });

  it('login returns token for existing member', async () => {
    memberRepo.findOneBy.mockResolvedValue({ id: 1, phone: '13800000001', nickname: '示例会员A' });
    const res = await service.login('13800000001');
    expect(res.accessToken).toBe('member-token');
  });
});
