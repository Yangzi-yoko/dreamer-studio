import { TimeSlotService } from './time-slot.service';

describe('TimeSlotService', () => {
  const repo: any = {
    find: jest.fn(async ({ where }: any) => {
      const all = [
        { id: 1, studioId: 1, startTime: '09:00', endTime: '10:00', enabled: true },
        { id: 2, studioId: 1, startTime: '10:00', endTime: '11:00', enabled: false },
        { id: 3, studioId: 2, startTime: '09:00', endTime: '10:00', enabled: true },
      ];
      return all.filter((s) => s.studioId === where.studioId);
    }),
    create: jest.fn((dto: any) => dto),
    save: jest.fn(async (e: any) => e),
  };
  const tx = (fn: any) => fn({ getRepository: () => repo, save: repo.save, create: repo.create });
  const service = new TimeSlotService(repo, { transaction: tx } as any);

  beforeEach(() => jest.clearAllMocks());

  it('findEnabledByStudio filters enabled', async () => {
    const enabled = [
      { id: 1, studioId: 1, startTime: '09:00', endTime: '10:00', enabled: true },
    ];
    repo.find.mockImplementation(async ({ where }: any) =>
      enabled.filter((s) => s.studioId === where.studioId && s.enabled === where.enabled),
    );
    const list = await service.findEnabledByStudio(1);
    expect(list).toHaveLength(1);
    expect(list[0].startTime).toBe('09:00');
  });

  it('saveMany keeps ids for unchanged slots and inserts new ones', async () => {
    const all = [
      { id: 1, studioId: 1, startTime: '09:00', endTime: '10:00', enabled: true },
      { id: 2, studioId: 1, startTime: '10:00', endTime: '11:00', enabled: false },
    ];
    repo.find.mockResolvedValue(all);
    const saved: any[] = [];
    repo.save.mockImplementation(async (e: any) => {
      saved.push(e);
      return e;
    });
    const res = await service.saveMany(1, {
      slots: [
        { startTime: '09:00', endTime: '10:00', enabled: true },
        { startTime: '12:00', endTime: '13:00' },
      ],
    });
    const ids = saved.map((s) => s.id);
    expect(ids).toContain(1);
    expect(saved.some((s) => s.startTime === '12:00')).toBe(true);
    expect(saved.some((s) => s.startTime === '09:00' && s.id === 1)).toBe(true);
    expect(res).toHaveLength(2);
  });

  it('saveMany soft-disables removed slots instead of deleting them', async () => {
    const all = [
      { id: 1, studioId: 1, startTime: '09:00', endTime: '10:00', enabled: true },
      { id: 2, studioId: 1, startTime: '10:00', endTime: '11:00', enabled: true },
    ];
    repo.find.mockResolvedValue(all);
    const saved: any[] = [];
    repo.save.mockImplementation(async (e: any) => {
      saved.push(e);
      return e;
    });
    await service.saveMany(1, { slots: [{ startTime: '09:00', endTime: '10:00' }] });
    const removed = saved.find((s) => s.id === 2);
    expect(removed).toBeTruthy();
    expect(removed.enabled).toBe(false);
  });
});
