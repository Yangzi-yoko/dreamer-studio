import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { Permissions } from './permissions.decorator';
import { MenuService } from './menu.service';
import { Menu } from './entities/menu.entity';
import { BaseController } from '../../common/base/base.controller';
import { PageResult } from '../../common/base/page-result';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('system/menus')
export class MenuController extends BaseController<Menu> {
  constructor(private readonly menuService: MenuService) {
    super(menuService);
  }

  @Get()
  @Permissions('system:menu:list')
  page(@Query('page') page = 1, @Query('pageSize') pageSize = 10): Promise<PageResult<Menu>> {
    return super.page(page, pageSize);
  }

  @Get(':id')
  @Permissions('system:menu:list')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Menu> {
    return super.findOne(id);
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
