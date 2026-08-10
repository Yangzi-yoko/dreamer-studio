import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Activity } from './entities/activity.entity';
import { ActivityRegistration } from './entities/activity-registration.entity';
import { ActivityVisibleTag } from './entities/activity-visible-tag.entity';
import { ActivityVisibleMember } from './entities/activity-visible-member.entity';
import { MemberCouponService } from './member-coupon.service';
import { SaveActivityDto } from './dto/save-activity.dto';

@Injectable()
export class MemberActivityService {
  constructor(
    @InjectRepository(Activity) private readonly activityRepo: Repository<Activity>,
    @InjectRepository(ActivityRegistration) private readonly regRepo: Repository<ActivityRegistration>,
    @InjectRepository(ActivityVisibleTag) private readonly visibleTagRepo: Repository<ActivityVisibleTag>,
    @InjectRepository(ActivityVisibleMember) private readonly visibleMemberRepo: Repository<ActivityVisibleMember>,
    private readonly couponService: MemberCouponService,
  ) {}

  async pagePublished(page = 1, pageSize = 10, memberId?: number): Promise<{ list: Activity[]; total: number; page: number; pageSize: number }> {
    const qb = this.activityRepo
      .createQueryBuilder('a')
      .where('a.status = :status', { status: 'published' })
      .orderBy('a.start_at', 'DESC')
      .take(pageSize)
      .skip((page - 1) * pageSize);

    if (memberId) {
      qb.andWhere(
        `a.visibility_type = 'all'
        OR (a.visibility_type = 'tag' AND EXISTS (
          SELECT 1 FROM member_tag_relation mr
          JOIN activity_visible_tag avt ON avt.tag_id = mr.memberTagId
          WHERE mr.memberId = :memberId AND avt.activity_id = a.id
        ))
        OR (a.visibility_type = 'member' AND EXISTS (
          SELECT 1 FROM activity_visible_member avm
          WHERE avm.activity_id = a.id AND avm.member_id = :memberId
        ))`,
        { memberId },
      );
    } else {
      qb.andWhere("a.visibility_type = 'all'");
    }

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  async pageAdmin(page = 1, pageSize = 10): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.activityRepo.findAndCount({
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    const enriched = await Promise.all(
      list.map(async (a) => {
        const [visibleTags, visibleMembers] = await Promise.all([
          this.visibleTagRepo.find({ where: { activityId: a.id } }),
          this.visibleMemberRepo.find({ where: { activityId: a.id } }),
        ]);
        return {
          ...a,
          visibleTagIds: visibleTags.map((t) => t.tagId),
          visibleMemberIds: visibleMembers.map((m) => m.memberId),
          visibleTagCount: visibleTags.length,
          visibleMemberCount: visibleMembers.length,
        };
      }),
    );
    return { list: enriched, total, page, pageSize };
  }

  async create(dto: SaveActivityDto): Promise<Activity> {
    const activity = await this.activityRepo.save(
      this.activityRepo.create({
        ...dto,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
      }),
    );
    await this.replaceVisible(activity.id, dto);
    return activity;
  }

  async update(id: number, dto: SaveActivityDto): Promise<Activity> {
    const activity = await this.activityRepo.findOneBy({ id });
    if (!activity) throw new BusinessException('活动不存在', 40400);
    Object.assign(activity, dto, { startAt: new Date(dto.startAt), endAt: new Date(dto.endAt) });
    const saved = await this.activityRepo.save(activity);
    await this.replaceVisible(id, dto);
    return saved;
  }

  private async replaceVisible(activityId: number, dto: SaveActivityDto): Promise<void> {
    await this.visibleTagRepo.delete({ activityId });
    await this.visibleMemberRepo.delete({ activityId });

    const tags = dto.visibleTagIds?.length ? this.visibleTagRepo.create(dto.visibleTagIds.map((tagId) => ({ activityId, tagId }))) : [];
    const members = dto.visibleMemberIds?.length ? this.visibleMemberRepo.create(dto.visibleMemberIds.map((memberId) => ({ activityId, memberId }))) : [];
    if (tags.length) await this.visibleTagRepo.save(tags);
    if (members.length) await this.visibleMemberRepo.save(members);
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

  async pageRegistrations(activityId: number, page = 1, pageSize = 10): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.regRepo.findAndCount({
      where: { activityId },
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    const ids = list.map((r) => r.memberId);
    const members = ids.length
      ? await this.activityRepo.manager
          .query(`SELECT id, phone, nickname, avatar FROM member WHERE id IN (${ids.join(',')})`)
      : [];
    const memberMap = new Map<number, any>(members.map((m: any) => [m.id, m]));
    return {
      list: list.map((r) => ({
        id: r.id,
        activityId: r.activityId,
        memberId: r.memberId,
        createdAt: r.createdAt,
        memberPhone: memberMap.get(r.memberId)?.phone ?? null,
        memberNickname: memberMap.get(r.memberId)?.nickname ?? null,
        memberAvatar: memberMap.get(r.memberId)?.avatar ?? null,
      })),
      total,
      page,
      pageSize,
    };
  }
}