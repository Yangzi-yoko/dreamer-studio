import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { toYuan } from '../../common/utils/money.utils';
import { MemberPointsService } from './member-points.service';
import { Coupon } from './entities/coupon.entity';
import { UserCoupon } from './entities/user-coupon.entity';
import { PointsCoupon } from './entities/point-coupon.entity';
import { PointsCouponLog } from './entities/point-coupon-log.entity';
import { SavePointsCouponDto } from './dto/save-points-coupon.dto';

@Injectable()
export class PointsCouponService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly pointsService: MemberPointsService,
    @InjectRepository(PointsCoupon) private readonly repo: Repository<PointsCoupon>,
    @InjectRepository(PointsCouponLog) private readonly logRepo: Repository<PointsCouponLog>,
    @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,
  ) {}

  private async couponMap(): Promise<Map<number, Coupon>> {
    const coupons = await this.couponRepo.find({});
    return new Map(coupons.map((c) => [c.id, c]));
  }

  private async enrich(items: PointsCoupon[]): Promise<any[]> {
    const map = await this.couponMap();
    return items.map((item) => {
      const coupon = map.get(item.couponId);
      return {
        id: item.id,
        couponId: item.couponId,
        couponName: coupon?.name ?? '优惠券已失效',
        couponType: coupon?.type ?? null,
        couponValue: coupon?.value ?? null,
        couponMinSpend: coupon ? toYuan(coupon.minSpendCents) : null,
        point: item.point,
        stock: item.stock,
        limitPerUser: item.limitPerUser,
        exchanged: item.exchanged,
        enabled: item.enabled,
        sort: item.sort,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });
  }

  async mall(): Promise<any[]> {
    const items = await this.repo.find({
      where: { enabled: true },
      order: { sort: 'ASC', id: 'DESC' },
      take: 200,
    });
    return this.enrich(items);
  }

  async redeem(memberId: number, id: number): Promise<PointsCouponLog> {
    return this.dataSource.transaction(async (manager) => {
      const itemRepo = manager.getRepository(PointsCoupon);
      const couponRepo = manager.getRepository(Coupon);
      const userRepo = manager.getRepository(UserCoupon);
      const logRepo = manager.getRepository(PointsCouponLog);

      const item = await itemRepo.findOneBy({ id });
      if (!item || !item.enabled) throw new BusinessException('该兑换项目不存在或已停用', 40056);

      const coupon = await couponRepo.findOneBy({ id: item.couponId, enabled: true });
      if (!coupon) throw new BusinessException('优惠券不存在或已停用', 40400);

      if (coupon.issuedCount >= coupon.totalCount) throw new BusinessException('优惠券已发完', 40043);

      if (item.limitPerUser > 0) {
        const count = await logRepo.countBy({ pointsCouponId: item.id, memberId });
        if (count >= item.limitPerUser) throw new BusinessException('已达兑换次数上限', 40059);
      }

      if (item.stock >= 0) {
        const result = await itemRepo
          .createQueryBuilder()
          .update(PointsCoupon)
          .set({ stock: () => 'stock - 1', exchanged: () => 'exchanged + 1' })
          .where('id = :id AND stock > 0 AND enabled = true', { id: item.id })
          .execute();
        if (result.affected !== 1) throw new BusinessException('库存不足或已停用', 40057);
      } else {
        await itemRepo.update(item.id, { exchanged: () => 'exchanged + 1' });
      }

      await this.pointsService.spend(memberId, item.point, `积分兑换优惠券：${coupon.name}`, manager);

      coupon.issuedCount += 1;
      await couponRepo.save(coupon);
      await userRepo.save(userRepo.create({ memberId, couponId: coupon.id, status: 'unused' }));

      return logRepo.save(logRepo.create({
        memberId,
        pointsCouponId: item.id,
        couponId: item.couponId,
        point: item.point,
      }));
    });
  }

  async pageMine(memberId: number, page = 1, pageSize = 10): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.logRepo.findAndCount({
      where: { memberId },
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    const ids = [...new Set(list.map((l) => l.couponId))];
    const coupons = ids.length ? await this.couponRepo.findBy({ id: In(ids) }) : [];
    const map = new Map(coupons.map((c) => [c.id, c]));
    return {
      list: list.map((l) => ({
        ...l,
        couponName: map.get(l.couponId)?.name ?? '优惠券已失效',
        couponType: map.get(l.couponId)?.type ?? null,
        couponValue: map.get(l.couponId)?.value ?? null,
      })),
      total,
      page,
      pageSize,
    };
  }

  async pageAdmin(page = 1, pageSize = 10): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.repo.findAndCount({
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { sort: 'ASC', id: 'DESC' },
    });
    const enriched = await this.enrich(list);
    return { list: enriched, total, page, pageSize };
  }

  async pageLogs(page = 1, pageSize = 10): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.logRepo.findAndCount({
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    const ids = [...new Set(list.map((l) => l.couponId))];
    const coupons = ids.length ? await this.couponRepo.findBy({ id: In(ids) }) : [];
    const couponMap = new Map(coupons.map((c) => [c.id, c]));
    const memberIds = [...new Set(list.map((l) => l.memberId))];
    const members = memberIds.length
      ? await this.logRepo.manager.query(`SELECT id, phone, nickname FROM member WHERE id IN (${memberIds.join(',')})`)
      : [];
    const memberMap = new Map<number, any>(members.map((m: any) => [m.id, m]));
    return {
      list: list.map((l) => ({
        ...l,
        couponName: couponMap.get(l.couponId)?.name ?? '优惠券已失效',
        memberPhone: memberMap.get(l.memberId)?.phone ?? null,
        memberNickname: memberMap.get(l.memberId)?.nickname ?? null,
      })),
      total,
      page,
      pageSize,
    };
  }

  async create(dto: SavePointsCouponDto): Promise<PointsCoupon> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: SavePointsCouponDto): Promise<PointsCoupon> {
    const item = await this.repo.findOneBy({ id });
    if (!item) throw new BusinessException('兑换项不存在', 40400);
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async remove(id: number): Promise<void> {
    const item = await this.repo.findOneBy({ id });
    if (!item) throw new BusinessException('兑换项不存在', 40400);
    const count = await this.logRepo.countBy({ pointsCouponId: id });
    if (count > 0) throw new BusinessException('该兑换项已有记录，无法删除，请停用', 40058);
    await this.repo.remove(item);
  }
}