import { Resource, Category, LoginResponse, PaginatedResponse, User } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, error.error || response.statusText);
  }

  return response.json();
}

// Auth endpoints
export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('token', response.tokens.accessToken);
      localStorage.setItem('refreshToken', response.tokens.refreshToken);
    }

    return response;
  },

  logout: async (): Promise<void> => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
    }
  },

  me: async () => {
    return request('/auth/me', { method: 'GET' });
  },
};

// Resources endpoints
export const resourcesApi = {
  list: async (
    page: number = 1,
    limit: number = 20,
    filters?: Record<string, string>
  ): Promise<PaginatedResponse<Resource>> => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', limit.toString());

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
    }

    return request(`/admin/resources?${params.toString()}`, { method: 'GET' });
  },

  get: async (id: string): Promise<Resource> => {
    return request(`/admin/resources/${id}`, { method: 'GET' });
  },

  create: async (data: Partial<Resource>): Promise<Resource> => {
    return request('/admin/resources', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<Resource>): Promise<Resource> => {
    return request(`/admin/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateStatus: async (
    id: string,
    status: string,
    reason?: string
  ): Promise<Resource> => {
    return request(`/admin/resources/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    });
  },

  delete: async (id: string): Promise<void> => {
    return request(`/admin/resources/${id}`, { method: 'DELETE' });
  },
};

// Categories endpoints
export const categoriesApi = {
  list: async (): Promise<Category[]> => {
    const response = await request<PaginatedResponse<Category>>(
      '/admin/categories',
      { method: 'GET' }
    );
    return response.data;
  },

  create: async (data: Partial<Category>): Promise<Category> => {
    return request('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: Partial<Category>): Promise<Category> => {
    return request(`/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<void> => {
    return request(`/admin/categories/${id}`, { method: 'DELETE' });
  },
};

// Users endpoints
export const usersApi = {
  list: async (): Promise<User[]> => {
    const response = await request<{ users: User[] }>('/admin/users', { method: 'GET' });
    return response.users;
  },

  create: async (data: { name: string; email: string }): Promise<User> => {
    const response = await request<{ user: User }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.user;
  },

  updateRole: async (id: string, role: 'admin' | 'user'): Promise<User> => {
    const response = await request<{ user: User }>(`/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
    return response.user;
  },

  resendWelcome: async (id: string): Promise<void> => {
    await request(`/admin/users/${id}/resend-welcome`, {
      method: 'POST',
    });
  },

  delete: async (id: string): Promise<void> => {
    await request(`/admin/users/${id}`, { method: 'DELETE' });
  },
};
