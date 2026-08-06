import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Activity } from './entities/activity.entity';
import { ActivityRegistration } from './entities/activity-registration.entity';
import { MemberCouponService } from './member-coupon.service';
import { SaveActivityDto } from './dto/save-activity.dto';

@Injectable()
export class MemberActivityService {
  constructor(
    @InjectRepository(Activity) private readonly activityRepo: Repository<Activity>,
    @InjectRepository(ActivityRegistration) private readonly regRepo: Repository<ActivityRegistration>,
    private readonly couponService: MemberCouponService,
  ) {}

  async pagePublished(page = 1, pageSize = 10): Promise<{ list: Activity[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.activityRepo.findAndCount({
      where: { status: 'published' },
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { startAt: 'DESC' },
    });
    return { list, total, page, pageSize };
  }

  async pageAdmin(page = 1, pageSize = 10): Promise<{ list: Activity[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.activityRepo.findAndCount({
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    return { list, total, page, pageSize };
  }

  create(dto: SaveActivityDto): Promise<Activity> {
    return this.activityRepo.save(this.activityRepo.create({ ...dto, startAt: new Date(dto.startAt), endAt: new Date(dto.endAt) }));
  }

  async update(id: number, dto: SaveActivityDto): Promise<Activity> {
    const activity = await this.activityRepo.findOneBy({ id });
    if (!activity) throw new BusinessException('活动不存在', 40400);
    Object.assign(activity, dto, { startAt: new Date(dto.startAt), endAt: new Date(dto.endAt) });
    return this.activityRepo.save(activity);
  }

  async register(memberId: number, activityId: number): Promise<ActivityRegistration> {
    const activity = await this.activityRepo.findOneBy({ id: activityId });
    if (!activity) throw new BusinessException('活动不存在', 40400);
    if (activity.status !== 'published') throw new BusinessException('活动已结束', 40055);
    const existing = await this.regRepo.findOneBy({ activityId, memberId });
    if (existing) throw new BusinessException('已报名', 40050);
    if (activity.couponId) await this.couponService.issue(memberId, activity.couponId);
    return this.regRepo.save(this.regRepo.create({ activityId, memberId }));
  }

  async pageRegistrations(activityId: number, page = 1, pageSize = 10): Promise<{ list: ActivityRegistration[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.regRepo.findAndCount({
      where: { activityId },
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    return { list, total, page, pageSize };
  }
}
