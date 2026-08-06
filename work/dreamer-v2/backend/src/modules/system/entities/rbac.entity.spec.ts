import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { AdminUser } from './admin-user.entity';
import { Role } from './role.entity';
import { Menu } from './menu.entity';

describe('RBAC entities', () => {
  it('exposes required columns on AdminUser', () => {
    const columns = getMetadataArgsStorage().columns.filter((c) => c.target === AdminUser);
    const names = columns.map((c) => c.propertyName);
    expect(names).toEqual(expect.arrayContaining(['id', 'username', 'passwordHash', 'nickname', 'isSuper', 'status']));
  });

  it('defines admin-role and role-menu join tables', () => {
    const joins = getMetadataArgsStorage().joinTables.map((j) => j.name);
    expect(joins).toEqual(expect.arrayContaining(['admin_role', 'role_menu']));
  });
});
