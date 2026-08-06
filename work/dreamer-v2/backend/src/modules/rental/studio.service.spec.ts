import { StudioService } from './studio.service';

describe('StudioService', () => {
  const repo: any = {
    findAndCount: jest.fn().mockResolvedValue([
      [{ id: 1, name: 'A棚', weekdayPriceCents: 10000, weekendPriceCents: 15000, holidayPriceCents: 20000, depositCents: 5000, enabled: true }],
      1,
    ]),
  };
  const service = new StudioService(repo);

  it('page converts cents to yuan', async () => {
    const res = await service.page(1, 10);
    expect(res.list[0].weekdayPrice).toBe(100);
    expect(res.list[0].weekendPrice).toBe(150);
    expect(res.list[0].deposit).toBe(50);
  });
});
