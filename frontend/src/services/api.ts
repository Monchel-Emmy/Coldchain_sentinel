const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('cc_token');
}

// Loading callbacks — wired up by GlobalLoader
let _onStart: (() => void) | null = null;
let _onStop:  (() => void) | null = null;

export function registerLoadingCallbacks(onStart: () => void, onStop: () => void) {
  _onStart = onStart;
  _onStop  = onStop;
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  _onStart?.();
  const token = getToken();
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  } finally {
    _onStop?.();
  }
}

export const api = {
  // Dashboard
  getDashboardStats: () => req('/dashboard/stats'),
  getDashboardFridges: () => req('/dashboard/fridges'),

  // Rooms
  getRooms: (healthCenterId?: string) => req(`/rooms${healthCenterId ? `?healthCenterId=${healthCenterId}` : ''}`),

  // Health Centers
  getHealthCenters: () => req('/health-centers'),
  getHealthCenter: (id: string) => req(`/health-centers/${id}`),
  createHealthCenter: (data: object) => req('/health-centers', { method: 'POST', body: JSON.stringify(data) }),
  updateHealthCenter: (id: string, data: object) => req(`/health-centers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHealthCenter: (id: string) => req(`/health-centers/${id}`, { method: 'DELETE' }),

  // Fridges
  getFridges: (healthCenterId?: string) => req(`/fridges${healthCenterId ? `?healthCenterId=${healthCenterId}` : ''}`),
  getFridge: (id: string) => req(`/fridges/${id}`),
  createFridge: (data: object) => req('/fridges', { method: 'POST', body: JSON.stringify(data) }),
  updateFridge: (id: string, data: object) => req(`/fridges/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFridge: (id: string) => req(`/fridges/${id}`, { method: 'DELETE' }),

  // Devices
  getDevices: (params?: { healthCenterId?: string; fridgeId?: string }) => {
    const q = new URLSearchParams();
    if (params?.healthCenterId) q.set('healthCenterId', params.healthCenterId);
    if (params?.fridgeId) q.set('fridgeId', params.fridgeId);
    return req(`/devices?${q.toString()}`);
  },
  getDevice: (id: string) => req(`/devices/${id}`),
  createDevice: (data: object) => req('/devices', { method: 'POST', body: JSON.stringify(data) }),
  updateDevice: (id: string, data: object) => req(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDevice: (id: string) => req(`/devices/${id}`, { method: 'DELETE' }),
  getDeviceControl: (id: string) => req(`/devices/${id}/control`),
  updateDeviceControl: (id: string, data: object) => req(`/devices/${id}/control`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Vaccines
  getVaccines: (params?: { healthCenterId?: string; fridgeId?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.healthCenterId) q.set('healthCenterId', params.healthCenterId);
    if (params?.fridgeId) q.set('fridgeId', params.fridgeId);
    if (params?.status) q.set('status', params.status);
    return req(`/vaccines?${q.toString()}`);
  },
  getVaccineStats: (healthCenterId?: string) => req(`/vaccines/stats${healthCenterId ? `?healthCenterId=${healthCenterId}` : ''}`),
  createVaccine: (data: object) => req('/vaccines', { method: 'POST', body: JSON.stringify(data) }),
  updateVaccine: (id: string, data: object) => req(`/vaccines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVaccine: (id: string) => req(`/vaccines/${id}`, { method: 'DELETE' }),

  // Readings
  getLatestReadings: () => req('/readings/latest'),
  getHistory: (deviceId: string, hours = 24) => req(`/readings/history/${deviceId}?hours=${hours}`),
  getFridgeHistory: (fridgeId: string, hours = 24) => req(`/readings/fridge/${fridgeId}?hours=${hours}`),

  // Alerts
  getAlerts: (params?: { acknowledged?: boolean; severity?: string }) => {
    const q = new URLSearchParams();
    if (params?.acknowledged !== undefined) q.set('acknowledged', String(params.acknowledged));
    if (params?.severity) q.set('severity', params.severity);
    return req(`/alerts?${q.toString()}`);
  },
  acknowledgeAlert: (id: string) => req(`/alerts/${id}/acknowledge`, { method: 'PATCH' }),
  acknowledgeAll: () => req('/alerts/acknowledge-all', { method: 'POST' }),

  // Users
  getUsers: () => req('/users'),
  createUser: (data: object) => req('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: object) => req(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => req(`/users/${id}`, { method: 'DELETE' }),

  // Roles
  getRoles: () => req('/roles'),
  getAllPermissions: () => req('/roles/permissions'),
  createRole: (data: object) => req('/roles', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (id: string, data: object) => req(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRole: (id: string) => req(`/roles/${id}`, { method: 'DELETE' }),

  // Predictions
  getPredictions: (deviceId: string) => req(`/predictions/${deviceId}`),

  // OTP verification (no auth token needed)
  verifyOTP: (email: string, otp: string) =>
    req('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),
  resendOTP: (email: string) =>
    req('/auth/resend-otp', { method: 'POST', body: JSON.stringify({ email }) }),
};
