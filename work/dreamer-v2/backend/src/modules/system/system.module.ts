import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AdminUser } from './entities/admin-user.entity';
import { Role } from './entities/role.entity';
import { Menu } from './entities/menu.entity';
import { AdminService } from './admin.service';
import { RoleService } from './role.service';
import { MenuService } from './menu.service';
import { AdminController } from './admin.controller';
import { RoleController } from './role.controller';
import { MenuController } from './menu.controller';
import { PermissionsGuard } from './permissions.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AdminUser, Role, Menu]), forwardRef(() => AuthModule)],
  controllers: [AdminController, RoleController, MenuController],
  providers: [AdminService, RoleService, MenuService, PermissionsGuard],
  exports: [AdminService, PermissionsGuard],
})
export class SystemModule {}
