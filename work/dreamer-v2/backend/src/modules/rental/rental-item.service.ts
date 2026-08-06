import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../common/base/base.service';
import { PageResult } from '../../common/base/page-result';
import { toCents, toYuan } from '../../common/utils/money.utils';
import { RentalItem } from './entities/rental-item.entity';
import { SaveRentalItemDto } from './dto/save-rental-item.dto';

@Injectable()
export class RentalItemService extends BaseService<RentalItem> {
  constructor(@InjectRepository(RentalItem) repo: Repository<RentalItem>) {
    super(repo);
  }

  async page(page = 1, pageSize = 10): Promise<PageResult<any>> {
    const result = await super.page(page, pageSize);
    return { ...result, list: result.list.map((i) => this.toPublic(i)) };
  }

  async findOne(id: number): Promise<any> {
    return this.toPublic(await super.findOne(id));
  }

  async create(dto: SaveRentalItemDto): Promise<any> {
    const entity = this.repo.create({
      ...dto,
      unitPriceCents: toCents(dto.unitPriceYuan),
      depositCents: toCents(dto.depositYuan),
    });
    return this.toPublic(await this.repo.save(entity));
  }

  async update(id: number, dto: SaveRentalItemDto): Promise<any> {
    const entity = await super.findOne(id);
    Object.assign(entity, dto, {
      unitPriceCents: toCents(dto.unitPriceYuan),
      depositCents: toCents(dto.depositYuan),
    });
    return this.toPublic(await this.repo.save(entity));
  }

  private toPublic(i: RentalItem): any {
    return {
      id: i.id,
      name: i.name,
      images: i.images,
      description: i.description,
      billingType: i.billingType,
      unitPrice: toYuan(i.unitPriceCents),
      deposit: toYuan(i.depositCents),
      stock: i.stock,
      enabled: i.enabled,
      sort: i.sort,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    };
  }
}
