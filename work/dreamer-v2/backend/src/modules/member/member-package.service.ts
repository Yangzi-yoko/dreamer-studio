import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { toCents, toYuan } from '../../common/utils/money.utils';
import { PackageCard } from './entities/package-card.entity';
import { UserPackage } from './entities/user-package.entity';
import { PackageUsage } from './entities/package-usage.entity';
import { SavePackageCardDto } from './dto/save-package-card.dto';

@Injectable()
export class MemberPackageService {
  constructor(
    @InjectRepository(PackageCard) private readonly cardRepo: Repository<PackageCard>,
    @InjectRepository(UserPackage) private readonly userRepo: Repository<UserPackage>,
    @InjectRepository(PackageUsage) private readonly usageRepo: Repository<PackageUsage>,
  ) {}

  async pageCards(page = 1, pageSize = 10): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.cardRepo.findAndCount({ take: pageSize, skip: (page - 1) * pageSize, order: { createdAt: 'DESC' } });
    return { list: list.map((c) => ({ ...c, price: toYuan(c.priceCents) })), total, page, pageSize };
  }

  async createCard(dto: SavePackageCardDto): Promise<any> {
    const card = await this.cardRepo.save(this.cardRepo.create({ ...dto, priceCents: toCents(dto.priceYuan) }));
    return { ...card, price: toYuan(card.priceCents) };
  }

  async updateCard(id: number, dto: SavePackageCardDto): Promise<any> {
    const card = await this.cardRepo.findOneBy({ id });
    if (!card) throw new BusinessException('次卡模板不存在', 40400);
    Object.assign(card, dto, { priceCents: toCents(dto.priceYuan) });
    return this.cardRepo.save(card);
  }

  async buy(memberId: number, packageId: number): Promise<UserPackage> {
    const card = await this.cardRepo.findOneBy({ id: packageId, enabled: true });
    if (!card) throw new BusinessException('次卡不存在或已停售', 40400);
    return this.userRepo.save(this.userRepo.create({
      memberId, packageId, remainingTimes: card.totalTimes, status: 'active',
    }));
  }

  async use(memberId: number, userPackageId: number, remark?: string): Promise<UserPackage> {
    const up = await this.userRepo.findOneBy({ id: userPackageId, memberId });
    if (!up) throw new BusinessException('次卡不存在', 40400);
    if (up.status !== 'active' || up.remainingTimes <= 0) throw new BusinessException('次卡次数不足', 40042);
    up.remainingTimes -= 1;
    const saved = await this.userRepo.save(up);
    await this.usageRepo.save(this.usageRepo.create({
      userPackageId, memberId, times: 1, remark,
    }));
    return saved;
  }

  async pageUserPackages(memberId: number): Promise<UserPackage[]> {
    return this.userRepo.find({ where: { memberId }, order: { createdAt: 'DESC' } });
  }

  async deleteCard(id: number): Promise<void> {
    const card = await this.cardRepo.findOneBy({ id });
    if (!card) throw new BusinessException('次卡模板不存在', 40400);
    await this.cardRepo.delete(id);
  }
}
