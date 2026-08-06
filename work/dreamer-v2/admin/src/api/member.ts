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

  pointsDetail: (memberId: number, page = 1, pageSize = 10) => request.get<any, any>(`/member/points/${memberId}`, { params: { page, pageSize } }),
  pointsEarn: (memberId: number, data: any) => request.post<any, any>(`/member/points/${memberId}/earn`, data),
  pointsSpend: (memberId: number, data: any) => request.post<any, any>(`/member/points/${memberId}/spend`, data),

  walletDetail: (memberId: number, page = 1, pageSize = 10) => request.get<any, any>(`/member/wallet/${memberId}`, { params: { page, pageSize } }),
  walletRecharge: (memberId: number, data: any) => request.post<any, any>(`/member/wallet/${memberId}/recharge`, data),
  walletDeduct: (memberId: number, data: any) => request.post<any, any>(`/member/wallet/${memberId}/deduct`, data),
  walletRefund: (memberId: number, data: any) => request.post<any, any>(`/member/wallet/${memberId}/refund`, data),

  packagePage: (page: number, pageSize: number) => request.get<any, any>('/member/packages', { params: { page, pageSize } }),
  createPackage: (data: any) => request.post<any, any>('/member/packages', data),
  updatePackage: (id: number, data: any) => request.put<any, any>(`/member/packages/${id}`, data),
  deletePackage: (id: number) => request.delete<any, any>(`/member/packages/${id}`),
  packageBuy: (packageId: number, data: any) => request.post<any, any>(`/member/packages/${packageId}/buy`, data),
  packageUsers: (memberId: number) => request.get<any, any>('/member/packages/users', { params: { memberId } }),
  packageUse: (userPackageId: number, data: any) => request.post<any, any>(`/member/packages/users/${userPackageId}/use`, data),

  couponPage: (page: number, pageSize: number) => request.get<any, any>('/member/coupons', { params: { page, pageSize } }),
  createCoupon: (data: any) => request.post<any, any>('/member/coupons', data),
  updateCoupon: (id: number, data: any) => request.put<any, any>(`/member/coupons/${id}`, data),
  deleteCoupon: (id: number) => request.delete<any, any>(`/member/coupons/${id}`),
  couponIssue: (couponId: number, data: any) => request.post<any, any>(`/member/coupons/${couponId}/issue`, data),
  couponUsers: (memberId: number) => request.get<any, any>('/member/coupons/users', { params: { memberId } }),
  couponUse: (userCouponId: number, data: any) => request.post<any, any>(`/member/coupons/users/${userCouponId}/use`, data),
};
