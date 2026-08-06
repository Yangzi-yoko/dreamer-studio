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
