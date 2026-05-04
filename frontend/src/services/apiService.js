import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export const authService = {
  adminLogin: (password) => axios.post(`${API_BASE}/auth/admin-login`, { password }),
};

export const alarmService = {
  getConfig: () => axios.get(`${API_BASE}/alarms/config`),
  getSounds: () => axios.get(`${API_BASE}/alarms/sounds`),
  triggerFireAlarm: () => axios.post(`${API_BASE}/alarms/fire`),
  setConfig: (config) => axios.post(`${API_BASE}/alarms/config`, config),
  setScheduleType: (scheduleType) => axios.post(`${API_BASE}/alarms/schedule-type`, { scheduleType }),
  getCurrentTime: () => axios.get(`${API_BASE}/alarms/current`),
  getCurrentSchedule: () => axios.get(`${API_BASE}/schedule/current`),
  getAllSchedules: () => axios.get(`${API_BASE}/schedule/all`)
};
