import { appendFile, mkdir } from 'fs/promises';
import path from 'node:path';
import { ContextualTelemetryRecord } from '../types.js';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const CONTEXTUAL_LOG = path.join(LOG_DIR, 'contextual-telemetry.ndjson');

let ensured = false;

async function ensureLogDir(): Promise<void> {
  if (ensured) return;
  await mkdir(LOG_DIR, { recursive: true });
  ensured = true;
}

export const logContextualTelemetry = async (record: ContextualTelemetryRecord): Promise<void> => {
  try {
    await ensureLogDir();
    const line = JSON.stringify(record) + '\n';
    await appendFile(CONTEXTUAL_LOG, line, 'utf8');
  } catch (error) {
    console.error('[TelemetryLogger] Failed to persist contextual event', error);
  }
};
