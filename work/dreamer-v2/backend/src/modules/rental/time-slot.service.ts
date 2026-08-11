import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TimeSlot } from './entities/time-slot.entity';
import { SaveTimeSlotsDto } from './dto/save-time-slot.dto';

@Injectable()
export class TimeSlotService {
  constructor(
    @InjectRepository(TimeSlot) private readonly repo: Repository<TimeSlot>,
    private readonly dataSource: DataSource,
  ) {}

  listByStudio(studioId: number): Promise<TimeSlot[]> {
    return this.repo.find({ where: { studioId }, order: { startTime: 'ASC' } });
  }

  findEnabledByStudio(studioId: number): Promise<TimeSlot[]> {
    return this.repo.find({ where: { studioId, enabled: true }, order: { startTime: 'ASC' } });
  }

  async saveMany(studioId: number, dto: SaveTimeSlotsDto): Promise<TimeSlot[]> {
    return this.dataSource.transaction(async (manager) => {
      const slotRepo = manager.getRepository(TimeSlot);
      const existing = await slotRepo.find({ where: { studioId } });
      const byKey = new Map(existing.map((s) => [`${s.startTime}-${s.endTime}`, s]));
      const result: TimeSlot[] = [];
      for (const s of dto.slots) {
        const key = `${s.startTime}-${s.endTime}`;
        const match = byKey.get(key);
        if (match) {
          match.enabled = s.enabled ?? true;
          result.push(await slotRepo.save(match));
        } else {
          const created = slotRepo.create({ studioId, startTime: s.startTime, endTime: s.endTime, enabled: s.enabled ?? true });
          result.push(await slotRepo.save(created));
        }
      }
      const submittedKeys = new Set(dto.slots.map((s) => `${s.startTime}-${s.endTime}`));
      for (const s of existing) {
        if (!submittedKeys.has(`${s.startTime}-${s.endTime}`)) {
          s.enabled = false;
          await slotRepo.save(s);
        }
      }
      return result;
    });
  }
}
