import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { toCents, toYuan } from '../../common/utils/money.utils';
import { computeCouponDeduct } from '../../common/utils/coupon.utils';
import { Coupon } from './entities/coupon.entity';
import { UserCoupon } from './entities/user-coupon.entity';
import { CouponUsage } from './entities/coupon-usage.entity';
import { Member } from './entities/member.entity';
import { SaveCouponDto } from './dto/save-coupon.dto';

@Injectable()
export class MemberCouponService {
  constructor(
    @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(UserCoupon) private readonly userRepo: Repository<UserCoupon>,
    @InjectRepository(CouponUsage) private readonly usageRepo: Repository<CouponUsage>,
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
  ) {}

  async pageCoupons(page = 1, pageSize = 10): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.couponRepo.findAndCount({ take: pageSize, skip: (page - 1) * pageSize, order: { createdAt: 'DESC' } });
    return { list: list.map((c) => ({ ...c, minSpend: toYuan(c.minSpendCents) })), total, page, pageSize };
  }

  async createCoupon(dto: SaveCouponDto): Promise<any> {
    const coupon = await this.couponRepo.save(this.couponRepo.create({ ...dto, minSpendCents: toCents(dto.minSpendYuan) }));
    return { ...coupon, minSpend: toYuan(coupon.minSpendCents) };
  }

  async updateCoupon(id: number, dto: SaveCouponDto): Promise<any> {
    const coupon = await this.couponRepo.findOneBy({ id });
    if (!coupon) throw new BusinessException('优惠券不存在', 40400);
    Object.assign(coupon, dto, { minSpendCents: toCents(dto.minSpendYuan) });
    return this.couponRepo.save(coupon);
  }

  async deleteCoupon(id: number): Promise<void> {
    const coupon = await this.couponRepo.findOneBy({ id });
    if (!coupon) throw new BusinessException('优惠券不存在', 40400);
    await this.couponRepo.delete(id);
  }

  async issue(memberId: number, couponId: number): Promise<Coupon> {
    const member = await this.memberRepo.findOneBy({ id: memberId });
    if (!member) throw new BusinessException('会员不存在', 40400);
    const coupon = await this.couponRepo.findOneBy({ id: couponId, enabled: true });
    if (!coupon) throw new BusinessException('优惠券不存在或已停用', 40400);
    if (coupon.issuedCount >= coupon.totalCount) throw new BusinessException('优惠券已发完', 40043);
    coupon.issuedCount += 1;
    await this.couponRepo.save(coupon);
    await this.userRepo.save(this.userRepo.create({ memberId, couponId, status: 'unused' }));
    return coupon;
  }

  async use(memberId: number, userCouponId: number, orderNo: string, amountCents: number): Promise<{ userCoupon: UserCoupon; deductCents: number }> {
    const uc = await this.userRepo.findOneBy({ id: userCouponId, memberId });
    if (!uc) throw new BusinessException('优惠券不存在', 40400);
    if (uc.status !== 'unused') throw new BusinessException('优惠券已使用', 40044);
    const coupon = await this.couponRepo.findOneBy({ id: uc.couponId });
    if (!coupon || !coupon.enabled) throw new BusinessException('优惠券不可用', 40045);
    if (amountCents < coupon.minSpendCents) throw new BusinessException('未达到使用门槛', 40046);

    const deductCents = computeCouponDeduct(coupon, amountCents);

    uc.status = 'used';
    uc.usedAt = new Date();
    await this.userRepo.save(uc);
    await this.usageRepo.save(this.usageRepo.create({
      userCouponId, memberId, orderNo, deductCents,
    }));
    return { userCoupon: uc, deductCents };
  }

  async pageUserCoupons(memberId: number): Promise<UserCoupon[]> {
    return this.userRepo.find({ where: { memberId }, order: { createdAt: 'DESC' } });
  }

  async usableCards(memberId: number): Promise<any[]> {
    const userCoupons = await this.userRepo.find({ where: { memberId, status: 'unused' }, order: { createdAt: 'DESC' } });
    const couponIds = [...new Set(userCoupons.map((uc) => uc.couponId))];
    const coupons = couponIds.length ? await this.couponRepo.findBy({ id: In(couponIds) }) : [];
    const couponMap = new Map(coupons.map((c) => [c.id, c]));
    return userCoupons
      .map((uc) => {
        const coupon = couponMap.get(uc.couponId);
        if (!coupon || !coupon.enabled) return null;
        return {
          id: uc.id,
          couponId: uc.couponId,
          status: uc.status,
          couponName: coupon.name,
          type: coupon.type,
          value: coupon.value,
          minSpend: toYuan(coupon.minSpendCents),
        };
      })
      .filter((x): x is any => !!x);
  }
}
