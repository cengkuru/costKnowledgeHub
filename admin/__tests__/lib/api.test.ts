import { authApi, ApiError } from '@/lib/api';

describe('API Utilities', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('authApi.login', () => {
    it('should store token on successful login', async () => {
      const mockResponse = {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin' as const,
        },
        tokens: {
          accessToken: 'access_token_123',
          refreshToken: 'refresh_token_123',
        },
      };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      ) as jest.Mock;

      await authApi.login('test@example.com', 'password');

      expect(localStorage.getItem('token')).toBe('access_token_123');
      expect(localStorage.getItem('refreshToken')).toBe('refresh_token_123');
    });

    it('should throw ApiError on failed login', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: () => Promise.resolve({ error: 'Invalid credentials' }),
        })
      ) as jest.Mock;

      await expect(
        authApi.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow(ApiError);
    });
  });

  describe('authApi.logout', () => {
    it('should clear tokens from localStorage', async () => {
      localStorage.setItem('token', 'access_token_123');
      localStorage.setItem('refreshToken', 'refresh_token_123');

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      ) as jest.Mock;

      await authApi.logout();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('ApiError', () => {
    it('should create error with status and message', () => {
      const error = new ApiError(404, 'Not Found');
      expect(error.status).toBe(404);
      expect(error.message).toBe('Not Found');
      expect(error.name).toBe('ApiError');
    });
  });
});
