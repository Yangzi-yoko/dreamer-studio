import { MemberReferralService } from './member-referral.service';

describe('MemberReferralService', () => {
  const memberRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const relRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const ruleRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const rewardRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e), findAndCount: jest.fn() };
  const walletService: any = { refund: jest.fn(async () => ({})) };
  const service = new MemberReferralService(memberRepo, relRepo, ruleRepo, rewardRepo, walletService);

  it('bind links invitee to referrer by code', async () => {
    memberRepo.findOneBy.mockResolvedValue({ id: 5, referralCode: 'MABC123' });
    relRepo.findOneBy.mockResolvedValue(null);
    const res = await service.bind(9, 'MABC123');
    expect(res.referrerMemberId).toBe(5);
  });

  it('settle pays percent reward to referrer', async () => {
    relRepo.findOneBy.mockResolvedValue({ id: 1, referrerMemberId: 5, inviteeMemberId: 9 });
    ruleRepo.findOneBy.mockResolvedValue({ id: 1, percent: 10, fixedCents: 0, enabled: true });
    const res = await service.settle(5, 9, 'B1', 10000);
    expect(res.rewardCents).toBe(1000);
    expect(walletService.refund).toHaveBeenCalledWith(5, 1000, expect.any(String));
  });

  it('settle returns zero when rule disabled', async () => {
    relRepo.findOneBy.mockResolvedValue({ id: 1, referrerMemberId: 5, inviteeMemberId: 9 });
    ruleRepo.findOneBy.mockResolvedValue(null);
    const res = await service.settle(5, 9, 'B1', 10000);
    expect(res.rewardCents).toBe(0);
  });
});
