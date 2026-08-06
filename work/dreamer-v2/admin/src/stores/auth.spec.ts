import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from './auth';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../api/auth', () => ({
  authApi: {
    login: vi.fn().mockResolvedValue({ accessToken: 't1', admin: { id: 1, username: 'admin', nickname: '超管', isSuper: true } }),
    fetchMenus: vi.fn().mockResolvedValue([]),
  },
}));

describe('auth store', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('stores token and admin after login', async () => {
    const store = useAuthStore();
    await store.login('admin', 'admin123');
    expect(store.token).toBe('t1');
    expect(store.admin?.isSuper).toBe(true);
  });
});
