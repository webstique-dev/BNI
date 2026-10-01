const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Attach token from localStorage if present
  try {
    if (typeof window !== 'undefined') {
      const adminToken = localStorage.getItem('bni_admin_token');
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }
      const deviceToken = localStorage.getItem('bni_device_token');
      if (deviceToken) {
        headers['x-device-token'] = deviceToken;
      }
    }
  } catch (e) {
    // ignore
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Ensure cookies are sent & received
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const error = new Error(data?.message || response.statusText || 'API Request Failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  // Persist device token and member details if provided in response
  if (typeof window !== 'undefined') {
    try {
      if (data?.deviceToken) {
        localStorage.setItem('bni_device_token', data.deviceToken);
      }
      if (data?.member?.id) {
        localStorage.setItem('bni_member_id', data.member.id);
      }
      if (data?.member?.phone) {
        localStorage.setItem('bni_member_phone', data.member.phone);
      }
      if (data?.member?.name) {
        localStorage.setItem('bni_member_name', data.member.name);
      }
    } catch (e) {
      // ignore
    }
  }

  return data;
}

export const api = {
  // Public check-in
  getPublicInfo: () => request('/public/info'),
  checkInByDevice: () => {
    let deviceToken = '';
    let memberId = '';
    let phone = '';
    try {
      if (typeof window !== 'undefined') {
        deviceToken = localStorage.getItem('bni_device_token') || '';
        memberId = localStorage.getItem('bni_member_id') || '';
        phone = localStorage.getItem('bni_member_phone') || '';
      }
    } catch (e) {
      // ignore
    }
    return request('/checkin/device', {
      method: 'POST',
      body: JSON.stringify({ deviceToken, memberId, phone }),
    });
  },
  checkInByPhone: (phone) =>
    request('/checkin/phone', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
  registerAndCheckIn: ({ phone, name, company, category }) =>
    request('/checkin/register', {
      method: 'POST',
      body: JSON.stringify({ phone, name, company, category }),
    }),
  searchMembers: (q) => request(`/members/search?q=${encodeURIComponent(q)}`),
  checkInBySearch: ({ memberId, phoneLast4, rememberDevice }) =>
    request('/checkin/search', {
      method: 'POST',
      body: JSON.stringify({ memberId, phoneLast4, rememberDevice }),
    }),
  forgetDevice: async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bni_device_token');
        localStorage.removeItem('bni_member_id');
        localStorage.removeItem('bni_member_phone');
        localStorage.removeItem('bni_member_name');
      }
    } catch (e) {
      // ignore
    }
    return request('/checkin/forget-device', { method: 'POST' });
  },

  // Admin Auth & Management
  adminLogin: ({ username, password }) =>
    request('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  adminLogout: () => request('/admin/logout', { method: 'POST' }),
  getAdminMe: () => request('/admin/me'),
  getAdmins: () => request('/admin/admins'),
  createAdmin: ({ username, password, name }) =>
    request('/admin/admins', {
      method: 'POST',
      body: JSON.stringify({ username, password, name }),
    }),
  deleteAdmin: (id) => request(`/admin/admins/${id}`, { method: 'DELETE' }),

  // Admin Attendance
  getAttendance: (date) =>
    request(`/admin/attendance${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  markManualAttendance: ({ memberId, date, status, notes }) =>
    request('/admin/attendance', {
      method: 'POST',
      body: JSON.stringify({ memberId, date, status, notes }),
    }),
  deleteAttendance: (id) =>
    request(`/admin/attendance/${id}`, { method: 'DELETE' }),

  // Admin Members
  getMembers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/members${query ? `?${query}` : ''}`);
  },
  getMemberById: (id) => request(`/admin/members/${id}`),
  createMember: (data) =>
    request('/admin/members', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMember: (id, data) =>
    request(`/admin/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  toggleMemberActive: (id) =>
    request(`/admin/members/${id}/toggle-active`, { method: 'PATCH' }),
  deleteMember: (id) =>
    request(`/admin/members/${id}`, { method: 'DELETE' }),
  resetMemberDevices: (id) =>
    request(`/admin/members/${id}/reset-devices`, { method: 'POST' }),
  importMembersCsv: (formData) =>
    request('/admin/members/import-csv', {
      method: 'POST',
      body: formData,
    }),
  importMembersCsvText: (csvText) =>
    request('/admin/members/import-csv', {
      method: 'POST',
      body: JSON.stringify({ csvText }),
    }),

  // Admin Settings
  getSettings: () => request('/admin/settings'),
  updateSettings: (data) =>
    request('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Admin Reports
  getReports: ({ from, to }) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    return request(`/admin/reports?${params.toString()}`);
  },
  getExportUrl: ({ from, to, type = 'summary', date }) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (type) params.append('type', type);
    if (date) params.append('date', date);
    return `${BASE_URL}/admin/reports/export.csv?${params.toString()}`;
  },
};
