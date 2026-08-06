import request from './request';

export const memberApi = {
  memberPage: (page: number, pageSize: number) => request.get<any, any>('/member/members', { params: { page, pageSize } }),
  createMember: (data: any) => request.post<any, any>('/member/members', data),
  updateMember: (id: number, data: any) => request.put<any, any>(`/member/members/${id}`, data),

  levelPage: (page: number, pageSize: number) => request.get<any, any>('/member/levels', { params: { page, pageSize } }),
  createLevel: (data: any) => request.post<any, any>('/member/levels', data),
  updateLevel: (id: number, data: any) => request.put<any, any>(`/member/levels/${id}`, data),
  deleteLevel: (id: number) => request.delete<any, any>(`/member/levels/${id}`),

  tagPage: (page: number, pageSize: number) => request.get<any, any>('/member/tags', { params: { page, pageSize } }),
  createTag: (data: any) => request.post<any, any>('/member/tags', data),
  updateTag: (id: number, data: any) => request.put<any, any>(`/member/tags/${id}`, data),
  deleteTag: (id: number) => request.delete<any, any>(`/member/tags/${id}`),
};
