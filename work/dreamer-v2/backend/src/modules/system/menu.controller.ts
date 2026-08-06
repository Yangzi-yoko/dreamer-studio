import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { MenuService } from './menu.service';
import { Menu } from './entities/menu.entity';
import { BaseController } from '../../common/base/base.controller';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('system/menus')
export class MenuController extends BaseController<Menu> {
  constructor(private readonly menuService: MenuService) {
    super(menuService);
  }
}
