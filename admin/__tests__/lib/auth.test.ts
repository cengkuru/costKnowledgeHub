import { isAuthenticated, getToken, logout } from '@/lib/auth';

describe('Auth utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      localStorage.setItem('token', 'test_token');
      expect(isAuthenticated()).toBe(true);
    });

    it('should return false when token does not exist', () => {
      expect(isAuthenticated()).toBe(false);
    });

    it('should return false in server-side context', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      expect(isAuthenticated()).toBe(false);

      global.window = originalWindow;
    });
  });

  describe('getToken', () => {
    it('should return token from localStorage', () => {
      const testToken = 'test_token_123';
      localStorage.setItem('token', testToken);

      expect(getToken()).toBe(testToken);
    });

    it('should return null when token does not exist', () => {
      expect(getToken()).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear tokens and redirect to login', () => {
      localStorage.setItem('token', 'test_token');
      localStorage.setItem('refreshToken', 'test_refresh_token');

      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { href: '' } as any;

      logout();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(window.location.href).toBe('/login');

      window.location = originalLocation;
    });
  });
});
