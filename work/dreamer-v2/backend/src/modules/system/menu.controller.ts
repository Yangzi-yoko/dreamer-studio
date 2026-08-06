import { Body, Controller, Delete, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { Permissions } from './permissions.decorator';
import { MenuService } from './menu.service';
import { Menu } from './entities/menu.entity';
import { BaseController } from '../../common/base/base.controller';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('system/menus')
export class MenuController extends BaseController<Menu> {
  constructor(private readonly menuService: MenuService) {
    super(menuService);
  }

  @Post()
  @Permissions('system:menu:create')
  create(@Body() dto: Partial<Menu>): Promise<Menu> {
    return super.create(dto);
  }

  @Put(':id')
  @Permissions('system:menu:update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<Menu>): Promise<Menu> {
    return super.update(id, dto);
  }

  @Delete(':id')
  @Permissions('system:menu:delete')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ id: number }> {
    return super.remove(id);
  }
}
