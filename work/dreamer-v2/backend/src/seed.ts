import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AdminUser } from './modules/system/entities/admin-user.entity';
import { Role } from './modules/system/entities/role.entity';
import { Menu } from './modules/system/entities/menu.entity';
import configuration from './config/configuration';

async function seed(): Promise<void> {
  const db = configuration().database as any;
  const dataSource = new DataSource({
    type: 'mysql',
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    entities: [AdminUser, Role, Menu],
    synchronize: true,
    charset: 'utf8mb4',
  });
  await dataSource.initialize();

  const menuRepo = dataSource.getRepository(Menu);
  interface MenuDef {
    key: string;
    title: string;
    path?: string;
    type: 'dir' | 'menu' | 'button';
    permissionCode: string;
    sort: number;
    parent?: string;
  }

  const menuDefs: MenuDef[] = [
    { key: 'dashboard', title: '仪表盘', path: '/dashboard', type: 'menu', permissionCode: 'dashboard', sort: 1 },
    { key: 'member', title: '会员管理', path: '/member', type: 'dir', permissionCode: 'member', sort: 10 },
    { key: 'rental', title: '租赁管理', path: '/rental', type: 'dir', permissionCode: 'rental', sort: 20 },
    { key: 'system', title: '系统管理', path: '/system', type: 'dir', permissionCode: 'system', sort: 99 },
    { key: 'system-admin', title: '管理员管理', path: '/system/admin', type: 'menu', permissionCode: 'system:admin:list', sort: 1, parent: 'system' },
    { key: 'system-admin-create', title: '新增管理员', type: 'button', permissionCode: 'system:admin:create', sort: 1, parent: 'system' },
    { key: 'system-admin-assign-role', title: '分配角色', type: 'button', permissionCode: 'system:admin:assign-role', sort: 2, parent: 'system' },
    { key: 'system-admin-delete', title: '删除管理员', type: 'button', permissionCode: 'system:admin:delete', sort: 3, parent: 'system' },
    { key: 'system-role', title: '角色管理', path: '/system/role', type: 'menu', permissionCode: 'system:role:list', sort: 2, parent: 'system' },
    { key: 'system-role-assign-menu', title: '角色授权', type: 'button', permissionCode: 'system:role:assign-menu', sort: 1, parent: 'system' },
    { key: 'system-role-create', title: '新增角色', type: 'button', permissionCode: 'system:role:create', sort: 2, parent: 'system' },
    { key: 'system-role-update', title: '编辑角色', type: 'button', permissionCode: 'system:role:update', sort: 3, parent: 'system' },
    { key: 'system-role-delete', title: '删除角色', type: 'button', permissionCode: 'system:role:delete', sort: 4, parent: 'system' },
    { key: 'system-menu', title: '菜单管理', path: '/system/menu', type: 'menu', permissionCode: 'system:menu:list', sort: 3, parent: 'system' },
    { key: 'system-menu-create', title: '新增菜单', type: 'button', permissionCode: 'system:menu:create', sort: 4, parent: 'system' },
    { key: 'system-menu-update', title: '编辑菜单', type: 'button', permissionCode: 'system:menu:update', sort: 5, parent: 'system' },
    { key: 'system-menu-delete', title: '删除菜单', type: 'button', permissionCode: 'system:menu:delete', sort: 6, parent: 'system' },
  ];

  const saved: Menu[] = [];
  for (const def of menuDefs) {
    const parent = def.parent ? saved.find((m) => (m as any).key === def.parent) : undefined;
    const menu = menuRepo.create({
      title: def.title,
      path: def.path || undefined,
      type: def.type as any,
      permissionCode: def.permissionCode,
      sort: def.sort,
      parentId: parent?.id,
    });
    (menu as any).key = def.key;
    saved.push(await menuRepo.save(menu));
  }

  const roleRepo = dataSource.getRepository(Role);
  const role = await roleRepo.save(roleRepo.create({ code: 'superadmin', name: '超级管理员', description: '全部权限', menus: saved }));

  const adminRepo = dataSource.getRepository(AdminUser);
  await adminRepo.save(
    adminRepo.create({
      username: 'admin',
      passwordHash: bcrypt.hashSync('admin123', 10),
      nickname: '超级管理员',
      isSuper: true,
      roles: [role],
    }),
  );

  console.log('Seed done: admin/admin123');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
