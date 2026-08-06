import { MemberService } from './member.service';

describe('MemberService', () => {
  const repo: any = {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn((d: any) => d),
    save: jest.fn(async (e: any) => e),
  };
  const levelRepo: any = { find: jest.fn() };
  const tagRepo: any = { findBy: jest.fn() };
  const service = new MemberService(repo, levelRepo, tagRepo);

  it('page converts cents to yuan', async () => {
    repo.findAndCount.mockImplementation(async (opts: any) => [
      [{ id: 1, phone: '13800000000', nickname: '张三', totalSpendCents: 15000, totalOrders: 3, tags: [{ id: 1, name: 'VIP', color: '#E6A23C' }] }],
      1,
    ]);
    const res = await service.page(1, 10);
    expect(res.list[0].totalSpend).toBe(150);
    expect(res.list[0].tags).toHaveLength(1);
  });

  it('rejects duplicate phone on create', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1 });
    await expect(service.create({ phone: '13800000000', nickname: '张三' } as any)).rejects.toThrow('手机号已注册');
  });

  it('create sets username and default password hash', async () => {
    repo.findOneBy.mockResolvedValue(null);
    const bcrypt = require('bcryptjs');
    await service.create({ phone: '13800000000', nickname: '张三' } as any);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      phone: '13800000000',
      username: '13800000000',
      passwordHash: expect.any(String),
    }));
    expect(bcrypt.compareSync('123456', repo.create.mock.calls[0][0].passwordHash)).toBe(true);
  });

  it('update resets password when provided', async () => {
    const member = { id: 1, phone: '13800000000', username: '13800000000', nickname: '张三', tags: [] };
    repo.findOneBy.mockResolvedValue(member);
    await service.update(1, { phone: '13800000000', password: 'newpass123' } as any);
    expect(repo.save).toHaveBeenCalled();
    const saved = repo.save.mock.calls[0][0];
    expect(saved.username).toBe('13800000000');
    expect(saved.passwordHash).not.toBeUndefined();
  });

  it('addConsumption accumulates spend and orders', async () => {
    const member = { id: 1, phone: '13800000000', totalSpendCents: 10000, totalOrders: 1, levelId: 1, tags: [] };
    repo.findOneBy.mockResolvedValue(member);
    levelRepo.find.mockResolvedValue([
      { id: 1, name: '普通会员', minSpendCents: 0, minOrders: 0, sort: 1 },
      { id: 2, name: '黄金会员', minSpendCents: 30000, minOrders: 0, sort: 2 },
    ]);
    const res = await service.addConsumption('13800000000', 5000);
    expect(res.totalSpend).toBe(150);
    expect(res.totalOrders).toBe(2);
    expect(res.levelId).toBe(1);
  });

  it('addConsumption upgrades level when threshold met', async () => {
    const member = { id: 1, phone: '13800000000', totalSpendCents: 29000, totalOrders: 1, levelId: 1, tags: [] };
    repo.findOneBy.mockResolvedValue(member);
    levelRepo.find.mockResolvedValue([
      { id: 1, name: '普通会员', minSpendCents: 0, minOrders: 0, sort: 1 },
      { id: 2, name: '黄金会员', minSpendCents: 30000, minOrders: 0, sort: 2 },
    ]);
    const res = await service.addConsumption('13800000000', 2000);
    expect(res.levelId).toBe(2);
  });
});
