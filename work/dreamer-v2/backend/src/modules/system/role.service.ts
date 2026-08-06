import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Menu } from './entities/menu.entity';
import { BaseService } from '../../common/base/base.service';

@Injectable()
export class RoleService extends BaseService<Role> {
  constructor(
    @InjectRepository(Role) repo: Repository<Role>,
    @InjectRepository(Menu) private readonly menuRepo: Repository<Menu>,
  ) {
    super(repo);
  }

  async assignMenus(roleId: number, menuIds: number[]): Promise<Role> {
    const role = await this.findOne(roleId);
    role.menus = await this.menuRepo.findBy({ id: In(menuIds) });
    return this.repo.save(role);
  }
}
