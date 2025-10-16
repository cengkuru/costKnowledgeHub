import axios from 'axios';
import { config } from '../config.js';
import { ContextualTelemetryRecord } from '../types.js';

export const forwardTelemetry = async (record: ContextualTelemetryRecord): Promise<void> => {
  const url = config.telemetryWebhookUrl;
  if (!url) {
    return;
  }

  try {
    await axios.post(url, record, {
      timeout: 2_000
    });
  } catch (error) {
    console.error('[TelemetryForwarder] Failed to forward contextual event', error);
  }
};
