import request from './request';

export const api = {
  register: (phone: string, username: string, password: string, nickname: string) =>
    request.post<any, any>('/member-auth/register', { phone, username, password, nickname }),
  login: (username: string, password: string) =>
    request.post<any, any>('/member-auth/login', { username, password }),
  me: () => request.get<any, any>('/member-auth/me'),

  studios: (page = 1, pageSize = 20) => request.get<any, any>('/rental/studios', { params: { page, pageSize } }),
  studioTimeSlots: (studioId: number) => request.get<any, any>(`/rental/studios/${studioId}/time-slots`),
  createBooking: (data: any) => request.post<any, any>('/rental/bookings', data),
  myBookings: (phone: string) => request.get<any, any>('/rental/bookings/my', { params: { phone } }),

  items: (page = 1, pageSize = 20) => request.get<any, any>('/rental/items', { params: { page, pageSize } }),
  createItemRental: (data: any) => request.post<any, any>('/rental/item-rentals', data),
  myItemRentals: (phone: string) => request.get<any, any>('/rental/item-rentals/my', { params: { phone } }),

  activities: (page = 1, pageSize = 20) => request.get<any, any>('/member/activities', { params: { page, pageSize } }),
  registerActivity: (id: number, memberId: number) => request.post<any, any>(`/member/activities/${id}/register`, { memberId }),

  memberPoints: (memberId: number) => request.get<any, any>(`/member/points/${memberId}`),
  memberWallet: (memberId: number) => request.get<any, any>(`/member/wallet/${memberId}`),
  myPackages: (memberId: number) => request.get<any, any>('/member/packages/users', { params: { memberId } }),
  myCoupons: (memberId: number) => request.get<any, any>('/member/coupons/users', { params: { memberId } }),
  referralCode: (memberId: number) => request.get<any, any>(`/member/referral/code/${memberId}`),
};
