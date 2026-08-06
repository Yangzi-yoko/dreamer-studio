import { TimeSlotService } from './time-slot.service';

describe('TimeSlotService', () => {
  const repo: any = {
    find: jest.fn(async ({ where }: any) => {
      const all = [
        { id: 1, studioId: 1, startTime: '09:00', endTime: '10:00', enabled: true },
        { id: 2, studioId: 1, startTime: '10:00', endTime: '11:00', enabled: false },
      ];
      return all.filter((s) => s.studioId === where.studioId && s.enabled === where.enabled);
    }),
    delete: jest.fn(),
    create: jest.fn((dto: any) => dto),
    save: jest.fn(async (e: any) => e),
  };
  const service = new TimeSlotService(repo, { transaction: jest.fn() } as any);

  it('findEnabledByStudio filters enabled', async () => {
    const list = await service.findEnabledByStudio(1);
    expect(list).toHaveLength(1);
    expect(list[0].startTime).toBe('09:00');
  });
});
