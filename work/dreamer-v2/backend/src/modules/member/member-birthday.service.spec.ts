import { MemberBirthdayService } from './member-birthday.service';

describe('MemberBirthdayService', () => {
  const memberRepo: any = { find: jest.fn() };
  const giftRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const logRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const couponService: any = { issue: jest.fn(async (_m: number, _c: number) => ({})) };
  const service = new MemberBirthdayService(memberRepo, giftRepo, logRepo, couponService);

  it('issues coupon to birthday members once per gift date', async () => {
    giftRepo.findOneBy.mockResolvedValue({ id: 1, couponId: 1, enabled: true });
    memberRepo.find.mockResolvedValue([{ id: 1, phone: '13800000001', birthday: '08-07' }]);
    logRepo.findOneBy.mockResolvedValue(null);
    const res = await service.runDaily('08-07');
    expect(res.issued).toBe(1);
    expect(couponService.issue).toHaveBeenCalledWith(1, 1);
  });

  it('skips members already gifted today', async () => {
    giftRepo.findOneBy.mockResolvedValue({ id: 1, couponId: 1, enabled: true });
    memberRepo.find.mockResolvedValue([{ id: 1, phone: '13800000001', birthday: '08-07' }]);
    logRepo.findOneBy.mockResolvedValue({ id: 1 });
    const res = await service.runDaily('08-07');
    expect(res.issued).toBe(0);
  });
});
