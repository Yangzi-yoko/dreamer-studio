import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Booking } from './entities/booking.entity';

const TRANSITIONS: Record<string, string[]> = {
  pay: ['pending'],
  'check-in': ['paid'],
  complete: ['checked'],
  cancel: ['pending'],
  refund: ['paid'],
};

@Injectable()
export class BookingLifecycleService {
  constructor(@InjectRepository(Booking) private readonly repo: Repository<Booking>) {}

  private async transition(id: number, action: string, toStatus: string): Promise<Booking> {
    const booking = await this.repo.findOneBy({ id });
    if (!booking) throw new BusinessException('订单不存在', 40400);
    if (!TRANSITIONS[action].includes(booking.status)) {
      throw new BusinessException('当前状态不允许该操作', 40910);
    }
    booking.status = toStatus;
    if (toStatus === 'completed') booking.depositRefunded = true;
    return this.repo.save(booking);
  }

  pay(id: number): Promise<Booking> {
    return this.transition(id, 'pay', 'paid');
  }

  checkIn(id: number): Promise<Booking> {
    return this.transition(id, 'check-in', 'checked');
  }

  complete(id: number): Promise<Booking> {
    return this.transition(id, 'complete', 'completed');
  }

  cancel(id: number): Promise<Booking> {
    return this.transition(id, 'cancel', 'cancelled');
  }

  refund(id: number): Promise<Booking> {
    return this.transition(id, 'refund', 'refunded');
  }
}
