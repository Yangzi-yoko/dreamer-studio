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
    repo.findAndCount.mockResolvedValue([
      [{ id: 1, phone: '13800000000', nickname: '张三', totalSpendCents: 15000, totalOrders: 3, tags: [] }],
      1,
    ]);
    const res = await service.page(1, 10);
    expect(res.list[0].totalSpend).toBe(150);
  });

  it('rejects duplicate phone on create', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1 });
    await expect(service.create({ phone: '13800000000', nickname: '张三' } as any)).rejects.toThrow('手机号已注册');
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
