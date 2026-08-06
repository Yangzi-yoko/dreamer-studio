import { MemberSigninService } from './member-signin.service';

describe('MemberSigninService', () => {
  const logRepo: any = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn((d: any) => d),
    save: jest.fn(async (e: any) => e),
    findAndCount: jest.fn(),
  };
  const pointsService: any = { earn: jest.fn(async (_m: number, _p: number, r?: string) => ({ balance: 100 })) };
  const service = new MemberSigninService(logRepo, pointsService);

  it('first checkin awards base points with streak 1', async () => {
    logRepo.findOneBy.mockResolvedValue(null);
    const res = await service.checkin(1);
    expect(res.streak).toBe(1);
    expect(res.pointsAwarded).toBe(10);
    expect(pointsService.earn).toHaveBeenCalledWith(1, 10, expect.any(String));
  });

  it('rejects duplicate checkin today', async () => {
    logRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, signinDate: '2026-08-07', streak: 1, pointsAwarded: 10 });
    await expect(service.checkin(1)).rejects.toThrow('今日已签到');
  });

  it('streak 7 awards bonus', async () => {
    logRepo.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 1, memberId: 1, signinDate: '2026-08-06', streak: 6, pointsAwarded: 10 });
    const res = await service.checkin(1);
    expect(res.streak).toBe(7);
    expect(res.pointsAwarded).toBe(60);
  });
});
