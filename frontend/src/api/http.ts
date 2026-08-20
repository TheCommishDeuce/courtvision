import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: { 'X-CourtVision-Client': 'dashboard' },
});

export const get = <T,>(path: string, params?: object): Promise<T> =>
  api.get<T>(path, { params }).then(r => r.data);
