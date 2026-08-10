import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { PointsProduct } from './entities/points-product.entity';
import { PointsExchangeOrder } from './entities/points-exchange-order.entity';
import { SavePointsProductDto } from './dto/save-points-product.dto';

@Injectable()
export class PointsProductService {
  constructor(
    @InjectRepository(PointsProduct) private readonly repo: Repository<PointsProduct>,
    @InjectRepository(PointsExchangeOrder) private readonly orderRepo: Repository<PointsExchangeOrder>,
  ) {}

  async mall(): Promise<PointsProduct[]> {
    return this.repo.find({
      where: { status: 'enabled' },
      order: { sort: 'ASC', id: 'DESC' },
      take: 200,
    });
  }

  async mallDetail(id: number): Promise<PointsProduct> {
    const product = await this.repo.findOneBy({ id });
    if (!product || product.status !== 'enabled') throw new BusinessException('商品不存在或已下架', 40400);
    return product;
  }

  async pageAdmin(page = 1, pageSize = 10): Promise<{ list: PointsProduct[]; total: number; page: number; pageSize: number }> {
    const [list, total] = await this.repo.findAndCount({
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { sort: 'ASC', id: 'DESC' },
    });
    return { list, total, page, pageSize };
  }

  async create(dto: SavePointsProductDto): Promise<PointsProduct> {
    return this.repo.save(this.repo.create({ ...dto, totalStock: dto.stock ?? 0 }));
  }

  async update(id: number, dto: SavePointsProductDto): Promise<PointsProduct> {
    const product = await this.repo.findOneBy({ id });
    if (!product) throw new BusinessException('商品不存在', 40400);
    if (dto.stock !== undefined) {
      product.totalStock = Math.max(0, product.totalStock + (dto.stock - product.stock));
    }
    Object.assign(product, dto);
    return this.repo.save(product);
  }

  async remove(id: number): Promise<void> {
    const product = await this.repo.findOneBy({ id });
    if (!product) throw new BusinessException('商品不存在', 40400);
    const count = await this.orderRepo.countBy({ productId: id });
    if (count > 0) throw new BusinessException('该商品已有兑换记录，无法删除，请下架', 40058);
    await this.repo.remove(product);
  }
}