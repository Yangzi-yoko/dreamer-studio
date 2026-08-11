import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Member } from './entities/member.entity';
import { MemberPoints } from './entities/member-points.entity';
import { PointsLog } from './entities/points-log.entity';

@Injectable()
export class MemberPointsService {
  constructor(
    @InjectRepository(MemberPoints) private readonly pointsRepo: Repository<MemberPoints>,
    @InjectRepository(PointsLog) private readonly logRepo: Repository<PointsLog>,
  ) {}

  private em(manager?: EntityManager): EntityManager {
    return manager ?? this.pointsRepo.manager;
  }

  private assertPoints(points: unknown): asserts points is number {
    if (typeof points !== 'number' || !Number.isInteger(points) || points <= 0) {
      throw new BusinessException('积分数量必须为正整数', 40041);
    }
  }

  private async assertMemberExists(em: EntityManager, memberId: number): Promise<void> {
    const memberRepo = em.getRepository(Member);
    const member = await memberRepo.findOneBy({ id: memberId });
    if (!member) throw new BusinessException('会员不存在', 40400);
  }

  async getOrCreate(memberId: number, manager?: EntityManager): Promise<MemberPoints> {
    const em = this.em(manager);
    const pointsRepo = em.getRepository(MemberPoints);
    const existing = await pointsRepo.findOneBy({ memberId });
    if (existing) return existing;
    return pointsRepo.save(pointsRepo.create({ memberId, balance: 0 }));
  }

  async earn(memberId: number, points: number, remark?: string, manager?: EntityManager): Promise<MemberPoints> {
    const em = this.em(manager);
    this.assertPoints(points);
    await this.assertMemberExists(em, memberId);
    const pointsRepo = em.getRepository(MemberPoints);
    const logRepo = em.getRepository(PointsLog);
    const account = await this.getOrCreate(memberId, em);
    account.balance += points;
    const saved = await pointsRepo.save(account);
    await logRepo.save(logRepo.create({
      memberId, type: 'earn', points, balanceAfter: saved.balance, remark,
    }));
    return saved;
  }

  async spend(memberId: number, points: number, remark?: string, manager?: EntityManager): Promise<MemberPoints> {
    const em = this.em(manager);
    this.assertPoints(points);
    await this.assertMemberExists(em, memberId);
    const pointsRepo = em.getRepository(MemberPoints);
    const logRepo = em.getRepository(PointsLog);
    const account = await this.getOrCreate(memberId, em);
    if (account.balance < points) throw new BusinessException('积分不足', 40040);
    account.balance -= points;
    const saved = await pointsRepo.save(account);
    await logRepo.save(logRepo.create({
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