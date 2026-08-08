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
  const walletRepo: any = { findOneBy: jest.fn(), create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const walletLogRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const userPackageRepo: any = { findOneBy: jest.fn(), save: jest.fn(async (e: any) => e) };
  const packageUsageRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const couponRepo: any = { findOneBy: jest.fn() };
  const userCouponRepo: any = { findOneBy: jest.fn() };
  const couponUsageRepo: any = { create: jest.fn((d: any) => d), save: jest.fn(async (e: any) => e) };
  const dataSource: any = {
    transaction: jest.fn(async (fn: any) => fn({ find: jest.fn().mockResolvedValue([]), findBy: jest.fn(), create: jest.fn((_entity: any, d: any) => d), save: jest.fn(async (e: any) => e) })),
  };
  const redis: any = { get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn() };
  const service = new BookingService(studioRepo, bookingRepo, slotRepo, btsRepo, walletRepo, walletLogRepo, userPackageRepo, packageUsageRepo, couponRepo, userCouponRepo, couponUsageRepo, dataSource, redis);

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

  it('calendar groups bookings by date', async () => {
    const bookingRepo2: any = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn().mockResolvedValue([
        { id: 1, bookingNo: 'B1', customerName: '张三', customerPhone: '13800000000', status: 'paid', bookingDate: '2026-10-01' },
        { id: 2, bookingNo: 'B2', customerName: '李四', customerPhone: '13900000000', status: 'checked', bookingDate: '2026-10-02' },
      ]),
      findAndCount: jest.fn(),
    };
    const btsRepoFind: any = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn().mockResolvedValue([
        { bookingId: 1, timeSlotId: 11 },
        { bookingId: 2, timeSlotId: 21 },
      ]),
    };
    const service2 = new BookingService(studioRepo, bookingRepo2, slotRepo, btsRepoFind, walletRepo, walletLogRepo, userPackageRepo, packageUsageRepo, couponRepo, userCouponRepo, couponUsageRepo, dataSource, redis);
    const cal = await service2.calendar(1, '2026-10');
    expect(cal).toHaveLength(31);
    expect(cal[0].date).toBe('2026-10-01');
    expect(cal[0].bookings[0].timeSlotIds).toEqual([11]);
    expect(cal[1].occupiedTimeSlotIds).toEqual([21]);
  });

  it('treats completed bookings as occupying the slot', async () => {
    studioRepo.findOneBy.mockResolvedValue({
      id: 1,
      weekdayPriceCents: 10000,
      weekendPriceCents: 15000,
      holidayPriceCents: 20000,
      depositCents: 5000,
    });
    slotRepo.findBy.mockResolvedValue([{ id: 1, startTime: '09:00', endTime: '10:00' }]);
    const occupied: any = {
      find: jest.fn().mockResolvedValue([{ bookingId: 99, timeSlotId: 1 }]),
      findBy: jest.fn().mockResolvedValue([{ id: 99, bookingDate: '2026-10-01', status: 'completed' }]),
      create: jest.fn((_e: any, d: any) => d),
      save: jest.fn(async (e: any) => e),
    };
    const dataSourceOcc: any = { transaction: jest.fn(async (fn: any) => fn(occupied)) };
    const service3 = new BookingService(studioRepo, bookingRepo, slotRepo, btsRepo, walletRepo, walletLogRepo, userPackageRepo, packageUsageRepo, couponRepo, userCouponRepo, couponUsageRepo, dataSourceOcc, redis);
    const dto = {
      studioId: 1,
      customerName: '张三',
      customerPhone: '13800000000',
      bookingDate: '2026-10-01',
      timeSlotIds: [1],
    };
    await expect(service3.create(dto as any)).rejects.toThrow('该时段已被预订');
  });

  it('preview computes coupon deduction', async () => {
    studioRepo.findOneBy.mockResolvedValue({
      id: 1,
      weekdayPriceCents: 10000,
      weekendPriceCents: 15000,
      holidayPriceCents: 20000,
      depositCents: 5000,
    });
    slotRepo.findBy.mockResolvedValue([{ id: 1, startTime: '09:00', endTime: '10:00' }]);
    userCouponRepo.findOneBy.mockResolvedValue({ id: 1, memberId: 5, couponId: 1, status: 'unused' });
    couponRepo.findOneBy.mockResolvedValue({ id: 1, type: 'amount', value: 1000, minSpendCents: 0, enabled: true, name: '满100减10' });
    const res = await service.preview({ studioId: 1, bookingDate: '2026-08-19', timeSlotIds: [1], memberId: 5, userCouponId: 1 });
    expect(res.totalAmount).toBe(100);
    expect(res.deduct).toBe(10);
    expect(res.payable).toBe(90);
  });
});
