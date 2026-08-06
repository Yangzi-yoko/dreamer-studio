import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AdminUser } from './entities/admin-user.entity';
import { Role } from './entities/role.entity';
import { Menu } from './entities/menu.entity';
import { BusinessException } from '../../common/exceptions/business.exception';
import { BaseService } from '../../common/base/base.service';
import { CreateAdminDto } from './dto/create-admin.dto';

@Injectable()
export class AdminService extends BaseService<AdminUser> {
  constructor(
    @InjectRepository(AdminUser)
    repo: Repository<AdminUser>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Menu)
    private readonly menuRepo: Repository<Menu>,
  ) {
    super(repo);
  }

  private assertSuper(operator: { isSuper: boolean }): void {
    if (!operator.isSuper) throw new BusinessException('只有超级管理员可以创建账户', 40301);
  }

  async createAdmin(operator: { isSuper: boolean }, dto: CreateAdminDto): Promise<AdminUser> {
    this.assertSuper(operator);
    const exists = await this.repo.findOneBy({ username: dto.username });
    if (exists) throw new BusinessException('用户名已存在', 40010);
    const admin = this.repo.create({
      username: dto.username,
      passwordHash: bcrypt.hashSync(dto.password, 10),
      nickname: dto.nickname,
      isSuper: dto.isSuper ?? false,
      roles: dto.roleIds?.length ? (await this.roleRepo.findBy({ id: In(dto.roleIds) })) : [],
    });
    return this.repo.save(admin);
  }

  async assignRoles(operator: { isSuper: boolean }, adminId: number, roleIds: number[]): Promise<AdminUser> {
    this.assertSuper(operator);
    const admin = await this.findOne(adminId);
    admin.roles = await this.roleRepo.findBy({ id: In(roleIds) });
    return this.repo.save(admin);
  }

  async toggleStatus(operator: { isSuper: boolean }, id: number): Promise<AdminUser> {
    this.assertSuper(operator);
    const admin = await this.findOne(id);
    if (admin.isSuper) throw new BusinessException('不能禁用超级管理员', 40302);
    admin.status = admin.status === 1 ? 0 : 1;
    return this.repo.save(admin);
  }

  async getPermissionCodes(adminId: number): Promise<string[]> {
    const admin = await this.repo.findOne({
      where: { id: adminId },
      relations: { roles: { menus: true } },
    });
    const codes = (admin?.roles ?? []).flatMap((r) => (r.menus ?? []).map((m) => m.permissionCode).filter(Boolean));
    return [...new Set(codes)] as string[];
  }

  async menusOf(adminId: number): Promise<Menu[]> {
    const codes = await this.getPermissionCodes(adminId);
    const admin = await this.repo.findOneBy({ id: adminId });
    if (admin?.isSuper) {
      return this.menuRepo.find({ where: { visible: true }, order: { sort: 'ASC' } });
    }
    return this.menuRepo.find({
      where: { visible: true, permissionCode: In(codes.length ? codes : ['__none__']) },
      order: { sort: 'ASC' },
    });
  }
}
