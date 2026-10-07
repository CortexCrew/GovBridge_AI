const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://govbridgebackend-e7azgsaccgc8gbhh.centralindia-01.azurewebsites.net/api';
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export function getMediaUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // If payload is FormData, let browser set Content-Type
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      localStorage.removeItem('token');
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return { ...data, status: res.status };
  } catch (err) {
    console.error(`[API] Request to ${endpoint} failed.`, err);
    return { success: false, message: 'The service is unavailable right now. Please try again.' };
  }
}

export const authApi = {
  sendOtp: (payload) => apiRequest('/auth/send-otp', { method: 'POST', body: JSON.stringify(payload) }),
  verifyOtp: (payload) => apiRequest('/auth/verify-otp', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  officerLogin: (payload) => apiRequest('/officer/login', { method: 'POST', body: JSON.stringify(payload) }),
  profile: () => apiRequest('/auth/profile'),
  updateProfile: (payload) => apiRequest('/auth/profile', { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteProfile: () => apiRequest('/auth/profile', { method: 'DELETE' }),
};

export const complaintApi = {
  list: () => apiRequest('/complaints'),
  create: (payload) => apiRequest('/complaints', { method: 'POST', body: JSON.stringify(payload) }),
  remove: (id) => apiRequest(`/complaints/${id}`, { method: 'DELETE' }),
  detail: (id) => apiRequest(`/complaints/${id}`),
  history: (id) => apiRequest(`/complaints/${id}/history`),
  assignment: (id) => apiRequest(`/complaints/${id}/assignment`),
  officerList: (params = '') => apiRequest(`/officer/complaints${params ? `?${params}` : ''}`),
  officerDetail: (id) => apiRequest(`/officer/complaints/${id}`),
  assign: (id, officer_id) => apiRequest(`/complaints/${id}/assign`, { method: 'POST', body: JSON.stringify({ officer_id }) }),
  updateStatus: (id, payload) => apiRequest(`/complaints/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload) }),
};

export const certificateApi = {
  listMine: () => apiRequest('/certificates/my-applications'),
  listOfficer: () => apiRequest('/certificates/officer/applications'),
  detail: (id) => apiRequest(`/certificates/my-applications/${id}`),
  documentAccess: (id, disposition = 'attachment') =>
    apiRequest(`/certificates/documents/${id}/access?disposition=${disposition}`),
  apply: (body) => apiRequest('/certificates/apply', { method: 'POST', body }),
  review: (id, payload) => apiRequest(`/certificates/${id}/review`, { method: 'PATCH', body: JSON.stringify(payload) }),
};

export const lockerApi = {
  list: () => apiRequest('/locker/my-locker'),
  access: (kind, id, disposition = 'attachment') =>
    apiRequest(`/locker/access/${kind}/${id}?disposition=${disposition}`),
};

export async function downloadLockerFile(item) {
  const kind = item.source === 'issued_certificate' ? 'issued' : 'document';
  if (item.storage_provider === 'azure') {
    const access = await lockerApi.access(kind, item.item_id);
    if (!access.success || !access.data?.url) {
      return { success: false, message: access.message || access.error || 'Unable to download this file.' };
    }
    const link = document.createElement('a');
    link.href = access.data.url;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    return { success: true };
  }

  const token = localStorage.getItem('token');
  const origin = new URL(API_BASE, window.location.href).origin;
  try {
    const res = await fetch(`${origin}${item.download_url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, message: data.error || data.message || 'Unable to download this file.' };
    }
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = item.file_name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return { success: true };
  } catch {
    return { success: false, message: 'The service is unavailable right now. Please try again.' };
  }
}

export async function viewLockerFile(item) {
  const tab = window.open('about:blank', '_blank');
  if (!tab) return { success: false, message: 'Allow pop-ups to view this document.' };

  const kind = item.source === 'issued_certificate' ? 'issued' : 'document';
  try {
    const access = await lockerApi.access(kind, item.item_id, 'inline');
    if (!access.success) throw new Error(access.message || access.error || 'Unable to open this file.');
    if (access.data?.url) {
      tab.location = access.data.url;
      return { success: true };
    }

    const token = localStorage.getItem('token');
    const origin = new URL(API_BASE, window.location.href).origin;
    const response = await fetch(`${origin}${access.data.local_url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Unable to open this file.');
    tab.location = URL.createObjectURL(await response.blob());
    return { success: true };
  } catch (error) {
    tab.close();
    return { success: false, message: error.message || 'Unable to open this file.' };
  }
}

export async function viewApplicationDocument(documentId) {
  const tab = window.open('about:blank', '_blank');
  if (!tab) return { success: false, message: 'Allow pop-ups to view this document.' };
  try {
    const access = await certificateApi.documentAccess(documentId, 'inline');
    if (!access.success) throw new Error(access.message || access.error || 'Unable to open this file.');
    if (access.data?.url) {
      tab.location = access.data.url;
      return { success: true };
    }
    const token = localStorage.getItem('token');
    const origin = new URL(API_BASE, window.location.href).origin;
    const response = await fetch(`${origin}${access.data.local_url}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Unable to open this file.');
    tab.location = URL.createObjectURL(await response.blob());
    return { success: true };
  } catch (error) {
    tab.close();
    return { success: false, message: error.message || 'Unable to open this file.' };
  }
}

export async function downloadIssuedCertificate(applicationId, fileName) {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`${API_BASE}/certificates/applications/${applicationId}/issued-file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) return { success: false, message: 'Unable to download this certificate.' };
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'certificate';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return { success: true };
  } catch {
    return { success: false, message: 'The service is unavailable right now. Please try again.' };
  }
}

export const officerApi = {
  dashboard: () => apiRequest('/officer/dashboard'),
  departmentOfficers: () => apiRequest('/officer/department-officers'),
};

export const usersApi = {
  list: () => apiRequest('/auth/users'),
  detail: (id) => apiRequest(`/auth/users/${id}`),
  update: (id, payload) => apiRequest(`/auth/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (id) => apiRequest(`/auth/users/${id}`, { method: 'DELETE' }),
};
