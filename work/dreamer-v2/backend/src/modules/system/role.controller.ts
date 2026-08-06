import { Body, Controller, Delete, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { Permissions } from './permissions.decorator';
import { RoleService } from './role.service';
import { Role } from './entities/role.entity';
import { BaseController } from '../../common/base/base.controller';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('system/roles')
export class RoleController extends BaseController<Role> {
  constructor(private readonly roleService: RoleService) {
    super(roleService);
  }

  @Post()
  @Permissions('system:role:create')
  create(@Body() dto: Partial<Role>): Promise<Role> {
    return super.create(dto);
  }

  @Put(':id')
  @Permissions('system:role:update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<Role>): Promise<Role> {
    return super.update(id, dto);
  }

  @Delete(':id')
  @Permissions('system:role:delete')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ id: number }> {
    return super.remove(id);
  }

  @Put(':id/menus')
  @Permissions('system:role:assign-menu')
  assignMenus(@Param('id', ParseIntPipe) id: number, @Body('menuIds') menuIds: number[]): Promise<Role> {
    return this.roleService.assignMenus(id, menuIds);
  }
}
