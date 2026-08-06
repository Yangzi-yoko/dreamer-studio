import { RentalItemService } from './rental-item.service';

describe('RentalItemService', () => {
  const repo: any = {
    findAndCount: jest.fn().mockResolvedValue([
      [{ id: 1, name: '汉服A', billingType: 'day', unitPriceCents: 5000, depositCents: 20000, stock: 5, enabled: true }],
      1,
    ]),
  };
  const service = new RentalItemService(repo);

  it('page converts cents to yuan', async () => {
    const res = await service.page(1, 10);
    expect(res.list[0].unitPrice).toBe(50);
    expect(res.list[0].deposit).toBe(200);
  });
});
