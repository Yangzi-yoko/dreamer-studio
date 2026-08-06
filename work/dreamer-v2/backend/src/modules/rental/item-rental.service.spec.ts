import { ItemRentalService } from './item-rental.service';

describe('ItemRentalService', () => {
  const itemRepo: any = { findOne: jest.fn() };
  const rentalRepo: any = {
    create: jest.fn((_e: any, d: any) => d),
    save: jest.fn(async (e: any) => ({ ...e, id: 1 })),
    findAndCount: jest.fn(),
    sum: jest.fn(),
  };
  let lockedItem: any = null;
  const dataSource: any = {
    transaction: jest.fn(async (fn: any) =>
      fn({
        findOne: jest.fn(() => Promise.resolve(lockedItem)),
        sum: jest.fn().mockResolvedValue(0),
        create: jest.fn((_e: any, d: any) => d),
        save: jest.fn(async (e: any) => e),
      }),
    ),
  };
  const redis: any = { get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn() };
  const service = new ItemRentalService(itemRepo, rentalRepo, dataSource, redis);

  it('calculates day-mode total = unitPrice * quantity * days', async () => {
    lockedItem = {
      id: 1,
      name: '汉服A',
      billingType: 'day',
      unitPriceCents: 5000,
      depositCents: 20000,
      stock: 5,
      enabled: true,
    };
    itemRepo.findOne.mockResolvedValue(lockedItem);
    const dto = {
      itemId: 1,
      customerName: '张三',
      customerPhone: '13800000000',
      billingType: 'day',
      quantity: 2,
      startDate: '2026-08-10',
      endDate: '2026-08-12',
      slotCount: 0,
    };
    const res = await service.create(dto as any);
    expect(res.totalAmountCents).toBe(30000); // 50 * 2 * 3天
    expect(res.depositCents).toBe(20000);
  });

  it('rejects when stock insufficient', async () => {
    lockedItem = {
      id: 1,
      name: '汉服A',
      billingType: 'day',
      unitPriceCents: 5000,
      depositCents: 20000,
      stock: 2,
      enabled: true,
    };
    itemRepo.findOne.mockResolvedValue(lockedItem);
    const dto = {
      itemId: 1,
      customerName: '张三',
      customerPhone: '13800000000',
      billingType: 'day',
      quantity: 3,
      startDate: '2026-08-10',
      endDate: '2026-08-11',
      slotCount: 0,
    };
    await expect(service.create(dto as any)).rejects.toThrow('库存不足');
  });
});
