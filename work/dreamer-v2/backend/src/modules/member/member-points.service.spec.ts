import { MemberPointsService } from './member-points.service';

describe('MemberPointsService', () => {
  const pointsRepo: any = {
    findOneBy: jest.fn(),
    create: jest.fn((d: any) => d),
    save: jest.fn(async (e: any) => e),
  };
  const logRepo: any = {
    create: jest.fn((d: any) => d),
    save: jest.fn(async (e: any) => e),
    findAndCount: jest.fn(),
  };
  const service = new MemberPointsService(pointsRepo, logRepo);

  it('earn adds points and writes log', async () => {
    pointsRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, balance: 100 });
    const res = await service.earn(1, 50, '消费得积分');
    expect(res.balance).toBe(150);
    expect(logRepo.save).toHaveBeenCalled();
  });

  it('spend rejects insufficient balance', async () => {
    pointsRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, balance: 10 });
    await expect(service.spend(1, 20, '兑换')).rejects.toThrow('积分不足');
  });

  it('spend deducts and writes log', async () => {
    pointsRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, balance: 100 });
    const res = await service.spend(1, 30, '兑换');
    expect(res.balance).toBe(70);
  });
});
