import request from './request';

export const dashboardApi = {
  panelData: () => request.get('/dashboard/panel-data'),
  lineData: (type: string) => request.get(`/dashboard/line-data/${type}`),
  radarData: () => request.get('/dashboard/radar-data'),
  pieData: () => request.get('/dashboard/pie-data'),
  barData: () => request.get('/dashboard/bar-data'),
  transactions: () => request.get('/dashboard/transactions'),
};