import { PermissionsGuard } from './permissions.guard';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('PermissionsGuard', () => {
  function makeContext(user: any, permissions: string[]): any {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };
  }

  it('allows super admin without permission check', async () => {
    const reflector = { getAllAndOverride: jest.fn(() => ['system:admin:create']) };
    const service = { getPermissionCodes: jest.fn() };
    const guard = new PermissionsGuard(reflector as any, service as any);
    await expect(guard.canActivate(makeContext({ isSuper: true }, []))).resolves.toBe(true);
  });

  it('rejects non-super admin missing permission', async () => {
    const reflector = { getAllAndOverride: jest.fn(() => ['system:admin:create']) };
    const service = { getPermissionCodes: jest.fn().mockResolvedValue(['system:role:list']) };
    const guard = new PermissionsGuard(reflector as any, service as any);
    await expect(guard.canActivate(makeContext({ isSuper: false, adminId: 2 }, []))).rejects.toThrow(
      new BusinessException('无权限', 40300),
    );
  });
});
