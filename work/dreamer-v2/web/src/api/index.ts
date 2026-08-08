import request from './request';

export const api = {
  register: (phone: string, username: string, password: string, nickname: string) =>
    request.post<any, any>('/member-auth/register', { phone, username, password, nickname }),
  login: (username: string, password: string) =>
    request.post<any, any>('/member-auth/login', { username, password }),
  me: () => request.get<any, any>('/member-auth/me'),

  studios: (page = 1, pageSize = 20) => request.get<any, any>('/rental/studios', { params: { page, pageSize } }),
  studioTimeSlots: (studioId: number) => request.get<any, any>(`/rental/studios/${studioId}/time-slots`),
  bookingPreview: (data: any) => request.post<any, any>('/rental/bookings/preview', data),
  createBooking: (data: any) => request.post<any, any>('/rental/bookings', data),
  myBookings: (phone: string) => request.get<any, any>('/rental/bookings/my', { params: { phone } }),

  items: (page = 1, pageSize = 20) => request.get<any, any>('/rental/items', { params: { page, pageSize } }),
  createItemRental: (data: any) => request.post<any, any>('/rental/item-rentals', data),
  myItemRentals: (phone: string) => request.get<any, any>('/rental/item-rentals/my', { params: { phone } }),

  activities: (page = 1, pageSize = 20) => request.get<any, any>('/member/activities', { params: { page, pageSize } }),
  registerActivity: (id: number, memberId: number) => request.post<any, any>(`/member/activities/${id}/register`, { memberId }),

  memberPoints: () => request.get<any, any>('/member/points/me'),
  memberWallet: () => request.get<any, any>('/member/wallet/me'),
  memberWalletRecharge: (amountYuan: number, remark?: string) => request.post<any, any>('/member/wallet/me/recharge', { amountYuan, remark }),
  packageMall: () => request.get<any, any>('/member/packages/mall'),
  packageMallBuy: (packageId: number) => request.post<any, any>(`/member/packages/mall/${packageId}/buy`, {}),
  myPackages: () => request.get<any, any>('/member/packages/mine'),
  couponCards: () => request.get<any, any>('/member/coupons/mine/cards'),
  myCoupons: () => request.get<any, any>('/member/coupons/mine'),
  referralCode: (memberId: number) => request.get<any, any>(`/member/referral/code/${memberId}`),
};
