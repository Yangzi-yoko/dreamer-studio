import { MemberPackageService } from './member-package.service';

describe('MemberPackageService', () => {
  const cardRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e), findAndCount: jest.fn() };
  const userRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e), findOneBy: jest.fn(), find: jest.fn() };
  const usageRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const service = new MemberPackageService(cardRepo, userRepo, usageRepo);

  it('buy creates user package with full times', async () => {
    cardRepo.findOneBy.mockResolvedValue({ id: 1, name: '10次棚拍卡', totalTimes: 10, priceCents: 50000 });
    const res = await service.buy(1, 1);
    expect(res.remainingTimes).toBe(10);
  });

  it('use decrements remaining times', async () => {
    userRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, packageId: 1, remainingTimes: 3, status: 'active' });
    const res = await service.use(1, 1);
    expect(res.remainingTimes).toBe(2);
  });

  it('use rejects zero remaining', async () => {
    userRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, packageId: 1, remainingTimes: 0, status: 'active' });
    await expect(service.use(1, 1)).rejects.toThrow('次卡次数不足');
  });
});
