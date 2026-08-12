import { BookingLifecycleService } from './booking-lifecycle.service';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('BookingLifecycleService', () => {
  const repo: any = {
    findOneBy: jest.fn(),
    save: jest.fn(async (e: any) => e),
  };
  const walletRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const walletLogRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const userPackageRepo: any = { findOneBy: jest.fn(), save: jest.fn(async (e: any) => e) };
  const packageUsageRepo: any = { findOne: jest.fn() };
  const service = new BookingLifecycleService(repo, walletRepo, walletLogRepo, userPackageRepo, packageUsageRepo);

  it('pay transitions pending to paid', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, status: 'pending' });
    const res = await service.pay(1);
    expect(res.status).toBe('paid');
  });

  it('rejects paying a cancelled booking', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, status: 'cancelled' });
    await expect(service.pay(1)).rejects.toThrow(BusinessException);
  });

  it('complete refunds deposit', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, status: 'checked', depositRefunded: false });
    const res = await service.complete(1);
    expect(res.status).toBe('completed');
    expect(res.depositRefunded).toBe(true);
  });

  it('refund credits wallet for wallet-paid booking', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, bookingNo: 'B1', status: 'paid', memberId: 5, payMethod: 'wallet', totalAmountCents: 20000, discountCents: 1000 });
    walletRepo.findOneBy.mockResolvedValue({ memberId: 5, balanceCents: 0 });
    const res = await service.refund(1);
    expect(res.status).toBe('refunded');
    expect(walletRepo.save).toHaveBeenCalledWith(expect.objectContaining({ balanceCents: 19000 }));
    expect(walletLogRepo.save).toHaveBeenCalledWith(expect.objectContaining({ type: 'refund', amountCents: 19000 }));
  });

  it('refund restores package minutes for package-paid booking', async () => {
    repo.findOneBy.mockResolvedValue({ id: 2, bookingNo: 'B2', status: 'paid', memberId: 5, payMethod: 'package' });
    packageUsageRepo.findOne.mockResolvedValue({ userPackageId: 9, memberId: 5, remark: '场地预订 B2', minutes: 120 });
    userPackageRepo.findOneBy.mockResolvedValue({ id: 9, memberId: 5, remainingMinutes: 6000, status: 'active' });
    const res = await service.refund(2);
    expect(res.status).toBe('refunded');
    expect(userPackageRepo.save).toHaveBeenCalledWith(expect.objectContaining({ remainingMinutes: 6120 }));
  });
});
