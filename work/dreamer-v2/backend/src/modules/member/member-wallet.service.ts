import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { MemberWallet } from './entities/member-wallet.entity';
import { WalletLog } from './entities/wallet-log.entity';

@Injectable()
export class MemberWalletService {
  constructor(
    @InjectRepository(MemberWallet) private readonly walletRepo: Repository<MemberWallet>,
    @InjectRepository(WalletLog) private readonly logRepo: Repository<WalletLog>,
  ) {}

  async getOrCreate(memberId: number): Promise<MemberWallet> {
    const existing = await this.walletRepo.findOneBy({ memberId });
    if (existing) return existing;
    return this.walletRepo.save(this.walletRepo.create({ memberId, balanceCents: 0 }));
  }

  async recharge(memberId: number, amountCents: number, remark?: string): Promise<MemberWallet> {
    const wallet = await this.getOrCreate(memberId);
    wallet.balanceCents += amountCents;
    const saved = await this.walletRepo.save(wallet);
    await this.logRepo.save(this.logRepo.create({
      memberId, type: 'recharge', amountCents, balanceAfterCents: saved.balanceCents, remark,
    }));
    return saved;
  }

  async deduct(memberId: number, amountCents: number, remark?: string): Promise<MemberWallet> {
    const wallet = await this.getOrCreate(memberId);
    if (wallet.balanceCents < amountCents) throw new BusinessException('余额不足', 40041);
    wallet.balanceCents -= amountCents;
    const saved = await this.walletRepo.save(wallet);
    await this.logRepo.save(this.logRepo.create({
      memberId, type: 'deduct', amountCents, balanceAfterCents: saved.balanceCents, remark,
    }));
    return saved;
  }

  async refund(memberId: number, amountCents: number, remark?: string): Promise<MemberWallet> {
    const wallet = await this.getOrCreate(memberId);
    wallet.balanceCents += amountCents;
    const saved = await this.walletRepo.save(wallet);
    await this.logRepo.save(this.logRepo.create({
      memberId, type: 'refund', amountCents, balanceAfterCents: saved.balanceCents, remark,
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
