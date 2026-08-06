import { defineStore } from 'pinia';
import { api } from '../api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('member_token') || '',
    member: null as { id: number; phone: string; username: string; nickname?: string } | null,
  }),
  actions: {
    async login(username: string, password: string) {
      const res = await api.login(username, password);
      this.token = res.accessToken;
      this.member = res.member;
      localStorage.setItem('member_token', res.accessToken);
      localStorage.setItem('member_id', String(res.member.id));
      localStorage.setItem('member_phone', res.member.phone);
      localStorage.setItem('member_username', res.member.username);
    },
    async register(phone: string, username: string, password: string, nickname: string) {
      const res = await api.register(phone, username, password, nickname);
      this.token = res.accessToken;
      this.member = res.member;
      localStorage.setItem('member_token', res.accessToken);
      localStorage.setItem('member_id', String(res.member.id));
      localStorage.setItem('member_phone', res.member.phone);
      localStorage.setItem('member_username', res.member.username);
    },
    logout() {
      this.token = '';
      this.member = null;
      localStorage.removeItem('member_token');
      localStorage.removeItem('member_id');
      localStorage.removeItem('member_phone');
      localStorage.removeItem('member_username');
    },
  },
});
