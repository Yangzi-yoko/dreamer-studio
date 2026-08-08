import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { RedisService } from '../../common/redis/redis.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { formatDate, isHoliday, isWeekend, parseDate } from '../../common/utils/date.utils';
import { toYuan } from '../../common/utils/money.utils';
import { Studio } from './entities/studio.entity';
import { Booking } from './entities/booking.entity';
import { BookingTimeSlot } from './entities/booking-time-slot.entity';
import { TimeSlot } from './entities/time-slot.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { MemberWallet } from '../member/entities/member-wallet.entity';
import { WalletLog } from '../member/entities/wallet-log.entity';
import { UserPackage } from '../member/entities/user-package.entity';
import { PackageUsage } from '../member/entities/package-usage.entity';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Studio) private readonly studioRepo: Repository<Studio>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(TimeSlot) private readonly slotRepo: Repository<TimeSlot>,
    @InjectRepository(BookingTimeSlot) private readonly btsRepo: Repository<BookingTimeSlot>,
    @InjectRepository(MemberWallet) private readonly walletRepo: Repository<MemberWallet>,
    @InjectRepository(WalletLog) private readonly walletLogRepo: Repository<WalletLog>,
    @InjectRepository(UserPackage) private readonly userPackageRepo: Repository<UserPackage>,
    @InjectRepository(PackageUsage) private readonly packageUsageRepo: Repository<PackageUsage>,
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
  ) {}

  private priceOf(studio: Studio, date: Date): number {
    return isHoliday(date)
      ? studio.holidayPriceCents
      : isWeekend(date)
        ? studio.weekendPriceCents
        : studio.weekdayPriceCents;
  }

  async preview(dto: CreateBookingDto): Promise<any> {
    const studio = await this.studioRepo.findOneBy({ id: dto.studioId, enabled: true });
    if (!studio) throw new BusinessException('场地不存在或已下架', 40400);
    const slots = await this.slotRepo.findBy({ id: In(dto.timeSlotIds), studioId: dto.studioId, enabled: true });
    if (slots.length !== dto.timeSlotIds.length) {
      throw new BusinessException('部分时段无效或已停用', 40021);
    }
    const unitPriceCents = this.priceOf(studio, parseDate(dto.bookingDate));
    const slotCount = slots.length;
    return {
      studioId: dto.studioId,
      bookingDate: dto.bookingDate,
      slotCount,
      unitPrice: toYuan(unitPriceCents),
      totalAmount: toYuan(unitPriceCents * slotCount),
      deposit: toYuan(studio.depositCents),
    };
  }

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

        const unitPriceCents = this.priceOf(studio, date);
        const slotCount = slots.length;
        const bookingNo = `B${formatDate(new Date()).replace(/-/g, '')}${Date.now().toString(36).toUpperCase()}`;
        const payMethod = dto.payMethod || 'offline';
        if ((payMethod === 'wallet' || payMethod === 'package') && !dto.memberId) {
          throw new BusinessException('请先登录会员后再选择线上支付', 40100);
        }
        if (payMethod === 'package' && !dto.userPackageId) {
          throw new BusinessException('请选择要使用的次卡', 40043);
        }
        const totalAmountCents = unitPriceCents * slotCount;
        const finalStatus = payMethod === 'offline' ? 'pending' : 'paid';
        const booking = manager.create(Booking, {
          bookingNo,
          studioId: studio.id,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          bookingDate: dto.bookingDate,
          status: 'pending',
          slotCount,
          unitPriceCents,
          totalAmountCents,
          depositCents: studio.depositCents,
          remark: dto.remark,
        });
        const saved = await manager.save(booking);
        if (payMethod === 'wallet') {
          const walletRepo = manager.getRepository(MemberWallet);
          const logRepo = manager.getRepository(WalletLog);
          let wallet = await walletRepo.findOneBy({ memberId: dto.memberId });
          if (!wallet) {
            wallet = await walletRepo.save(walletRepo.create({ memberId: dto.memberId, balanceCents: 0 }));
          }
          if (wallet.balanceCents < totalAmountCents) throw new BusinessException('余额不足', 40041);
          wallet.balanceCents -= totalAmountCents;
          const savedWallet = await walletRepo.save(wallet);
          await logRepo.save(logRepo.create({
            memberId: dto.memberId,
            type: 'deduct',
            amountCents: totalAmountCents,
            balanceAfterCents: savedWallet.balanceCents,
            remark: `场地预订 ${bookingNo}`,
          }));
        } else if (payMethod === 'package') {
          const upRepo = manager.getRepository(UserPackage);
          const usageRepo = manager.getRepository(PackageUsage);
          const up = await upRepo.findOneBy({ id: dto.userPackageId, memberId: dto.memberId });
          if (!up) throw new BusinessException('次卡不存在', 40400);
          if (up.status !== 'active' || up.remainingTimes <= 0) throw new BusinessException('次卡次数不足', 40042);
          up.remainingTimes -= 1;
          await upRepo.save(up);
          await usageRepo.save(usageRepo.create({
            userPackageId: up.id,
            memberId: dto.memberId,
            times: 1,
            remark: `场地预订 ${bookingNo}`,
          }));
        }
        saved.status = finalStatus;
        await manager.save(saved);
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

  async pageByPhone(phone: string): Promise<Booking[]> {
    return this.bookingRepo.find({ where: { customerPhone: phone }, order: { createdAt: 'DESC' } });
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
