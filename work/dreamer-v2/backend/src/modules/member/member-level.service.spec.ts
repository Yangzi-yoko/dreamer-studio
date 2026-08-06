import { MemberLevelService } from './member-level.service';

describe('MemberLevelService', () => {
  const repo: any = {
    findAndCount: jest.fn().mockResolvedValue([
      [{ id: 1, name: '黄金会员', minSpendCents: 30000, minOrders: 0, sort: 2, enabled: true }],
      1,
    ]),
  };
  const service = new MemberLevelService(repo);

  it('page converts minSpend cents to yuan', async () => {
    const res = await service.page(1, 10);
    expect(res.list[0].minSpend).toBe(300);
  });
});
