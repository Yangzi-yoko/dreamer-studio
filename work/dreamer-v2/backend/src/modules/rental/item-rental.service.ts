import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { RedisService } from '../../common/redis/redis.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { resolveMemberId, MemberIdentity } from '../../common/security/member-binding.util';
import { assertPagination } from '../../common/utils/pagination.utils';
import { formatDate, parseDate } from '../../common/utils/date.utils';
import { RentalItem } from './entities/rental-item.entity';
import { ItemRental } from './entities/item-rental.entity';
import { CreateItemRentalDto } from './dto/create-item-rental.dto';

@Injectable()
export class ItemRentalService {
  constructor(
    @InjectRepository(RentalItem) private readonly itemRepo: Repository<RentalItem>,
    @InjectRepository(ItemRental) private readonly rentalRepo: Repository<ItemRental>,
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
  ) {}

  async create(dto: CreateItemRentalDto, member?: MemberIdentity): Promise<ItemRental> {
    dto.memberId = resolveMemberId(dto, member);
    const item = await this.itemRepo.findOne({ where: { id: dto.itemId, enabled: true } });
    if (!item) throw new BusinessException('商品不存在或已下架', 40400);
    if (dto.billingType !== item.billingType) {
      throw new BusinessException('计费方式与商品设置不符', 40022);
    }

    const start = parseDate(dto.startDate);
    const end = parseDate(dto.endDate);
    if (end < start) throw new BusinessException('结束日期不能早于开始日期', 40023);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (start < todayStart) throw new BusinessException('不能租赁过去的日期', 40025);
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const units = dto.billingType === 'day' ? days : dto.slotCount;
    if (units <= 0) throw new BusinessException('租期不合法', 40024);

    const lockKey = `rental:item-lock:${dto.itemId}`;
    const locked = await this.redis.get(lockKey);
    if (locked) throw new BusinessException('该商品正在被其他人下单，请重试', 40921);
    await this.redis.set(lockKey, '1', 15);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const lockedItem = await manager.findOne(RentalItem, {
          where: { id: dto.itemId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!lockedItem || !lockedItem.enabled) throw new BusinessException('商品不存在或已下架', 40400);

        const rented = (await manager.sum(ItemRental, 'quantity', { itemId: dto.itemId, status: 'pending' })) || 0;
        const picked = (await manager.sum(ItemRental, 'quantity', { itemId: dto.itemId, status: 'paid' })) || 0;
        const active = (await manager.sum(ItemRental, 'quantity', { itemId: dto.itemId, status: 'picked' })) || 0;
        const occupied = rented + picked + active;
        if (occupied + dto.quantity > lockedItem.stock) {
          throw new BusinessException('库存不足', 40920);
        }

        const unitPriceCents = lockedItem.unitPriceCents;
        const rentalNo = `R${formatDate(new Date()).replace(/-/g, '')}${Date.now().toString(36).toUpperCase()}`;
        const rental = manager.create(ItemRental, {
          rentalNo,
          itemId: lockedItem.id,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          memberId: dto.memberId ?? null,
          billingType: dto.billingType,
          quantity: dto.quantity,
          startDate: dto.startDate,
          endDate: dto.endDate,
          slotCount: dto.slotCount,
          unitPriceCents,
          totalAmountCents: unitPriceCents * dto.quantity * units,
          depositCents: lockedItem.depositCents,
          status: 'pending',
          remark: dto.remark,
        });
        return manager.save(rental);
      });
    } finally {
      await this.redis.del(lockKey);
    }
  }

  async page(page = 1, pageSize = 10, status?: string): Promise<{ list: ItemRental[]; total: number; page: number; pageSize: number }> {
    assertPagination(page, pageSize);
    const where = status ? { status } : {};
    const [list, total] = await this.rentalRepo.findAndCount({
      where,
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    return { list, total, page, pageSize };
  }

  async pageMy(member?: MemberIdentity): Promise<ItemRental[]> {
    if (member?.memberId == null) {
      throw new BusinessException('请先登录会员', 40100);
    }
    return this.rentalRepo.find({ where: { memberId: member.memberId }, order: { createdAt: 'DESC' } });
  }
}