import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { toYuan } from '../../common/utils/money.utils';
import { RechargeOrder } from './entities/recharge-order.entity';
import { MemberWallet } from './entities/member-wallet.entity';
import { WalletLog } from './entities/wallet-log.entity';

@Injectable()
export class RechargeOrderService {
  constructor(
    @InjectRepository(RechargeOrder) private readonly orderRepo: Repository<RechargeOrder>,
    @InjectRepository(MemberWallet) private readonly walletRepo: Repository<MemberWallet>,
    @InjectRepository(WalletLog) private readonly logRepo: Repository<WalletLog>,
  ) {}

  async create(memberId: number, amountCents: number, remark?: string): Promise<RechargeOrder> {
    if (!Number.isFinite(amountCents) || amountCents <= 0) throw new BusinessException('充值金额必须大于 0', 40040);
    const orderNo = `R${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)}`;
    return this.orderRepo.save(this.orderRepo.create({ orderNo, memberId, amountCents, status: 'pending', remark }));
  }

  async mine(memberId: number): Promise<RechargeOrder[]> {
    return this.orderRepo.find({ where: { memberId }, order: { createdAt: 'DESC' } });
  }

  async page(page = 1, pageSize = 10, status?: string): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const where: any = status ? { status } : {};
    const [list, total] = await this.orderRepo.findAndCount({
      where,
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    return {
      list: list.map((o) => ({ ...o, amount: toYuan(o.amountCents) })),
      total,
      page,
      pageSize,
    };
  }

  async pay(memberId: number, orderId: number): Promise<RechargeOrder> {
    const order = await this.orderRepo.findOneBy({ id: orderId, memberId });
    if (!order) throw new BusinessException('充值订单不存在', 40400);
    if (order.status !== 'pending') throw new BusinessException('该订单已处理', 40048);
    order.status = 'paid';
    order.paidAt = new Date();
    const saved = await this.orderRepo.save(order);

    let wallet = await this.walletRepo.findOneBy({ memberId });
    if (!wallet) {
      wallet = await this.walletRepo.save(this.walletRepo.create({ memberId, balanceCents: 0 }));
    }
    wallet.balanceCents += order.amountCents;
    const savedWallet = await this.walletRepo.save(wallet);
    await this.logRepo.save(this.logRepo.create({
      memberId,
      type: 'recharge',
      amountCents: order.amountCents,
      balanceAfterCents: savedWallet.balanceCents,
      remark: `充值订单 ${order.orderNo}`,
    }));
    return saved;
  }

  async adminPay(orderId: number): Promise<RechargeOrder> {
    const order = await this.orderRepo.findOneBy({ id: orderId });
    if (!order) throw new BusinessException('充值订单不存在', 40400);
    return this.pay(order.memberId, orderId);
  }

  async cancel(orderId: number): Promise<RechargeOrder> {
    const order = await this.orderRepo.findOneBy({ id: orderId });
    if (!order) throw new BusinessException('充值订单不存在', 40400);
    if (order.status !== 'pending') throw new BusinessException('该订单已处理', 40048);
    order.status = 'cancelled';
    return this.orderRepo.save(order);
  }
}
