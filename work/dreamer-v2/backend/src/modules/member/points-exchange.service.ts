import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { MemberPointsService } from './member-points.service';
import { PointsProduct } from './entities/points-product.entity';
import { PointsExchangeOrder } from './entities/points-exchange-order.entity';
import { ExchangePointsDto } from './dto/exchange-points.dto';

@Injectable()
export class PointsExchangeService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly pointsService: MemberPointsService,
    @InjectRepository(PointsExchangeOrder) private readonly orderRepo: Repository<PointsExchangeOrder>,
  ) {}

  private genOrderNo(): string {
    return `PX${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
  }

  async exchange(memberId: number, dto: ExchangePointsDto): Promise<PointsExchangeOrder> {
    return this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(PointsProduct);
      const orderRepo = manager.getRepository(PointsExchangeOrder);

      const product = await productRepo.findOneBy({ id: dto.productId });
      if (!product) throw new BusinessException('商品不存在', 40400);
      if (product.status !== 'enabled') throw new BusinessException('商品已下架', 40056);

      if (product.limitPerUser > 0) {
        const { count } = await orderRepo
          .createQueryBuilder('o')
          .select('COUNT(*)', 'count')
          .where('o.product_id = :productId AND o.member_id = :memberId AND o.status <> :cancelled', {
            productId: product.id,
            memberId,
            cancelled: 'cancelled',
          })
          .getRawOne<{ count: string }>();
        if (Number(count) >= product.limitPerUser) throw new BusinessException('已达兑换次数上限', 40059);
      }

      const result = await productRepo
        .createQueryBuilder()
        .update(PointsProduct)
        .set({ stock: () => 'stock - 1', exchanged: () => 'exchanged + 1' })
        .where('id = :id AND stock > 0 AND status = :status', { id: product.id, status: 'enabled' })
        .execute();
      if (result.affected !== 1) throw new BusinessException('库存不足或已下架', 40057);

      await this.pointsService.spend(memberId, product.point, `积分兑换：${product.name}`, manager);

      return orderRepo.save(orderRepo.create({
        orderNo: this.genOrderNo(),
        memberId,
        productId: product.id,
        productName: product.name,
        productCover: product.cover,
        point: product.point,
        receiverName: dto.receiverName,
        receiverPhone: dto.receiverPhone,
        receiverAddress: dto.receiverAddress,
        remark: dto.remark,
        status: 'pending',
      }));
    });
  }

  async pageMine(memberId: number, page = 1, pageSize = 10): Promise<{ list: PointsExchangeOrder[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.orderRepo.findAndCount({
      where: { memberId },
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    return { list, total, page, pageSize };
  }

  async pageAdmin(status?: string, page = 1, pageSize = 10): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const where: any = {};
    if (status) where.status = status;
    const [list, total] = await this.orderRepo.findAndCount({
      where,
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' },
    });
    const ids = list.map((o) => o.memberId);
    const members = ids.length
      ? await this.orderRepo.manager.query(`SELECT id, phone, nickname FROM member WHERE id IN (${ids.join(',')})`)
      : [];
    const memberMap = new Map<number, any>(members.map((m: any) => [m.id, m]));
    return {
      list: list.map((o) => ({
        ...o,
        memberPhone: memberMap.get(o.memberId)?.phone ?? null,
        memberNickname: memberMap.get(o.memberId)?.nickname ?? null,
      })),
      total,
      page,
      pageSize,
    };
  }

  private async findOrder(id: number): Promise<PointsExchangeOrder> {
    const order = await this.orderRepo.findOneBy({ id });
    if (!order) throw new BusinessException('兑换订单不存在', 40400);
    return order;
  }

  async ship(id: number, adminNote?: string): Promise<PointsExchangeOrder> {
    const order = await this.findOrder(id);
    if (order.status !== 'pending') throw new BusinessException('仅待发货订单可发货', 40060);
    order.status = 'shipped';
    if (adminNote !== undefined) order.adminNote = adminNote;
    return this.orderRepo.save(order);
  }

  async complete(id: number): Promise<PointsExchangeOrder> {
    const order = await this.findOrder(id);
    if (order.status !== 'shipped') throw new BusinessException('仅已发货订单可完成', 40061);
    order.status = 'completed';
    return this.orderRepo.save(order);
  }

  async cancel(id: number, reason?: string): Promise<PointsExchangeOrder> {
    const order = await this.findOrder(id);
    if (order.status !== 'pending') throw new BusinessException('仅待发货订单可取消', 40060);
    if (reason !== undefined) order.adminNote = reason;
    await this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(PointsProduct);
      await productRepo.update(
        { id: order.productId },
        { stock: () => 'stock + 1', exchanged: () => 'exchanged - 1' },
      );
      await this.pointsService.earn(order.memberId, order.point, `兑换取消退款：${order.productName}`, manager);
    });
    order.status = 'cancelled';
    return this.orderRepo.save(order);
  }
}