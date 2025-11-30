import dotenv from 'dotenv';

// Override any existing environment variables with .env values
// This ensures the correct API keys are used even if shell has placeholders
dotenv.config({ override: true });

interface Config {
  // Server
  port: number;
  nodeEnv: string;

  // Database
  mongodbUri: string;
  dbName: string;

  // API Keys
  geminiApiKey: string;
  anthropicApiKey: string;
  openaiApiKey: string;
  exaSearchApiKey: string;

  // Authentication
  jwtSecret: string;
  jwtExpiresIn: string;

  // CORS
  allowedOrigins: string[];

  // Email
  emailHost: string;
  emailPort: number;
  emailUser: string;
  emailPassword: string;
  emailFrom: string;

  // GCP
  gcpProjectId: string;
  gcpRegion: string;
  gcsBucketName: string;

  // Crawler
  crawlerUserAgent: string;
  crawlerRateLimitMs: number;
  crawlerStartUrl: string;
  crawlerSchedule: string;
  crawlerConcurrency: number;
  crawlerRequestTimeout: number;
  crawlerMaxRetries: number;
  crawlerRetryDelay: number;
}

const config: Config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  mongodbUri: process.env.MONGODB_URI || '',
  dbName: process.env.DB_NAME || 'infrascope',

  // API Keys
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  exaSearchApiKey: process.env.EXA_SEARCH_API_KEY || '',

  // Authentication
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // CORS
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:4200'],

  // Email
  emailHost: process.env.EMAIL_HOST || 'smtp.gmail.com',
  emailPort: parseInt(process.env.EMAIL_PORT || '587', 10),
  emailUser: process.env.EMAIL_USER || '',
  emailPassword: process.env.EMAIL_PASSWORD || '',
  emailFrom: process.env.EMAIL_FROM || '',

  // GCP
  gcpProjectId: process.env.GCP_PROJECT_ID || '',
  gcpRegion: process.env.GCP_REGION || 'us-central1',
  gcsBucketName: process.env.GCS_BUCKET_NAME || 'cost-knowledge-hub-images',

  // Crawler
  crawlerUserAgent: process.env.CRAWLER_USER_AGENT || 'InfraLens/1.0',
  crawlerRateLimitMs: parseInt(process.env.CRAWLER_RATE_LIMIT_MS || '0', 10),
  crawlerStartUrl: process.env.CRAWLER_START_URL || 'https://infrastructuretransparency.org/',
  crawlerSchedule: process.env.CRAWLER_SCHEDULE || '0 2 * * *',
  crawlerConcurrency: parseInt(process.env.CRAWLER_CONCURRENCY || '20', 10),
  crawlerRequestTimeout: parseInt(process.env.CRAWLER_REQUEST_TIMEOUT || '30000', 10),
  crawlerMaxRetries: parseInt(process.env.CRAWLER_MAX_RETRIES || '3', 10),
  crawlerRetryDelay: parseInt(process.env.CRAWLER_RETRY_DELAY || '0', 10),
};

// Validate required config
export function validateConfig(): void {
  const requiredFields: (keyof Config)[] = ['mongodbUri', 'geminiApiKey'];

  const missingFields = requiredFields.filter(field => !config[field]);

  if (missingFields.length > 0) {
    console.warn(`Warning: Missing required config fields: ${missingFields.join(', ')}`);
  }
}

export default config;
