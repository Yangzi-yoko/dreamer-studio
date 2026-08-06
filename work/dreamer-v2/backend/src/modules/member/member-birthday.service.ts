import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { formatDate } from '../../common/utils/date.utils';
import { Member } from './entities/member.entity';
import { BirthdayGift } from './entities/birthday-gift.entity';
import { BirthdayGiftLog } from './entities/birthday-gift-log.entity';
import { MemberCouponService } from './member-coupon.service';

@Injectable()
export class MemberBirthdayService {
  constructor(
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    @InjectRepository(BirthdayGift) private readonly giftRepo: Repository<BirthdayGift>,
    @InjectRepository(BirthdayGiftLog) private readonly logRepo: Repository<BirthdayGiftLog>,
    private readonly couponService: MemberCouponService,
  ) {}

  async getConfig(): Promise<BirthdayGift | null> {
    return this.giftRepo.findOneBy({});
  }

  async updateConfig(dto: { couponId: number; enabled: boolean }): Promise<BirthdayGift> {
    const existing = await this.giftRepo.findOneBy({});
    if (existing) {
      existing.couponId = dto.couponId;
      existing.enabled = dto.enabled;
      return this.giftRepo.save(existing);
    }
    return this.giftRepo.save(this.giftRepo.create(dto));
  }

  @Cron('0 0 8 * * *')
  async cronRun(): Promise<void> {
    await this.runDaily(formatDate(new Date()).slice(5));
  }

  async runDaily(mmdd: string): Promise<{ issued: number }> {
    const gift = await this.giftRepo.findOneBy({ enabled: true });
    if (!gift) return { issued: 0 };
    const today = formatDate(new Date());
    const members = await this.memberRepo.find({ where: { birthday: mmdd } });
    let issued = 0;
    for (const m of members) {
      const exists = await this.logRepo.findOneBy({ memberId: m.id, couponId: gift.couponId, giftDate: today });
      if (exists) continue;
      await this.couponService.issue(m.id, gift.couponId);
      await this.logRepo.save(this.logRepo.create({ memberId: m.id, couponId: gift.couponId, giftDate: today }));
      issued += 1;
    }
    return { issued };
  }
}
