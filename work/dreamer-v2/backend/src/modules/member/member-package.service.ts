import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { toCents, toYuan } from '../../common/utils/money.utils';
import { PackageCard } from './entities/package-card.entity';
import { UserPackage } from './entities/user-package.entity';
import { PackageUsage } from './entities/package-usage.entity';
import { MemberWallet } from './entities/member-wallet.entity';
import { WalletLog } from './entities/wallet-log.entity';
import { SavePackageCardDto } from './dto/save-package-card.dto';

function hoursOf(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

@Injectable()
export class MemberPackageService {
  constructor(
    @InjectRepository(PackageCard) private readonly cardRepo: Repository<PackageCard>,
    @InjectRepository(UserPackage) private readonly userRepo: Repository<UserPackage>,
    @InjectRepository(PackageUsage) private readonly usageRepo: Repository<PackageUsage>,
    @InjectRepository(MemberWallet) private readonly walletRepo: Repository<MemberWallet>,
    @InjectRepository(WalletLog) private readonly logRepo: Repository<WalletLog>,
  ) {}

  async pageCards(page = 1, pageSize = 10): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.cardRepo.findAndCount({ take: pageSize, skip: (page - 1) * pageSize, order: { createdAt: 'DESC' } });
    return { list: list.map((c) => ({ ...c, price: toYuan(c.priceCents), totalHours: hoursOf(c.totalMinutes) })), total, page, pageSize };
  }

  async createCard(dto: SavePackageCardDto): Promise<any> {
    const card = await this.cardRepo.save(this.cardRepo.create({ ...dto, priceCents: toCents(dto.priceYuan) }));
    return { ...card, price: toYuan(card.priceCents), totalHours: hoursOf(card.totalMinutes) };
  }

  async updateCard(id: number, dto: SavePackageCardDto): Promise<any> {
    const card = await this.cardRepo.findOneBy({ id });
    if (!card) throw new BusinessException('计时卡模板不存在', 40400);
    Object.assign(card, dto, { priceCents: toCents(dto.priceYuan) });
    return this.cardRepo.save(card);
  }

  async buy(memberId: number, packageId: number): Promise<UserPackage> {
    const card = await this.cardRepo.findOneBy({ id: packageId, enabled: true });
    if (!card) throw new BusinessException('计时卡不存在或已停售', 40400);
    return this.userRepo.save(this.userRepo.create({
      memberId, packageId, remainingMinutes: card.totalMinutes, status: 'active',
    }));
  }

  async mall(): Promise<any[]> {
    const cards = await this.cardRepo.find({ where: { enabled: true }, order: { createdAt: 'DESC' } });
    return cards.map((c) => ({ ...c, price: toYuan(c.priceCents), totalHours: hoursOf(c.totalMinutes) }));
  }

  async buyWithWallet(memberId: number, packageId: number): Promise<UserPackage> {
    const card = await this.cardRepo.findOneBy({ id: packageId, enabled: true });
    if (!card) throw new BusinessException('计时卡不存在或已停售', 40400);
    const wallet = await this.walletRepo.findOneBy({ memberId });
    if (!wallet || wallet.balanceCents < card.priceCents) throw new BusinessException('余额不足', 40041);
    wallet.balanceCents -= card.priceCents;
    await this.walletRepo.save(wallet);
    await this.logRepo.save(this.logRepo.create({
      memberId, type: 'deduct', amountCents: card.priceCents, balanceAfterCents: wallet.balanceCents, remark: `购买计时卡「${card.name}」`,
    }));
    return this.userRepo.save(this.userRepo.create({
      memberId, packageId, remainingMinutes: card.totalMinutes, status: 'active',
    }));
  }

  async useMinutes(memberId: number, userPackageId: number, minutes: number, remark?: string): Promise<UserPackage> {
    if (!Number.isInteger(minutes) || minutes <= 0) throw new BusinessException('核销时长必须为正整数分钟', 40030);
    const up = await this.userRepo.findOneBy({ id: userPackageId, memberId });
    if (!up) throw new BusinessException('计时卡不存在', 40400);
    if (up.status !== 'active' || up.remainingMinutes < minutes) throw new BusinessException('计时卡时长不足', 40042);
    up.remainingMinutes -= minutes;
    const saved = await this.userRepo.save(up);
    await this.usageRepo.save(this.usageRepo.create({
      userPackageId, memberId, minutes, remark,
    }));
    return saved;
  }

  async pageUserPackages(memberId: number): Promise<any[]> {
    const list = await this.userRepo.find({ where: { memberId }, order: { createdAt: 'DESC' } });
    return list.map((up) => ({ ...up, remainingHours: hoursOf(up.remainingMinutes) }));
  }

  async deleteCard(id: number): Promise<void> {
    const card = await this.cardRepo.findOneBy({ id });
    if (!card) throw new BusinessException('计时卡模板不存在', 40400);
    await this.cardRepo.delete(id);
  }
}
