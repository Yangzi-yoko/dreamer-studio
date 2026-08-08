import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Booking } from './entities/booking.entity';
import { MemberWallet } from '../member/entities/member-wallet.entity';
import { WalletLog } from '../member/entities/wallet-log.entity';
import { UserPackage } from '../member/entities/user-package.entity';
import { PackageUsage } from '../member/entities/package-usage.entity';

const TRANSITIONS: Record<string, string[]> = {
  pay: ['pending'],
  'check-in': ['paid'],
  complete: ['checked'],
  cancel: ['pending'],
  refund: ['paid'],
};

@Injectable()
export class BookingLifecycleService {
  constructor(
    @InjectRepository(Booking) private readonly repo: Repository<Booking>,
    @InjectRepository(MemberWallet) private readonly walletRepo: Repository<MemberWallet>,
    @InjectRepository(WalletLog) private readonly walletLogRepo: Repository<WalletLog>,
    @InjectRepository(UserPackage) private readonly userPackageRepo: Repository<UserPackage>,
    @InjectRepository(PackageUsage) private readonly packageUsageRepo: Repository<PackageUsage>,
  ) {}

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

  async refund(id: number): Promise<Booking> {
    const booking = await this.repo.findOneBy({ id });
    if (!booking) throw new BusinessException('订单不存在', 40400);
    if (!TRANSITIONS.refund.includes(booking.status)) {
      throw new BusinessException('当前状态不允许该操作', 40910);
    }
    if (booking.memberId && booking.payMethod === 'wallet') {
      const refundCents = booking.totalAmountCents - (booking.discountCents || 0);
      let wallet = await this.walletRepo.findOneBy({ memberId: booking.memberId });
      if (!wallet) {
        wallet = await this.walletRepo.save(this.walletRepo.create({ memberId: booking.memberId, balanceCents: 0 }));
      }
      wallet.balanceCents += refundCents;
      const saved = await this.walletRepo.save(wallet);
      await this.walletLogRepo.save(this.walletLogRepo.create({
        memberId: booking.memberId,
        type: 'refund',
        amountCents: refundCents,
        balanceAfterCents: saved.balanceCents,
        remark: `场地订单退款 ${booking.bookingNo}`,
      }));
    } else if (booking.memberId && booking.payMethod === 'package') {
      const usage = await this.packageUsageRepo.findOne({ where: { memberId: booking.memberId, remark: `场地预订 ${booking.bookingNo}` } });
      if (usage) {
        const up = await this.userPackageRepo.findOneBy({ id: usage.userPackageId, memberId: booking.memberId });
        if (up) {
          up.remainingTimes += 1;
          up.status = 'active';
          await this.userPackageRepo.save(up);
        }
      }
    }
    booking.status = 'refunded';
    return this.repo.save(booking);
  }
}
