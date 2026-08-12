import { MemberPackageService } from './member-package.service';

describe('MemberPackageService', () => {
  const cardRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e), findAndCount: jest.fn() };
  const userRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e), findOneBy: jest.fn(), find: jest.fn() };
  const usageRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const walletRepo: any = { findOneBy: jest.fn(), save: jest.fn(async (e: any) => e) };
  const logRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const service = new MemberPackageService(cardRepo, userRepo, usageRepo, walletRepo, logRepo);

  it('buy creates user package with full minutes', async () => {
    cardRepo.findOneBy.mockResolvedValue({ id: 1, name: '100小时棚拍卡', totalMinutes: 6000, priceCents: 50000 });
    const res = await service.buy(1, 1);
    expect(res.remainingMinutes).toBe(6000);
  });

  it('useMinutes deducts minutes', async () => {
    userRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, packageId: 1, remainingMinutes: 6000, status: 'active' });
    const res = await service.useMinutes(1, 1, 90);
    expect(res.remainingMinutes).toBe(5910);
    expect(usageRepo.save).toHaveBeenCalledWith(expect.objectContaining({ minutes: 90 }));
  });

  it('useMinutes rejects insufficient minutes', async () => {
    userRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, packageId: 1, remainingMinutes: 30, status: 'active' });
    await expect(service.useMinutes(1, 1, 60)).rejects.toThrow('计时卡时长不足');
  });

  it('buyWithWallet deducts balance and creates user package', async () => {
    cardRepo.findOneBy.mockResolvedValue({ id: 1, name: '100小时棚拍卡', totalMinutes: 6000, priceCents: 50000 });
    walletRepo.findOneBy.mockResolvedValue({ memberId: 1, balanceCents: 100000 });
    const res = await service.buyWithWallet(1, 1);
    expect(res.remainingMinutes).toBe(6000);
    expect(walletRepo.save).toHaveBeenCalledWith(expect.objectContaining({ balanceCents: 50000 }));
  });

  it('buyWithWallet rejects insufficient balance', async () => {
    cardRepo.findOneBy.mockResolvedValue({ id: 1, name: '100小时棚拍卡', totalMinutes: 6000, priceCents: 50000 });
    walletRepo.findOneBy.mockResolvedValue({ memberId: 1, balanceCents: 10000 });
    await expect(service.buyWithWallet(1, 1)).rejects.toThrow('余额不足');
  });
});
