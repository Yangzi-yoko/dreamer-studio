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
