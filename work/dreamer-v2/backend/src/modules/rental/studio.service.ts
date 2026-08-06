import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../common/base/base.service';
import { PageResult } from '../../common/base/page-result';
import { toCents, toYuan } from '../../common/utils/money.utils';
import { Studio } from './entities/studio.entity';
import { SaveStudioDto } from './dto/save-studio.dto';

@Injectable()
export class StudioService extends BaseService<Studio> {
  constructor(@InjectRepository(Studio) repo: Repository<Studio>) {
    super(repo);
  }

  async page(page = 1, pageSize = 10): Promise<PageResult<any>> {
    const result = await super.page(page, pageSize);
    return {
      ...result,
      list: result.list.map((s) => this.toPublic(s)),
    };
  }

  async findOne(id: number): Promise<any> {
    return this.toPublic(await super.findOne(id));
  }

  async create(dto: SaveStudioDto): Promise<any> {
    const entity = this.repo.create({
      ...dto,
      weekdayPriceCents: toCents(dto.weekdayPriceYuan),
      weekendPriceCents: toCents(dto.weekendPriceYuan),
      holidayPriceCents: toCents(dto.holidayPriceYuan),
      depositCents: toCents(dto.depositYuan),
    });
    return this.toPublic(await this.repo.save(entity));
  }

  async update(id: number, dto: SaveStudioDto): Promise<any> {
    const entity = await super.findOne(id);
    Object.assign(entity, dto, {
      weekdayPriceCents: toCents(dto.weekdayPriceYuan),
      weekendPriceCents: toCents(dto.weekendPriceYuan),
      holidayPriceCents: toCents(dto.holidayPriceYuan),
      depositCents: toCents(dto.depositYuan),
    });
    return this.toPublic(await this.repo.save(entity));
  }

  private toPublic(s: Studio): any {
    return {
      id: s.id,
      name: s.name,
      address: s.address,
      images: s.images,
      description: s.description,
      weekdayPrice: toYuan(s.weekdayPriceCents),
      weekendPrice: toYuan(s.weekendPriceCents),
      holidayPrice: toYuan(s.holidayPriceCents),
      deposit: toYuan(s.depositCents),
      enabled: s.enabled,
      sort: s.sort,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }
}
