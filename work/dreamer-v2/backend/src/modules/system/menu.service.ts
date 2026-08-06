import { Injectable } from '@nestjs/common';
import { Menu } from './entities/menu.entity';
import { BaseService } from '../../common/base/base.service';

@Injectable()
export class MenuService extends BaseService<Menu> {}
