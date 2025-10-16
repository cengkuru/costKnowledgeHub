import { Router } from 'express';

export const health = Router();

/**
 * GET /health
 *
 * Simple health check endpoint
 * Returns 200 OK when server is running
 *
 * Use for:
 * - Load balancer health checks
 * - Monitoring/uptime services
 * - Deployment verification
 */
health.get('/', (_req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    service: 'CoST Knowledge Hub API'
  });
});
