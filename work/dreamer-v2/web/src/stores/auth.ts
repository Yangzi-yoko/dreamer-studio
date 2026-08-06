import { defineStore } from 'pinia';
import { api } from '../api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('member_token') || '',
    member: null as { id: number; phone: string; nickname?: string } | null,
  }),
  actions: {
    async login(phone: string) {
      const res = await api.login(phone);
      this.token = res.accessToken;
      this.member = res.member;
      localStorage.setItem('member_token', res.accessToken);
      localStorage.setItem('member_id', String(res.member.id));
      localStorage.setItem('member_phone', res.member.phone);
    },
    async register(phone: string, nickname: string) {
      const res = await api.register(phone, nickname);
      this.token = res.accessToken;
      this.member = res.member;
      localStorage.setItem('member_token', res.accessToken);
      localStorage.setItem('member_id', String(res.member.id));
      localStorage.setItem('member_phone', res.member.phone);
    },
    logout() {
      this.token = '';
      this.member = null;
      localStorage.removeItem('member_token');
      localStorage.removeItem('member_id');
      localStorage.removeItem('member_phone');
    },
  },
});
