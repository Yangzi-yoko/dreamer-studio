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
      await manager.delete(TimeSlot, { studioId });
      const entities = dto.slots.map((s) =>
        manager.create(TimeSlot, { studioId, startTime: s.startTime, endTime: s.endTime, enabled: s.enabled ?? true }),
      );
      return manager.save(entities);
    });
  }
}
