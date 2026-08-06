import request from './request';

export const systemApi = {
  adminPage: (page: number, pageSize: number) => request.get('/system/admins', { params: { page, pageSize } }),
  createAdmin: (data: any) => request.post('/system/admins', data),
  assignRoles: (id: number, roleIds: number[]) => request.put(`/system/admins/${id}/roles`, { roleIds }),
  toggleStatus: (id: number) => request.put(`/system/admins/${id}/status`),
  deleteAdmin: (id: number) => request.delete(`/system/admins/${id}`),

  rolePage: (page: number, pageSize: number) => request.get('/system/roles', { params: { page, pageSize } }),
  createRole: (data: any) => request.post('/system/roles', data),
  updateRole: (id: number, data: any) => request.put(`/system/roles/${id}`, data),
  assignMenus: (id: number, menuIds: number[]) => request.put(`/system/roles/${id}/menus`, { menuIds }),
  deleteRole: (id: number) => request.delete(`/system/roles/${id}`),

  menuPage: (page: number, pageSize: number) => request.get('/system/menus', { params: { page, pageSize } }),
  createMenu: (data: any) => request.post('/system/menus', data),
  updateMenu: (id: number, data: any) => request.put(`/system/menus/${id}`, data),
  deleteMenu: (id: number) => request.delete(`/system/menus/${id}`),
};
