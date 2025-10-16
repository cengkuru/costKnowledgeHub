import { Router } from 'express';
import { ContextualTelemetryEvent, ContextualTelemetryRecord } from '../types.js';
import { logContextualTelemetry } from '../services/telemetry-logger.js';
import { forwardTelemetry } from '../services/telemetry-forwarder.js';

export const telemetry = Router();

telemetry.post('/contextual', async (req, res, next) => {
  try {
    const event = req.body as Partial<ContextualTelemetryEvent>;

    if (!event || !event.type || !event.query || !event.clientTimestamp) {
      return res.status(400).json({ error: 'type, query and clientTimestamp are required' });
    }

    const record: ContextualTelemetryRecord = {
      type: event.type,
      query: event.query,
      filters: event.filters ?? {},
      payload: event.payload ?? {},
      clientTimestamp: event.clientTimestamp,
      sessionId: event.sessionId,
      receivedAt: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('user-agent') || undefined
    };

    await Promise.all([
      logContextualTelemetry(record),
      forwardTelemetry(record)
    ]);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
