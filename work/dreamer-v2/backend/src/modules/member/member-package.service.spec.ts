import { MemberPackageService } from './member-package.service';

describe('MemberPackageService', () => {
  const cardRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e), findAndCount: jest.fn() };
  const userRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e), findOneBy: jest.fn(), find: jest.fn() };
  const usageRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const walletRepo: any = { findOneBy: jest.fn(), save: jest.fn(async (e: any) => e) };
  const logRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const service = new MemberPackageService(cardRepo, userRepo, usageRepo, walletRepo, logRepo);

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

  it('buyWithWallet deducts balance and creates user package', async () => {
    cardRepo.findOneBy.mockResolvedValue({ id: 1, name: '10次棚拍卡', totalTimes: 10, priceCents: 50000 });
    walletRepo.findOneBy.mockResolvedValue({ memberId: 1, balanceCents: 100000 });
    const res = await service.buyWithWallet(1, 1);
    expect(res.remainingTimes).toBe(10);
    expect(walletRepo.save).toHaveBeenCalledWith(expect.objectContaining({ balanceCents: 50000 }));
  });

  it('buyWithWallet rejects insufficient balance', async () => {
    cardRepo.findOneBy.mockResolvedValue({ id: 1, name: '10次棚拍卡', totalTimes: 10, priceCents: 50000 });
    walletRepo.findOneBy.mockResolvedValue({ memberId: 1, balanceCents: 10000 });
    await expect(service.buyWithWallet(1, 1)).rejects.toThrow('余额不足');
  });
});
