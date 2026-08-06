import { BookingService } from './booking.service';

describe('BookingService', () => {
  const studioRepo: any = { findOneBy: jest.fn() };
  const bookingRepo: any = {
    create: jest.fn((d: any) => d),
    save: jest.fn(async (e: any) => ({ ...e, id: 1 })),
    findAndCount: jest.fn(),
  };
  const slotRepo: any = { find: jest.fn(), findBy: jest.fn() };
  const btsRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const dataSource: any = {
    transaction: jest.fn(async (fn: any) => fn({ find: jest.fn().mockResolvedValue([]), findBy: jest.fn(), create: jest.fn((_entity: any, d: any) => d), save: jest.fn(async (e: any) => e) })),
  };
  const redis: any = { get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn() };
  const service = new BookingService(studioRepo, bookingRepo, slotRepo, btsRepo, dataSource, redis);

  it('calculates holiday price first', async () => {
    studioRepo.findOneBy.mockResolvedValue({
      id: 1,
      weekdayPriceCents: 10000,
      weekendPriceCents: 15000,
      holidayPriceCents: 20000,
      depositCents: 5000,
    });
    slotRepo.findBy.mockResolvedValue([{ id: 1, startTime: '09:00', endTime: '10:00' }]);
    const dto = {
      studioId: 1,
      customerName: '张三',
      customerPhone: '13800000000',
      bookingDate: '2026-10-01',
      timeSlotIds: [1],
    };
    const res = await service.create(dto as any);
    expect(res.totalAmountCents).toBe(20000);
    expect(res.depositCents).toBe(5000);
    expect(res.unitPriceCents).toBe(20000);
  });

  it('rejects past date', async () => {
    studioRepo.findOneBy.mockResolvedValue({ id: 1, weekdayPriceCents: 10000, weekendPriceCents: 15000, holidayPriceCents: 20000, depositCents: 5000 });
    const dto = {
      studioId: 1,
      customerName: '张三',
      customerPhone: '13800000000',
      bookingDate: '2020-01-01',
      timeSlotIds: [1],
    };
    await expect(service.create(dto as any)).rejects.toThrow('不能预订过去的日期');
  });
});
