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
    { path: 'member/members', name: 'MemberList', component: () => import('../views/member/MemberList.vue') },
    { path: 'member/levels', name: 'LevelManage', component: () => import('../views/member/LevelManage.vue') },
    { path: 'member/tags', name: 'TagManage', component: () => import('../views/member/TagManage.vue') },
    { path: 'member/assets', name: 'PointsWallet', component: () => import('../views/member/PointsWallet.vue') },
    { path: 'member/packages', name: 'PackageManage', component: () => import('../views/member/PackageManage.vue') },
    { path: 'member/coupons', name: 'CouponManage', component: () => import('../views/member/CouponManage.vue') },
    { path: 'member/signin', name: 'SigninManage', component: () => import('../views/member/SigninManage.vue') },
    { path: 'member/birthday', name: 'BirthdayGift', component: () => import('../views/member/BirthdayGift.vue') },
    { path: 'member/referral', name: 'ReferralManage', component: () => import('../views/member/ReferralManage.vue') },
    { path: 'member/activities', name: 'ActivityManage', component: () => import('../views/member/ActivityManage.vue') },
    { path: 'member/:id', name: 'MemberDetail', component: () => import('../views/member/MemberDetail.vue') },
  ]},
];

const router = createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes });

router.beforeEach(async (to) => {
  const store = useAuthStore();
  if (to.meta.public) return true;
  if (!store.token) return { path: '/login' };
  if (!store.menus.length) await store.loadMenus();
  return true;
});

export default router;
