import { MemberCouponService } from './member-coupon.service';

describe('MemberCouponService', () => {
  const couponRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e), findAndCount: jest.fn() };
  const userRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e), findOneBy: jest.fn(), find: jest.fn() };
  const usageRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const service = new MemberCouponService(couponRepo, userRepo, usageRepo);

  it('issue rejects when coupon sold out', async () => {
    couponRepo.findOneBy.mockResolvedValue({ id: 1, totalCount: 10, issuedCount: 10, enabled: true });
    await expect(service.issue(1, 1)).rejects.toThrow('优惠券已发完');
  });

  it('issue increments issuedCount', async () => {
    couponRepo.findOneBy.mockResolvedValue({ id: 1, totalCount: 10, issuedCount: 3, enabled: true });
    const res = await service.issue(1, 1);
    expect(res.issuedCount).toBe(4);
  });

  it('use computes amount deduction', async () => {
    userRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, couponId: 1, status: 'unused' });
    couponRepo.findOneBy.mockResolvedValue({ id: 1, type: 'amount', value: 1000, minSpendCents: 0, enabled: true });
    const res = await service.use(1, 1, 'B1', 10000);
    expect(res.deductCents).toBe(1000);
  });
});
