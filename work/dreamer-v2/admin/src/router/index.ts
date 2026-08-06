import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue'), meta: { public: true } },
  { path: '/', component: () => import('../layout/Layout.vue'), children: [
    { path: '', redirect: '/dashboard' },
    { path: 'dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue') },
    { path: 'system/admin', name: 'SystemAdmin', component: () => import('../views/system/AdminList.vue') },
    { path: 'system/role', name: 'SystemRole', component: () => import('../views/system/RoleList.vue') },
    { path: 'system/menu', name: 'SystemMenu', component: () => import('../views/system/MenuList.vue') },
  ]},
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach(async (to) => {
  const store = useAuthStore();
  if (to.meta.public) return true;
  if (!store.token) return { path: '/login' };
  if (!store.menus.length) await store.loadMenus();
  return true;
});

export default router;
