import { MemberAuthService } from './member-auth.service';

describe('MemberAuthService', () => {
  const memberRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const jwt: any = { sign: jest.fn(() => 'member-token') };
  const redis: any = { get: jest.fn().mockResolvedValue(null), set: jest.fn(), incr: jest.fn(), expire: jest.fn() };
  const service = new MemberAuthService(memberRepo, jwt, redis);

  beforeEach(() => {
    memberRepo.findOneBy.mockReset();
    redis.get.mockReset();
    redis.get.mockResolvedValue(null);
  });

  it('register creates member and returns token', async () => {
    memberRepo.findOneBy.mockResolvedValue(null);
    const res = await service.register({ phone: '13800000003', username: 'user3', password: 'pass123', nickname: '新用户' }, 'ip1', 'fp1');
    expect(res.accessToken).toBe('member-token');
    expect(res.member.phone).toBe('13800000003');
  });

  it('register rejects duplicate phone', async () => {
    memberRepo.findOneBy.mockResolvedValue({ id: 1 });
    await expect(service.register({ phone: '13800000003', username: 'user3', password: 'pass123', nickname: '新用户' }, 'ip1', 'fp1')).rejects.toThrow('手机号已注册');
  });

  it('register rejects ip rate limit', async () => {
    redis.get.mockResolvedValueOnce('5');
    await expect(service.register({ phone: '13800000004', username: 'user4', password: 'pass123', nickname: '新用户' }, 'ip1', 'fp1')).rejects.toThrow('注册太频繁');
  });

  it('login returns token for valid credentials', async () => {
    const bcrypt = require('bcryptjs');
    memberRepo.findOneBy.mockResolvedValue({ id: 1, phone: '13800000001', username: 'user1', nickname: '示例会员A', status: 1, passwordHash: bcrypt.hashSync('pass123', 10) });
    const res = await service.login('user1', 'pass123');
    expect(res.accessToken).toBe('member-token');
  });

  it('login rejects wrong password', async () => {
    const bcrypt = require('bcryptjs');
    memberRepo.findOneBy.mockResolvedValue({ id: 1, phone: '13800000001', username: 'user1', nickname: '示例会员A', status: 1, passwordHash: bcrypt.hashSync('pass123', 10) });
    await expect(service.login('user1', 'wrong')).rejects.toThrow('账号或密码错误');
  });

  it('login rejects disabled member', async () => {
    const bcrypt = require('bcryptjs');
    memberRepo.findOneBy.mockResolvedValue({ id: 1, phone: '13800000001', username: 'user1', nickname: '示例会员A', status: 0, passwordHash: bcrypt.hashSync('pass123', 10) });
    await expect(service.login('user1', 'pass123')).rejects.toThrow('账号已禁用');
  });
});
