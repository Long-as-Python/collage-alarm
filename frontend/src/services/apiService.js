import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const authService = {
  adminLogin: (password) => axios.post(`${API_BASE}/auth/admin-login`, { password }),
};

export const alarmService = {
  getConfig: () => axios.get(`${API_BASE}/alarms/config`),
  setConfig: (config) => axios.post(`${API_BASE}/alarms/config`, config),
  setScheduleType: (scheduleType) => axios.post(`${API_BASE}/alarms/schedule-type`, { scheduleType }),
  getCurrentTime: () => axios.get(`${API_BASE}/alarms/current`)
};