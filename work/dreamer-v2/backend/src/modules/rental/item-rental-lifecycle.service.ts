import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { toCents } from '../../common/utils/money.utils';
import { formatDate, parseDate } from '../../common/utils/date.utils';
import { ItemRental } from './entities/item-rental.entity';
import { RentalItem } from './entities/rental-item.entity';

const TRANSITIONS: Record<string, string[]> = {
  pay: ['pending'],
  pick: ['paid'],
  return: ['picked'],
  complete: ['returned'],
  cancel: ['pending'],
  refund: ['paid'],
  extend: ['paid', 'picked'],
};

@Injectable()
export class ItemRentalLifecycleService {
  constructor(
    @InjectRepository(ItemRental) private readonly repo: Repository<ItemRental>,
    @InjectRepository(RentalItem) private readonly itemRepo: Repository<RentalItem>,
  ) {}

  private async transition(id: number, action: string, toStatus: string, mutate?: (r: ItemRental) => void): Promise<ItemRental> {
    const rental = await this.repo.findOneBy({ id });
    if (!rental) throw new BusinessException('订单不存在', 40400);
    if (!TRANSITIONS[action].includes(rental.status)) {
      throw new BusinessException('当前状态不允许该操作', 40910);
    }
    if (mutate) mutate(rental);
    rental.status = toStatus;
    if (toStatus === 'completed') rental.depositRefunded = true;
    return this.repo.save(rental);
  }

  pay(id: number): Promise<ItemRental> {
    return this.transition(id, 'pay', 'paid');
  }

  pick(id: number): Promise<ItemRental> {
    return this.transition(id, 'pick', 'picked');
  }

  returnRental(id: number, dto: { damageDeductYuan?: number }): Promise<ItemRental> {
    return this.transition(id, 'return', 'returned', (r) => {
      r.damageDeductCents = dto.damageDeductYuan ? toCents(dto.damageDeductYuan) : 0;
    });
  }

  complete(id: number): Promise<ItemRental> {
    return this.transition(id, 'complete', 'completed');
  }

  cancel(id: number): Promise<ItemRental> {
    return this.transition(id, 'cancel', 'cancelled');
  }

  refund(id: number): Promise<ItemRental> {
    return this.transition(id, 'refund', 'refunded');
  }

  async extend(id: number, dto: { extendDays: number; extendSlotCount: number }): Promise<ItemRental> {
    const rental = await this.repo.findOneBy({ id });
    if (!rental) throw new BusinessException('订单不存在', 40400);
    if (!TRANSITIONS.extend.includes(rental.status)) {
      throw new BusinessException('当前状态不允许该操作', 40910);
    }
    const item = await this.itemRepo.findOneBy({ id: rental.itemId });
    if (!item) throw new BusinessException('商品不存在', 40400);

    if (rental.billingType === 'day') {
      if (dto.extendDays <= 0) throw new BusinessException('续租天数不合法', 40025);
      const end = parseDate(rental.endDate);
      end.setDate(end.getDate() + dto.extendDays);
      rental.endDate = formatDate(end);
      rental.totalAmountCents += item.unitPriceCents * rental.quantity * dto.extendDays;
    } else {
      if (dto.extendSlotCount <= 0) throw new BusinessException('续租时段数不合法', 40026);
      rental.slotCount += dto.extendSlotCount;
      rental.totalAmountCents += item.unitPriceCents * rental.quantity * dto.extendSlotCount;
    }
    return this.repo.save(rental);
  }
}
