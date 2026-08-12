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
    { key: 'member-members', title: '会员管理', path: '/member/members', type: 'menu', permissionCode: 'member:list', sort: 1, parent: 'member' },
    { key: 'member-create', title: '新增会员', type: 'button', permissionCode: 'member:create', sort: 1, parent: 'member' },
    { key: 'member-update', title: '编辑会员', type: 'button', permissionCode: 'member:update', sort: 2, parent: 'member' },
    { key: 'member-levels', title: '等级配置', path: '/member/levels', type: 'menu', permissionCode: 'member:level:list', sort: 2, parent: 'member' },
    { key: 'member-level-create', title: '新增等级', type: 'button', permissionCode: 'member:level:create', sort: 1, parent: 'member' },
    { key: 'member-level-update', title: '编辑等级', type: 'button', permissionCode: 'member:level:update', sort: 2, parent: 'member' },
    { key: 'member-level-delete', title: '删除等级', type: 'button', permissionCode: 'member:level:delete', sort: 3, parent: 'member' },
    { key: 'member-tags', title: '标签管理', path: '/member/tags', type: 'menu', permissionCode: 'member:tag:list', sort: 3, parent: 'member' },
    { key: 'member-tag-create', title: '新增标签', type: 'button', permissionCode: 'member:tag:create', sort: 1, parent: 'member' },
    { key: 'member-tag-update', title: '编辑标签', type: 'button', permissionCode: 'member:tag:update', sort: 2, parent: 'member' },
    { key: 'member-tag-delete', title: '删除标签', type: 'button', permissionCode: 'member:tag:delete', sort: 3, parent: 'member' },
    { key: 'member-assets', title: '积分储值', path: '/member/assets', type: 'menu', permissionCode: 'member:points:list', sort: 4, parent: 'member' },
    { key: 'member-wallet', title: '储值查询', type: 'button', permissionCode: 'member:wallet:list', sort: 1, parent: 'member' },
    { key: 'member-packages', title: '计时卡管理', path: '/member/packages', type: 'menu', permissionCode: 'member:package:list', sort: 5, parent: 'member' },
    { key: 'member-package-create', title: '新增计时卡', type: 'button', permissionCode: 'member:package:create', sort: 1, parent: 'member' },
    { key: 'member-package-update', title: '编辑计时卡', type: 'button', permissionCode: 'member:package:update', sort: 2, parent: 'member' },
    { key: 'member-package-delete', title: '删除计时卡', type: 'button', permissionCode: 'member:package:delete', sort: 3, parent: 'member' },
    { key: 'member-coupons', title: '优惠券管理', path: '/member/coupons', type: 'menu', permissionCode: 'member:coupon:list', sort: 6, parent: 'member' },
    { key: 'member-coupon-create', title: '新增优惠券', type: 'button', permissionCode: 'member:coupon:create', sort: 1, parent: 'member' },
    { key: 'member-coupon-update', title: '编辑优惠券', type: 'button', permissionCode: 'member:coupon:update', sort: 2, parent: 'member' },
    { key: 'member-coupon-delete', title: '删除优惠券', type: 'button', permissionCode: 'member:coupon:delete', sort: 3, parent: 'member' },
    { key: 'member-coupon-issue', title: '发券', type: 'button', permissionCode: 'member:coupon:issue', sort: 4, parent: 'member' },
    { key: 'member-signin', title: '签到管理', path: '/member/signin', type: 'menu', permissionCode: 'member:signin:list', sort: 7, parent: 'member' },
    { key: 'member-birthday', title: '生日礼遇', path: '/member/birthday', type: 'menu', permissionCode: 'member:birthday:list', sort: 8, parent: 'member' },
    { key: 'member-birthday-update', title: '配置生日礼遇', type: 'button', permissionCode: 'member:birthday:update', sort: 1, parent: 'member' },
    { key: 'member-referral', title: '推荐返利', path: '/member/referral', type: 'menu', permissionCode: 'member:referral:rule', sort: 9, parent: 'member' },
    { key: 'member-referral-list', title: '返利流水', type: 'button', permissionCode: 'member:referral:list', sort: 1, parent: 'member' },
    { key: 'member-activities', title: '营销活动', path: '/member/activities', type: 'menu', permissionCode: 'member:activity:list', sort: 10, parent: 'member' },
    { key: 'member-activity-create', title: '新增活动', type: 'button', permissionCode: 'member:activity:create', sort: 1, parent: 'member' },
    { key: 'member-activity-update', title: '编辑活动', type: 'button', permissionCode: 'member:activity:update', sort: 2, parent: 'member' },
    { key: 'rental', title: '租赁管理', path: '/rental', type: 'dir', permissionCode: 'rental', sort: 20 },
    { key: 'rental-studio', title: '场地管理', path: '/rental/studios', type: 'menu', permissionCode: 'rental:studio:list', sort: 1, parent: 'rental' },
    { key: 'rental-studio-create', title: '新增场地', type: 'button', permissionCode: 'rental:studio:create', sort: 1, parent: 'rental' },
    { key: 'rental-studio-update', title: '编辑场地', type: 'button', permissionCode: 'rental:studio:update', sort: 2, parent: 'rental' },
    { key: 'rental-studio-delete', title: '删除场地', type: 'button', permissionCode: 'rental:studio:delete', sort: 3, parent: 'rental' },
    { key: 'rental-booking', title: '订单管理', path: '/rental/bookings', type: 'menu', permissionCode: 'rental:booking:list', sort: 2, parent: 'rental' },
    { key: 'rental-booking-check', title: '核销/支付', type: 'button', permissionCode: 'rental:booking:check', sort: 1, parent: 'rental' },
    { key: 'rental-booking-cancel', title: '取消订单', type: 'button', permissionCode: 'rental:booking:cancel', sort: 2, parent: 'rental' },
    { key: 'rental-booking-refund', title: '退款', type: 'button', permissionCode: 'rental:booking:refund', sort: 3, parent: 'rental' },
    { key: 'rental-calendar', title: '档期日历', path: '/rental/calendar', type: 'menu', permissionCode: 'rental:calendar:list', sort: 3, parent: 'rental' },
    { key: 'rental-item', title: '器材/服装管理', path: '/rental/items', type: 'menu', permissionCode: 'rental:item:list', sort: 4, parent: 'rental' },
    { key: 'rental-item-create', title: '新增商品', type: 'button', permissionCode: 'rental:item:create', sort: 1, parent: 'rental' },
    { key: 'rental-item-update', title: '编辑商品', type: 'button', permissionCode: 'rental:item:update', sort: 2, parent: 'rental' },
    { key: 'rental-item-delete', title: '删除商品', type: 'button', permissionCode: 'rental:item:delete', sort: 3, parent: 'rental' },
    { key: 'rental-item-rental', title: '器材/服装订单', path: '/rental/item-rentals', type: 'menu', permissionCode: 'rental:item-rental:list', sort: 5, parent: 'rental' },
    { key: 'rental-item-rental-check', title: '支付/领取/完成', type: 'button', permissionCode: 'rental:item-rental:check', sort: 1, parent: 'rental' },
    { key: 'rental-item-rental-return', title: '归还登记', type: 'button', permissionCode: 'rental:item-rental:return', sort: 2, parent: 'rental' },
    { key: 'rental-item-rental-extend', title: '续租', type: 'button', permissionCode: 'rental:item-rental:extend', sort: 3, parent: 'rental' },
    { key: 'rental-item-rental-cancel', title: '取消订单', type: 'button', permissionCode: 'rental:item-rental:cancel', sort: 4, parent: 'rental' },
    { key: 'rental-item-rental-refund', title: '退款', type: 'button', permissionCode: 'rental:item-rental:refund', sort: 5, parent: 'rental' },
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
