import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Menu } from './entities/menu.entity';
import { AdminUser } from './entities/admin-user.entity';
import { BaseService } from '../../common/base/base.service';
import { PageResult } from '../../common/base/page-result';

interface RoleListItem {
  id: number;
  code: string;
  name: string;
  description?: string;
  createdAt: Date;
  menuCount: number;
  adminCount: number;
}

@Injectable()
export class RoleService extends BaseService<Role> {
  constructor(
    @InjectRepository(Role) repo: Repository<Role>,
    @InjectRepository(Menu) private readonly menuRepo: Repository<Menu>,
    @InjectRepository(AdminUser) private readonly adminRepo: Repository<AdminUser>,
  ) {
    super(repo);
  }

  async page<TReturn = RoleListItem>(page = 1, pageSize = 10): Promise<PageResult<TReturn>> {
    const [list, total] = await this.repo.findAndCount({
      take: pageSize,
      skip: (page - 1) * pageSize,
      order: { createdAt: 'DESC' } as any,
    });

    const items: RoleListItem[] = [];
    for (const role of list) {
      const [menuCount, adminCount] = await Promise.all([
        this.menuRepo.createQueryBuilder('m')
          .innerJoin('role_menu', 'rm', 'rm.menuId = m.id')
          .where('rm.roleId = :roleId', { roleId: role.id })
          .getCount(),
        this.adminRepo.createQueryBuilder('a')
          .innerJoin('admin_role', 'ar', 'ar.adminUserId = a.id')
          .where('ar.roleId = :roleId', { roleId: role.id })
          .getCount(),
      ]);
      items.push({ id: role.id, code: role.code, name: role.name, description: role.description, createdAt: role.createdAt, menuCount, adminCount });
    }

    return { list: items as unknown as TReturn[], total, page, pageSize };
  }

  async findOne(id: any): Promise<Role> {
    const entity = await this.repo.findOne({ where: { id }, relations: { menus: true, admins: true } });
    if (!entity) throw new Error('记录不存在');
    return entity;
  }

  async menuIdsOf(roleId: number): Promise<number[]> {
    const role = await this.repo.findOne({ where: { id: roleId }, relations: { menus: true } });
    return (role?.menus ?? []).map((m) => m.id);
  }

  async assignMenus(roleId: number, menuIds: number[]): Promise<Role> {
    const role = await this.findOne(roleId);
    role.menus = await this.menuRepo.findBy({ id: In(menuIds) });
    return this.repo.save(role);
  }
}