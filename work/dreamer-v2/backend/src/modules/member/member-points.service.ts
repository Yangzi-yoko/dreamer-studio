import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { MemberPoints } from './entities/member-points.entity';
import { PointsLog } from './entities/points-log.entity';

@Injectable()
export class MemberPointsService {
  constructor(
    @InjectRepository(MemberPoints) private readonly pointsRepo: Repository<MemberPoints>,
    @InjectRepository(PointsLog) private readonly logRepo: Repository<PointsLog>,
  ) {}

  async getOrCreate(memberId: number): Promise<MemberPoints> {
    const existing = await this.pointsRepo.findOneBy({ memberId });
    if (existing) return existing;
    return this.pointsRepo.save(this.pointsRepo.create({ memberId, balance: 0 }));
  }

  async earn(memberId: number, points: number, remark?: string): Promise<MemberPoints> {
    const account = await this.getOrCreate(memberId);
    account.balance += points;
    const saved = await this.pointsRepo.save(account);
    await this.logRepo.save(this.logRepo.create({
      memberId, type: 'earn', points, balanceAfter: saved.balance, remark,
    }));
    return saved;
  }

  async spend(memberId: number, points: number, remark?: string): Promise<MemberPoints> {
    const account = await this.getOrCreate(memberId);
    if (account.balance < points) throw new BusinessException('积分不足', 40040);
    account.balance -= points;
    const saved = await this.pointsRepo.save(account);
    await this.logRepo.save(this.logRepo.create({
      memberId, type: 'spend', points, balanceAfter: saved.balance, remark,
    }));
    return saved;
  }

  async page(memberId: number, page = 1, pageSize = 10): Promise<{ list: PointsLog[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.logRepo.findAndCount({
      where: { memberId },
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    return { list, total, page, pageSize };
  }
}
