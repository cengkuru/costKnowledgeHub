/**
 * Development environment configuration
 *
 * Uses Angular proxy to route /api/* requests to backend
 * No need for absolute URLs or CORS in development
 */
export const environment = {
  production: false,
  apiUrl: '/api'
};
