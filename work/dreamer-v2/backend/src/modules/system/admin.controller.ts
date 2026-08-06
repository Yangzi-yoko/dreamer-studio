import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { Permissions } from './permissions.decorator';
import { CurrentAdmin, CurrentAdminPayload } from '../auth/current-admin.decorator';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { AdminUser } from './entities/admin-user.entity';
import { PageResult } from '../../common/base/page-result';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('system/admins')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @Permissions('system:admin:list')
  page(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
  ): Promise<PageResult<Omit<AdminUser, 'passwordHash'>>> {
    return this.adminService.page(Number(page), Number(pageSize));
  }

  @Post()
  @Permissions('system:admin:create')
  create(
    @CurrentAdmin() operator: CurrentAdminPayload,
    @Body() dto: CreateAdminDto,
  ): Promise<Omit<AdminUser, 'passwordHash'>> {
    return this.adminService.createAdmin(operator, dto);
  }

  @Put(':id/roles')
  @Permissions('system:admin:assign-role')
  assignRoles(
    @CurrentAdmin() operator: CurrentAdminPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRolesDto,
  ): Promise<Omit<AdminUser, 'passwordHash'>> {
    return this.adminService.assignRoles(operator, id, dto.roleIds);
  }

  @Put(':id/status')
  @Permissions('system:admin:toggle-status')
  toggleStatus(
    @CurrentAdmin() operator: CurrentAdminPayload,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Omit<AdminUser, 'passwordHash'>> {
    return this.adminService.toggleStatus(operator, id);
  }

  @Delete(':id')
  @Permissions('system:admin:delete')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ id: number }> {
    await this.adminService.remove(id);
    return { id };
  }
}
