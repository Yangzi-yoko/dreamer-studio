import 'reflect-metadata';
import 'dotenv/config';
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
    { key: 'rental-studio', title: '场地管理', path: '/rental/studios', type: 'menu', permissionCode: 'rental:studio:list', sort: 1, parent: 'rental' },
    { key: 'rental-studio-create', title: '新增场地', type: 'button', permissionCode: 'rental:studio:create', sort: 1, parent: 'rental' },
    { key: 'rental-studio-update', title: '编辑场地', type: 'button', permissionCode: 'rental:studio:update', sort: 2, parent: 'rental' },
    { key: 'rental-studio-delete', title: '删除场地', type: 'button', permissionCode: 'rental:studio:delete', sort: 3, parent: 'rental' },
    { key: 'rental-booking', title: '订单管理', path: '/rental/bookings', type: 'menu', permissionCode: 'rental:booking:list', sort: 2, parent: 'rental' },
    { key: 'rental-booking-check', title: '核销/支付', type: 'button', permissionCode: 'rental:booking:check', sort: 1, parent: 'rental' },
    { key: 'rental-booking-cancel', title: '取消订单', type: 'button', permissionCode: 'rental:booking:cancel', sort: 2, parent: 'rental' },
    { key: 'rental-booking-refund', title: '退款', type: 'button', permissionCode: 'rental:booking:refund', sort: 3, parent: 'rental' },
    { key: 'rental-calendar', title: '档期日历', path: '/rental/calendar', type: 'menu', permissionCode: 'rental:booking:list', sort: 3, parent: 'rental' },
    { key: 'system', title: '系统管理', path: '/system', type: 'dir', permissionCode: 'system', sort: 99 },
    { key: 'system-admin', title: '管理员管理', path: '/system/admin', type: 'menu', permissionCode: 'system:admin:list', sort: 1, parent: 'system' },
    { key: 'system-admin-create', title: '新增管理员', type: 'button', permissionCode: 'system:admin:create', sort: 1, parent: 'system' },
    { key: 'system-admin-assign-role', title: '分配角色', type: 'button', permissionCode: 'system:admin:assign-role', sort: 2, parent: 'system' },
    { key: 'system-admin-delete', title: '删除管理员', type: 'button', permissionCode: 'system:admin:delete', sort: 3, parent: 'system' },
    { key: 'system-admin-toggle-status', title: '启用/禁用管理员', type: 'button', permissionCode: 'system:admin:toggle-status', sort: 4, parent: 'system' },
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

  const keyByPermissionCode = new Map(menuDefs.map((d) => [d.permissionCode, d.key]));
  const existingMenus = await menuRepo.find();
  const menuByKey = new Map<string, Menu>();
  for (const menu of existingMenus) {
    const key = menu.permissionCode ? keyByPermissionCode.get(menu.permissionCode) : undefined;
    if (key) menuByKey.set(key, menu);
  }

  const saved: Menu[] = [];
  for (const def of menuDefs) {
    const parent = def.parent ? menuByKey.get(def.parent) : undefined;
    let menu = menuByKey.get(def.key);
    if (!menu) {
      menu = menuRepo.create({
        title: def.title,
        path: def.path || undefined,
        type: def.type as any,
        permissionCode: def.permissionCode,
        sort: def.sort,
        parentId: parent?.id,
      });
    } else {
      menu.title = def.title;
      menu.path = def.path || undefined;
      menu.type = def.type as any;
      menu.permissionCode = def.permissionCode;
      menu.sort = def.sort;
      menu.parentId = parent?.id;
    }
    menuByKey.set(def.key, await menuRepo.save(menu));
    saved.push(menuByKey.get(def.key)!);
  }

  const roleRepo = dataSource.getRepository(Role);
  let role = await roleRepo.findOneBy({ code: 'superadmin' });
  if (role) {
    role.name = '超级管理员';
    role.description = '全部权限';
    role.menus = saved;
    role = await roleRepo.save(role);
  } else {
    role = await roleRepo.save(roleRepo.create({ code: 'superadmin', name: '超级管理员', description: '全部权限', menus: saved }));
  }

  const adminRepo = dataSource.getRepository(AdminUser);
  let admin = await adminRepo.findOneBy({ username: 'admin' });
  if (admin) {
    admin.nickname = '超级管理员';
    admin.isSuper = true;
    admin.roles = [role];
    await adminRepo.save(admin);
  } else {
    await adminRepo.save(
      adminRepo.create({
        username: 'admin',
        passwordHash: bcrypt.hashSync('admin123', 10),
        nickname: '超级管理员',
        isSuper: true,
        roles: [role],
      }),
    );
  }

  console.log('Seed done (idempotent): admin/admin123 on first run; existing admin password preserved');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
