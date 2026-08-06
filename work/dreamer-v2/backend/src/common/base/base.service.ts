import { Repository } from 'typeorm';
import { BusinessException } from '../exceptions/business.exception';
import { PageResult } from './page-result';

export class BaseService<T extends { id: any }> {
  constructor(protected readonly repo: Repository<T>) {}

  async page(page = 1, pageSize = 10): Promise<PageResult<T>> {
    const [list, total] = await this.repo.findAndCount({
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' } as any,
    });
    return { list, total, page, pageSize };
  }

  async findOne(id: any): Promise<T> {
    const entity = await this.repo.findOneBy({ id } as any);
    if (!entity) throw new BusinessException('记录不存在', 40400);
    return entity;
  }

  async create(dto: Partial<T>): Promise<T> {
    const entity = this.repo.create(dto as any);
    return this.repo.save(entity as any) as Promise<T>;
  }

  async update(id: any, dto: Partial<T>): Promise<T> {
    const entity = await this.findOne(id);
    Object.assign(entity, dto);
    return this.repo.save(entity as any) as Promise<T>;
  }

  async remove(id: any): Promise<void> {
    await this.findOne(id);
    await this.repo.delete(id);
  }
}
