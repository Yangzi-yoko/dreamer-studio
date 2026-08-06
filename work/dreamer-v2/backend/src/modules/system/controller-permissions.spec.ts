import 'reflect-metadata';
import { RoleController } from './role.controller';
import { MenuController } from './menu.controller';
import { PERMISSIONS_KEY } from './permissions.decorator';

describe('system write endpoints permission metadata', () => {
  const roleController = new RoleController({} as any);
  const menuController = new MenuController({} as any);

  it('guards role create/update/delete with system:role permission codes', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, roleController.create)).toEqual(['system:role:create']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, roleController.update)).toEqual(['system:role:update']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, roleController.remove)).toEqual(['system:role:delete']);
  });

  it('guards menu create/update/delete with system:menu permission codes', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, menuController.create)).toEqual(['system:menu:create']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, menuController.update)).toEqual(['system:menu:update']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, menuController.remove)).toEqual(['system:menu:delete']);
  });
});
