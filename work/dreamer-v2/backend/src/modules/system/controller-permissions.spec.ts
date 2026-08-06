import 'reflect-metadata';
import { RoleController } from './role.controller';
import { MenuController } from './menu.controller';
import { AdminController } from './admin.controller';
import { PERMISSIONS_KEY } from './permissions.decorator';

describe('system write endpoints permission metadata', () => {
  const roleController = new RoleController({} as any);
  const menuController = new MenuController({} as any);
  const adminController = new AdminController({} as any);

  it('guards role create/update/delete with system:role permission codes', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, roleController.create)).toEqual(['system:role:create']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, roleController.update)).toEqual(['system:role:update']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, roleController.remove)).toEqual(['system:role:delete']);
  });

  it('guards role list endpoints with system:role:list', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, roleController.page)).toEqual(['system:role:list']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, roleController.findOne)).toEqual(['system:role:list']);
  });

  it('guards menu create/update/delete with system:menu permission codes', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, menuController.create)).toEqual(['system:menu:create']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, menuController.update)).toEqual(['system:menu:update']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, menuController.remove)).toEqual(['system:menu:delete']);
  });

  it('guards menu list endpoints with system:menu:list', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, menuController.page)).toEqual(['system:menu:list']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, menuController.findOne)).toEqual(['system:menu:list']);
  });

  it('guards admin status toggle with a dedicated permission code', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, adminController.toggleStatus)).toEqual(['system:admin:toggle-status']);
  });
});
