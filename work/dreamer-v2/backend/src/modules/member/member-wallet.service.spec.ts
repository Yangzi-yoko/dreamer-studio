import { MemberWalletService } from './member-wallet.service';

describe('MemberWalletService', () => {
  const walletRepo: any = {
    findOneBy: jest.fn(),
    create: jest.fn((d: any) => d),
    save: jest.fn(async (e: any) => e),
  };
  const logRepo: any = {
    create: jest.fn((d: any) => d),
    save: jest.fn(async (e: any) => e),
    findAndCount: jest.fn(),
  };
  const service = new MemberWalletService(walletRepo, logRepo);

  it('recharge adds balance and writes log', async () => {
    walletRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, balanceCents: 1000 });
    const res = await service.recharge(1, 5000, '充值');
    expect(res.balanceCents).toBe(6000);
  });

  it('deduct rejects insufficient balance', async () => {
    walletRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, balanceCents: 100 });
    await expect(service.deduct(1, 5000, '消费')).rejects.toThrow('余额不足');
  });

  it('deduct decreases balance', async () => {
    walletRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 1, balanceCents: 10000 });
    const res = await service.deduct(1, 3000, '消费');
    expect(res.balanceCents).toBe(7000);
  });
});
