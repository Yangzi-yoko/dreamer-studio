import { MemberActivityService } from './member-activity.service';

describe('MemberActivityService', () => {
  const activityRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e), findAndCount: jest.fn(), find: jest.fn() };
  const regRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e), find: jest.fn() };
  const visibleTagRepo: any = { find: jest.fn(), findBy: jest.fn() };
  const visibleMemberRepo: any = { find: jest.fn(), findBy: jest.fn() };
  const couponService: any = { issue: jest.fn(async () => ({})) };
  const service = new MemberActivityService(activityRepo, regRepo, visibleTagRepo, visibleMemberRepo, couponService);

  it('register rejects ended activity', async () => {
    activityRepo.findOneBy.mockResolvedValue({ id: 1, status: 'ended' });
    await expect(service.register(1, 1)).rejects.toThrow('活动已结束');
  });

  it('register rejects duplicate', async () => {
    activityRepo.findOneBy.mockResolvedValue({ id: 1, status: 'published' });
    regRepo.findOneBy.mockResolvedValue({ id: 1 });
    await expect(service.register(1, 1)).rejects.toThrow('已报名');
  });

  it('register issues coupon when activity has one', async () => {
    activityRepo.findOneBy.mockResolvedValue({ id: 1, status: 'published', couponId: 2 });
    regRepo.findOneBy.mockResolvedValue(null);
    await service.register(1, 1);
    expect(couponService.issue).toHaveBeenCalledWith(1, 2);
  });
});
