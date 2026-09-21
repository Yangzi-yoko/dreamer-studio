import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { MemberWallet } from './entities/member-wallet.entity';
import { WalletLog } from './entities/wallet-log.entity';
import { RechargeRule } from './entities/recharge-rule.entity';

@Injectable()
export class MemberWalletService {
  constructor(
    @InjectRepository(MemberWallet) private readonly walletRepo: Repository<MemberWallet>,
    @InjectRepository(WalletLog) private readonly logRepo: Repository<WalletLog>,
    @InjectRepository(RechargeRule) private readonly ruleRepo: Repository<RechargeRule>,
  ) {}

  async getOrCreate(memberId: number): Promise<MemberWallet> {
    const existing = await this.walletRepo.findOneBy({ memberId });
    if (existing) return existing;
    return this.walletRepo.save(this.walletRepo.create({ memberId, balanceCents: 0, principalCents: 0, bonusCents: 0 }));
  }

  async getRechargeRules() {
    const rules = await this.ruleRepo.find({ where: { enabled: true }, order: { sort: 'ASC', amountCents: 'ASC' } });
    return rules.map(r => ({
      id: r.id,
      amountYuan: r.amountCents / 100,
      bonusYuan: r.bonusCents / 100,
      label: r.label,
      recommended: r.recommended,
      sort: r.sort,
    }));
  }

  async getBonusForAmount(amountCents: number): Promise<number> {
    const rule = await this.ruleRepo.findOneBy({ amountCents, enabled: true });
    return rule?.bonusCents ?? 0;
  }

  async recharge(memberId: number, amountCents: number, bonusCents: number, remark?: string): Promise<MemberWallet> {
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw new BusinessException('充值金额必须大于 0', 40040);
    }
    if (amountCents > 10000000) {
      throw new BusinessException('单次充值不能超过10万元', 40042);
    }
    if (bonusCents < 0) {
      throw new BusinessException('赠送金额不能为负', 40043);
    }
    const wallet = await this.getOrCreate(memberId);
    wallet.balanceCents += amountCents + bonusCents;
    wallet.principalCents += amountCents;
    wallet.bonusCents += bonusCents;
    const saved = await this.walletRepo.save(wallet);
    await this.logRepo.save(this.logRepo.create({
      memberId,
      type: 'recharge',
      amountCents,
      bonusCents,
      balanceAfterCents: saved.balanceCents,
      remark: remark || (bonusCents > 0 ? `充值${amountCents / 100}元，赠送${bonusCents / 100}元` : `充值${amountCents / 100}元`),
    }));
    return saved;
  }

  async deduct(memberId: number, amountCents: number, remark?: string): Promise<MemberWallet> {
    if (!Number.isFinite(amountCents) || amountCents <= 0) throw new BusinessException('金额必须大于 0', 40040);
    const wallet = await this.getOrCreate(memberId);
    if (wallet.balanceCents < amountCents) throw new BusinessException('余额不足', 40041);
    wallet.balanceCents -= amountCents;
    if (wallet.bonusCents >= amountCents) {
      wallet.bonusCents -= amountCents;
    } else {
      const remain = amountCents - wallet.bonusCents;
      wallet.bonusCents = 0;
      wallet.principalCents -= remain;
    }
    const saved = await this.walletRepo.save(wallet);
    await this.logRepo.save(this.logRepo.create({
      memberId, type: 'deduct', amountCents, bonusCents: 0, balanceAfterCents: saved.balanceCents, remark,
    }));
    return saved;
  }

  async refund(memberId: number, amountCents: number, remark?: string): Promise<MemberWallet> {
    if (!Number.isFinite(amountCents) || amountCents <= 0) throw new BusinessException('金额必须大于 0', 40040);
    const wallet = await this.getOrCreate(memberId);
    wallet.balanceCents += amountCents;
    wallet.principalCents += amountCents;
    const saved = await this.walletRepo.save(wallet);
    await this.logRepo.save(this.logRepo.create({
      memberId, type: 'refund', amountCents, bonusCents: 0, balanceAfterCents: saved.balanceCents, remark,
    }));
    return saved;
  }

  async page(memberId: number, page = 1, pageSize = 10): Promise<{ list: WalletLog[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.logRepo.findAndCount({
      where: { memberId },
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    return { list, total, page, pageSize };
  }
}
