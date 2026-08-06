import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { RedisService } from '../../common/redis/redis.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { formatDate, isHoliday, isWeekend, parseDate } from '../../common/utils/date.utils';
import { Studio } from './entities/studio.entity';
import { Booking } from './entities/booking.entity';
import { BookingTimeSlot } from './entities/booking-time-slot.entity';
import { TimeSlot } from './entities/time-slot.entity';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Studio) private readonly studioRepo: Repository<Studio>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(TimeSlot) private readonly slotRepo: Repository<TimeSlot>,
    @InjectRepository(BookingTimeSlot) private readonly btsRepo: Repository<BookingTimeSlot>,
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
  ) {}

  async create(dto: CreateBookingDto): Promise<Booking> {
    const studio = await this.studioRepo.findOneBy({ id: dto.studioId, enabled: true });
    if (!studio) throw new BusinessException('场地不存在或已下架', 40400);

    const date = parseDate(dto.bookingDate);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (date < todayStart) {
      throw new BusinessException('不能预订过去的日期', 40020);
    }

    const slots = await this.slotRepo.findBy({ id: In(dto.timeSlotIds), studioId: dto.studioId, enabled: true });
    if (slots.length !== dto.timeSlotIds.length) {
      throw new BusinessException('部分时段无效或已停用', 40021);
    }

    const lockKey = `rental:lock:${dto.studioId}:${dto.bookingDate}`;
    const locked = await this.redis.get(lockKey);
    if (locked) throw new BusinessException('该日期正在被其他人预订，请重试', 40901);
    await this.redis.set(lockKey, '1', 15);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const active = await manager.find(BookingTimeSlot, {
          where: { timeSlotId: In(dto.timeSlotIds) },
        });
        if (active.length) {
          const bookingIds = [...new Set(active.map((b) => b.bookingId))];
          const bookings = await manager.findBy(Booking, {
            id: In(bookingIds),
            bookingDate: dto.bookingDate,
            status: In(['pending', 'paid', 'checked', 'completed']),
          });
          if (bookings.length) throw new BusinessException('该时段已被预订', 40900);
        }

        const unitPriceCents = isHoliday(date)
          ? studio.holidayPriceCents
          : isWeekend(date)
            ? studio.weekendPriceCents
            : studio.weekdayPriceCents;
        const slotCount = slots.length;
        const bookingNo = `B${formatDate(new Date()).replace(/-/g, '')}${Date.now().toString(36).toUpperCase()}`;
        const booking = manager.create(Booking, {
          bookingNo,
          studioId: studio.id,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          bookingDate: dto.bookingDate,
          status: 'pending',
          slotCount,
          unitPriceCents,
          totalAmountCents: unitPriceCents * slotCount,
          depositCents: studio.depositCents,
          remark: dto.remark,
        });
        const saved = await manager.save(booking);
        await manager.save(
          slots.map((s) =>
            manager.create(BookingTimeSlot, {
              bookingId: saved.id,
              timeSlotId: s.id,
              startTime: s.startTime,
              endTime: s.endTime,
            }),
          ),
        );
        return saved;
      });
    } finally {
      await this.redis.del(lockKey);
    }
  }

  async page(page = 1, pageSize = 10, status?: string): Promise<{ list: Booking[]; total: number; page: number; pageSize: number }> {
    const where = status ? { status } : {};
    const [list, total] = await this.bookingRepo.findAndCount({
      where,
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    return { list, total, page, pageSize };
  }

  async calendar(studioId: number, month: string): Promise<any[]> {
    const [y, m] = month.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    const dates: string[] = [];
    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
      dates.push(formatDate(new Date(d)));
    }
    const bookings = await this.bookingRepo.find({
      where: { studioId, bookingDate: In(dates), status: In(['pending', 'paid', 'checked', 'completed']) },
    });
    if (!bookings.length) return dates.map((date) => ({ date, occupiedTimeSlotIds: [], bookings: [] }));
    const links = await this.btsRepo.find({ where: { bookingId: In(bookings.map((b) => b.id)) } });
    const byDate = new Map<string, any[]>();
    bookings.forEach((b) => {
      const slots = links.filter((l) => l.bookingId === b.id).map((l) => l.timeSlotId);
      const entry = {
        id: b.id,
        bookingNo: b.bookingNo,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        status: b.status,
        timeSlotIds: slots,
      };
      const arr = byDate.get(b.bookingDate) || [];
      arr.push(entry);
      byDate.set(b.bookingDate, arr);
    });
    return dates.map((date) => ({
      date,
      occupiedTimeSlotIds: (byDate.get(date) || []).flatMap((b) => b.timeSlotIds),
      bookings: byDate.get(date) || [],
    }));
  }
}
