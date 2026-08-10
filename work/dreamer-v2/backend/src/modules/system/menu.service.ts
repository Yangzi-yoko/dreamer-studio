import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menu } from './entities/menu.entity';
import { BaseService } from '../../common/base/base.service';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class MenuService extends BaseService<Menu> {
  constructor(@InjectRepository(Menu) repo: Repository<Menu>) {
    super(repo);
  }

  async all(): Promise<Menu[]> {
    return this.repo.find({ order: { sort: 'ASC' } as any });
  }

  async tree(): Promise<Menu[]> {
    const menus = await this.all();
    const map = new Map<number, any>(menus.map((m) => [m.id, { ...m, children: [] }]));
    const roots: any[] = [];
    menus.forEach((m) => {
      const node = map.get(m.id)!;
      if (m.parentId && map.has(m.parentId)) {
        map.get(m.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }

  async remove(id: number): Promise<void> {
    const childrenCount = await this.repo.countBy({ parentId: id } as any);
    if (childrenCount > 0) throw new BusinessException('请先删除子菜单', 40920);
    await super.remove(id);
  }
}