import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { BusinessException } from '../../common/exceptions/business.exception';
import { AdminService } from './admin.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly adminService: AdminService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = context.switchToHttp().getRequest().user;
    if (user?.isSuper) return true;
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const owned = await this.adminService.getPermissionCodes(user.adminId);
    if (!required.every((code) => owned.includes(code))) {
      throw new BusinessException('无权限', 40300);
    }
    return true;
  }
}
