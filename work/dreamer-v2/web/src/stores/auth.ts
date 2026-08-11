import { defineStore } from 'pinia';
import { api } from '../api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: sessionStorage.getItem('member_token') || '',
    member: null as { id: number; phone: string; username: string; nickname?: string } | null,
  }),
  actions: {
    async login(username: string, password: string) {
      const res = await api.login(username, password);
      this.token = res.accessToken;
      this.member = res.member;
      sessionStorage.setItem('member_token', res.accessToken);
      sessionStorage.setItem('member_id', String(res.member.id));
      sessionStorage.setItem('member_phone', res.member.phone);
      sessionStorage.setItem('member_username', res.member.username);
    },
    async register(phone: string, username: string, password: string, nickname: string, inviteCode?: string) {
      const res = await api.register(phone, username, password, nickname, inviteCode);
      this.token = res.accessToken;
      this.member = res.member;
      sessionStorage.setItem('member_token', res.accessToken);
      sessionStorage.setItem('member_id', String(res.member.id));
      sessionStorage.setItem('member_phone', res.member.phone);
      sessionStorage.setItem('member_username', res.member.username);
    },
    logout() {
      this.token = '';
      this.member = null;
      sessionStorage.removeItem('member_token');
      sessionStorage.removeItem('member_id');
      sessionStorage.removeItem('member_phone');
      sessionStorage.removeItem('member_username');
    },
  },
});