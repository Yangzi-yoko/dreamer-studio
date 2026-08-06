import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../common/base/base.service';
import { PageResult } from '../../common/base/page-result';
import { toCents, toYuan } from '../../common/utils/money.utils';
import { MemberLevel } from './entities/member-level.entity';
import { SaveMemberLevelDto } from './dto/save-member-level.dto';

@Injectable()
export class MemberLevelService extends BaseService<MemberLevel> {
  constructor(@InjectRepository(MemberLevel) repo: Repository<MemberLevel>) {
    super(repo);
  }

  async page(page = 1, pageSize = 10): Promise<PageResult<any>> {
    const result = await super.page(page, pageSize);
    return { ...result, list: result.list.map((l) => this.toPublic(l)) };
  }

  async create(dto: SaveMemberLevelDto): Promise<any> {
    const entity = this.repo.create({ ...dto, minSpendCents: toCents(dto.minSpendYuan) });
    return this.toPublic(await this.repo.save(entity));
  }

  async update(id: number, dto: SaveMemberLevelDto): Promise<any> {
    const entity = await super.findOne(id);
    Object.assign(entity, dto, { minSpendCents: toCents(dto.minSpendYuan) });
    return this.toPublic(await this.repo.save(entity));
  }

  private toPublic(l: MemberLevel): any {
    return {
      id: l.id,
      name: l.name,
      minSpend: toYuan(l.minSpendCents),
      minOrders: l.minOrders,
      enabled: l.enabled,
      sort: l.sort,
      createdAt: l.createdAt,
    };
  }
}
