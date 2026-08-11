import { MemberPointsService } from './member-points.service';
import { Member } from './entities/member.entity';
import { MemberPoints } from './entities/member-points.entity';

describe('MemberPointsService', () => {
  const memberRepo: any = {
    findOneBy: jest.fn().mockResolvedValue({ id: 1 }),
  };
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
  const manager: any = {
    getRepository: (entity: any) => {
      if (entity === Member) return memberRepo;
      if (entity === MemberPoints) return pointsRepo;
      return logRepo;
    },
  };
  pointsRepo.manager = manager;
  const service = new MemberPointsService(pointsRepo, logRepo);

  beforeEach(() => {
    jest.clearAllMocks();
    memberRepo.findOneBy.mockResolvedValue({ id: 1 });
  });

  it('earn adds points and writes log', async () => {
    pointsRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, balance: 100 });
    const res = await service.earn(1, 50, '消费得积分');
    expect(res.balance).toBe(150);
    expect(logRepo.save).toHaveBeenCalled();
  });

  it('earn rejects zero points', async () => {
    await expect(service.earn(1, 0)).rejects.toThrow('积分数量必须为正整数');
  });

  it('earn rejects negative points', async () => {
    await expect(service.earn(1, -3)).rejects.toThrow('积分数量必须为正整数');
  });

  it('earn rejects non-numeric points', async () => {
    await expect(service.earn(1, '5' as any)).rejects.toThrow('积分数量必须为正整数');
  });

  it('earn rejects unknown member', async () => {
    memberRepo.findOneBy.mockResolvedValue(null);
    await expect(service.earn(999, 10)).rejects.toThrow('会员不存在');
  });

  it('spend rejects insufficient balance', async () => {
    pointsRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, balance: 10 });
    await expect(service.spend(1, 20, '兑换')).rejects.toThrow('积分不足');
  });

  it('spend rejects zero points', async () => {
    await expect(service.spend(1, 0)).rejects.toThrow('积分数量必须为正整数');
  });

  it('spend deducts and writes log', async () => {
    pointsRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, balance: 100 });
    const res = await service.spend(1, 30, '兑换');
    expect(res.balance).toBe(70);
  });
});
