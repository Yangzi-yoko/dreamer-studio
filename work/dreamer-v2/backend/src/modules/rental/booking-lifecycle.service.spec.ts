import { BookingLifecycleService } from './booking-lifecycle.service';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('BookingLifecycleService', () => {
  const repo: any = {
    findOneBy: jest.fn(),
    save: jest.fn(async (e: any) => e),
  };
  const service = new BookingLifecycleService(repo);

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
});
