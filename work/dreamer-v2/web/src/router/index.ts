import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'Login', component: () => import('../views/Login.vue'), meta: { public: true } },
    { path: '/register', name: 'Register', component: () => import('../views/Register.vue'), meta: { public: true } },
    { path: '/', component: () => import('../views/Layout.vue'), children: [
      { path: '', redirect: '/home' },
      { path: 'home', name: 'Home', component: () => import('../views/Home.vue') },
      { path: 'studios', name: 'StudioList', component: () => import('../views/studios/StudioList.vue') },
      { path: 'studio/:id', name: 'StudioDetail', component: () => import('../views/studios/StudioDetail.vue') },
      { path: 'booking/:studioId', name: 'Booking', component: () => import('../views/studios/Booking.vue') },
      { path: 'orders', name: 'Orders', component: () => import('../views/orders/Orders.vue') },
      { path: 'items', name: 'ItemList', component: () => import('../views/items/ItemList.vue') },
      { path: 'item/:id', name: 'ItemDetail', component: () => import('../views/items/ItemDetail.vue') },
      { path: 'item-rental/:itemId', name: 'ItemRent', component: () => import('../views/items/ItemRent.vue') },
      { path: 'rentals', name: 'Rentals', component: () => import('../views/rentals/Rentals.vue') },
      { path: 'activities', name: 'ActivityList', component: () => import('../views/activities/ActivityList.vue') },
      { path: 'activity/:id', name: 'ActivityDetail', component: () => import('../views/activities/ActivityDetail.vue') },
      { path: 'member', name: 'MemberCenter', component: () => import('../views/member/MemberCenter.vue') },
      { path: 'member/referral', name: 'ReferralCenter', component: () => import('../views/member/ReferralCenter.vue') },
      { path: 'member/signin', name: 'Signin', component: () => import('../views/member/Signin.vue') },
      { path: 'member/points', name: 'Points', component: () => import('../views/member/Points.vue') },
      { path: 'member/wallet', name: 'Wallet', component: () => import('../views/member/Wallet.vue') },
      { path: 'member/packages', name: 'Packages', component: () => import('../views/member/Packages.vue') },
      { path: 'member/points-mall', name: 'PointsMall', component: () => import('../views/member/PointsMall.vue') },
      { path: 'member/points-mall/:id', name: 'PointsMallDetail', component: () => import('../views/member/PointsMallDetail.vue') },
      { path: 'member/points-orders', name: 'PointsMallOrders', component: () => import('../views/member/PointsOrders.vue') },
    ]},
  ],
});

router.beforeEach((to) => {
  const store = useAuthStore();
  if (to.meta.public) return true;
  if (!store.token) return { path: '/login' };
  return true;
});

export default router;