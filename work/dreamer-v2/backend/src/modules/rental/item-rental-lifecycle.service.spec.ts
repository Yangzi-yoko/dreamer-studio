import { ItemRentalLifecycleService } from './item-rental-lifecycle.service';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('ItemRentalLifecycleService', () => {
  const repo: any = { findOneBy: jest.fn(), save: jest.fn(async (e: any) => e) };
  const itemRepo: any = { findOneBy: jest.fn() };
  const service = new ItemRentalLifecycleService(repo, itemRepo);

  it('pay transitions pending to paid', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, status: 'pending' });
    const res = await service.pay(1);
    expect(res.status).toBe('paid');
  });

  it('return records damage deduction and marks returned', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, status: 'picked', damageDeductCents: 0 });
    const res = await service.returnRental(1, { damageDeductYuan: 50 });
    expect(res.status).toBe('returned');
    expect(res.damageDeductCents).toBe(5000);
  });

  it('extend adds amount for paid order', async () => {
    repo.findOneBy.mockResolvedValue({
      id: 1,
      status: 'paid',
      billingType: 'day',
      quantity: 1,
      unitPriceCents: 5000,
      totalAmountCents: 15000,
      endDate: '2026-08-12',
      slotCount: 0,
    });
    itemRepo.findOneBy.mockResolvedValue({ id: 1, unitPriceCents: 5000 });
    const res = await service.extend(1, { extendDays: 2, extendSlotCount: 0 });
    expect(res.totalAmountCents).toBe(25000);
    expect(res.endDate).toBe('2026-08-14');
  });

  it('rejects extending a cancelled order', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, status: 'cancelled' });
    await expect(service.extend(1, { extendDays: 1, extendSlotCount: 0 })).rejects.toThrow(BusinessException);
  });
});
