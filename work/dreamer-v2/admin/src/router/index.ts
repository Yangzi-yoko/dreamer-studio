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
    { path: 'rental/studios', name: 'StudioList', component: () => import('../views/rental/StudioList.vue') },
    { path: 'rental/studio/:id', name: 'StudioForm', component: () => import('../views/rental/StudioForm.vue') },
    { path: 'rental/studio/:id/slots', name: 'TimeSlotManage', component: () => import('../views/rental/TimeSlotManage.vue') },
    { path: 'rental/bookings', name: 'BookingList', component: () => import('../views/rental/BookingList.vue') },
    { path: 'rental/calendar', name: 'BookingCalendar', component: () => import('../views/rental/BookingCalendar.vue') },
    { path: 'rental/items', name: 'ItemList', component: () => import('../views/rental/ItemList.vue') },
    { path: 'rental/item/:id', name: 'ItemForm', component: () => import('../views/rental/ItemForm.vue') },
    { path: 'rental/item-rentals', name: 'ItemRentalList', component: () => import('../views/rental/ItemRentalList.vue') },
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
