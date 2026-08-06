import request from './request';

export interface LoginResult {
  accessToken: string;
  admin: { id: number; username: string; nickname: string; isSuper: boolean };
}

export const authApi = {
  login: (username: string, password: string) =>
    request.post<LoginResult, LoginResult>('/auth/login', { username, password }),
  fetchMenus: () => request.get<any, any[]>('/auth/menus'),
};
