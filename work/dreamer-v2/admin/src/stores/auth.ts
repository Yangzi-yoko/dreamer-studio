import { defineStore } from 'pinia';
import { authApi, LoginResult } from '../api/auth';

interface MenuItem {
  id: number;
  parentId?: number;
  title: string;
  path?: string;
  icon?: string;
  type: string;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    admin: null as LoginResult['admin'] | null,
    menus: [] as MenuItem[],
  }),
  actions: {
    async login(username: string, password: string) {
      const result = await authApi.login(username, password);
      this.token = result.accessToken;
      this.admin = result.admin;
      localStorage.setItem('token', result.accessToken);
      this.menus = (await authApi.fetchMenus()) as MenuItem[];
    },
    async loadMenus() {
      this.menus = (await authApi.fetchMenus()) as MenuItem[];
    },
    logout() {
      this.token = '';
      this.admin = null;
      this.menus = [];
      localStorage.removeItem('token');
    },
  },
});
