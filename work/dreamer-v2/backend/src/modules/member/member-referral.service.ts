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

  async pageRewards(memberId: number, page = 1, pageSize = 10): Promise<{ list: ReferralReward[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.rewardRepo.findAndCount({
      where: { referrerMemberId: memberId },
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    return { list, total, page, pageSize };
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
