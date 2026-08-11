import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Member } from './entities/member.entity';
import { ReferralRelation } from './entities/referral-relation.entity';
import { ReferralRule } from './entities/referral-rule.entity';
import { ReferralReward } from './entities/referral-reward.entity';
import { MemberWalletService } from './member-wallet.service';

@Injectable()
export class MemberReferralService {
  constructor(
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    @InjectRepository(ReferralRelation) private readonly relRepo: Repository<ReferralRelation>,
    @InjectRepository(ReferralRule) private readonly ruleRepo: Repository<ReferralRule>,
    @InjectRepository(ReferralReward) private readonly rewardRepo: Repository<ReferralReward>,
    private readonly walletService: MemberWalletService,
  ) {}

  async getMyCode(memberId: number): Promise<string> {
    const member = await this.memberRepo.findOneBy({ id: memberId });
    if (!member) throw new BusinessException('会员不存在', 40400);
    if (member.referralCode) return member.referralCode;
    const code = `M${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    member.referralCode = code;
    await this.memberRepo.save(member);
    return code;
  }

  async bind(inviteeMemberId: number, code: string): Promise<ReferralRelation> {
    const referrer = await this.memberRepo.findOneBy({ referralCode: code });
    if (!referrer) throw new BusinessException('邀请码无效', 40052);
    if (referrer.id === inviteeMemberId) throw new BusinessException('不能邀请自己', 40054);
    const existing = await this.relRepo.findOneBy({ inviteeMemberId });
    if (existing) throw new BusinessException('已绑定推荐关系', 40053);

    const hasDownline = await this.relRepo.findOneBy({ referrerMemberId: inviteeMemberId });
    if (hasDownline) throw new BusinessException('已有下线会员，不能再绑定邀请码', 40056);

    let cursor = referrer.id;
    const visited = new Set<number>();
    while (cursor) {
      if (cursor === inviteeMemberId) throw new BusinessException('绑定会形成环，已拒绝', 40055);
      if (visited.has(cursor)) break;
      visited.add(cursor);
      const up = await this.relRepo.findOneBy({ inviteeMemberId: cursor });
      if (!up) break;
      cursor = up.referrerMemberId;
    }

    return this.relRepo.save(this.relRepo.create({ referrerMemberId: referrer.id, inviteeMemberId }));
  }

  async settle(referrerMemberId: number, inviteeMemberId: number, orderNo: string, amountCents: number): Promise<ReferralReward> {
    const rule = await this.ruleRepo.findOneBy({ enabled: true });
    let rewardCents = 0;
    if (rule) {
      rewardCents = rule.fixedCents > 0
        ? Math.min(rule.fixedCents, amountCents)
        : Math.round((amountCents * Math.min(100, Math.max(0, rule.percent))) / 100);
    }
    if (rewardCents > 0) {
      await this.walletService.refund(referrerMemberId, rewardCents, `推荐返利 ${orderNo}`);
    }
    return this.rewardRepo.save(this.rewardRepo.create({
      referrerMemberId, inviteeMemberId, orderNo, amountCents, rewardCents,
    }));
  }

  async summary(memberId: number) {
    const code = await this.getMyCode(memberId);
    const invitedCount = await this.relRepo.countBy({ referrerMemberId: memberId });
    const [totalRow] = await this.rewardRepo.manager.query(
      'SELECT COALESCE(SUM(reward_cents), 0) AS total FROM referral_reward WHERE referrer_member_id = ?',
      [memberId],
    );
    const inviterRel = await this.relRepo.findOneBy({ inviteeMemberId: memberId });
    let inviter: { memberId: number; nickname: string } | null = null;
    if (inviterRel) {
      const m = await this.memberRepo.findOneBy({ id: inviterRel.referrerMemberId });
      if (m) inviter = { memberId: m.id, nickname: m.nickname || '' };
    }
    const rule = await this.ruleRepo.findOneBy({ enabled: true });
    return {
      code,
      invitedCount,
      totalRewardCents: Number(totalRow?.total || 0),
      inviter,
      rule: rule ? { percent: rule.percent, fixedCents: rule.fixedCents } : null,
    };
  }

  private async memberNames(ids: number[]): Promise<Map<number, { nickname: string; phone: string }>> {
    const map = new Map<number, { nickname: string; phone: string }>();
    const unique = [...new Set(ids)];
    if (!unique.length) return map;
    const rows: any[] = await this.relRepo.manager.query(
      `SELECT id, nickname, phone FROM member WHERE id IN (${unique.join(',')})`,
    );
    for (const r of rows || []) {
      map.set(Number(r.id), { nickname: r.nickname || '', phone: r.phone || '' });
    }
    return map;
  }

  async team(memberId: number, page = 1, pageSize = 10) {
    const [list, total] = await this.relRepo.findAndCount({
      where: { referrerMemberId: memberId },
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    const names = await this.memberNames(list.map((r) => r.inviteeMemberId));
    return {
      list: list.map((r) => ({
        id: r.id,
        inviteeMemberId: r.inviteeMemberId,
        inviteeNickname: names.get(r.inviteeMemberId)?.nickname || '',
        inviteePhone: names.get(r.inviteeMemberId)?.phone || '',
        createdAt: r.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  async pageRewards(memberId: number, page = 1, pageSize = 10) {
    const [list, total] = await this.rewardRepo.findAndCount({
      where: { referrerMemberId: memberId },
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    const names = await this.memberNames(list.map((r) => r.inviteeMemberId));
    return {
      list: list.map((r) => ({ ...r, inviteeNickname: names.get(r.inviteeMemberId)?.nickname || '' })),
      total,
      page,
      pageSize,
    };
  }

  async pageAllRelations(page = 1, pageSize = 10) {
    const [list, total] = await this.relRepo.findAndCount({
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    const names = await this.memberNames(list.flatMap((r) => [r.referrerMemberId, r.inviteeMemberId]));
    return {
      list: list.map((r) => ({
        id: r.id,
        referrerMemberId: r.referrerMemberId,
        referrerNickname: names.get(r.referrerMemberId)?.nickname || '',
        inviteeMemberId: r.inviteeMemberId,
        inviteeNickname: names.get(r.inviteeMemberId)?.nickname || '',
        createdAt: r.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  async pageAllRewards(page = 1, pageSize = 10) {
    const [list, total] = await this.rewardRepo.findAndCount({
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    const names = await this.memberNames(list.flatMap((r) => [r.referrerMemberId, r.inviteeMemberId]));
    return {
      list: list.map((r) => ({
        ...r,
        referrerNickname: names.get(r.referrerMemberId)?.nickname || '',
        inviteeNickname: names.get(r.inviteeMemberId)?.nickname || '',
      })),
      total,
      page,
      pageSize,
    };
  }

  async getRule(): Promise<ReferralRule | null> {
    return this.ruleRepo.findOneBy({});
  }

  async updateRule(dto: { percent: number; fixedCents: number; enabled: boolean }): Promise<ReferralRule> {
    const existing = await this.ruleRepo.findOneBy({});
    if (existing) {
      Object.assign(existing, dto);
      return this.ruleRepo.save(existing);
    }
    return this.ruleRepo.save(this.ruleRepo.create(dto));
  }
}