import request from './request';

export const dashboardApi = {
  stats: () => request.get('/dashboard/stats'),
};