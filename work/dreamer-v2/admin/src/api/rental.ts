import request from './request';

export const rentalApi = {
  studioPage: (page: number, pageSize: number) => request.get<any, any>('/rental/studios', { params: { page, pageSize } }),
  createStudio: (data: any) => request.post<any, any>('/rental/studios', data),
  updateStudio: (id: number, data: any) => request.put<any, any>(`/rental/studios/${id}`, data),
  deleteStudio: (id: number) => request.delete<any, any>(`/rental/studios/${id}`),

  listTimeSlots: (studioId: number) => request.get<any, any[]>(`/rental/studios/${studioId}/time-slots`),
  saveTimeSlots: (studioId: number, slots: any[]) => request.put<any, any>(`/rental/studios/${studioId}/time-slots`, { slots }),

  bookingPage: (params: any) => request.get<any, any>('/rental/bookings', { params }),
  bookingAction: (id: number, action: string) => request.post<any, any>(`/rental/bookings/${id}/${action}`),
  calendar: (studioId: number, month: string) => request.get<any, any[]>(`/rental/studios/${studioId}/calendar`, { params: { month } }),
};
