import 'dotenv/config';
import { CostPrincipleDefinition } from './types';

/**
 * Validates and extracts required environment variable
 * In production without the var, logs warning but doesn't crash
 */
const required = (key: string, defaultValue: string = ''): string => {
  const value = process.env[key];
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(`Warning: Missing environment variable: ${key}`);
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

/**
 * Application configuration loaded from environment variables
 * All API keys and sensitive data come from .env file
 */
const parsePort = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const costPrinciples: CostPrincipleDefinition[] = [
  {
    id: 'disclosureTransparency',
    name: 'Disclosure Transparency',
    description: 'Public authorities publish timely, accessible information across the infrastructure project lifecycle.',
    guidingQuestions: [
      'Are all major project milestones, contracts, and updates disclosed without delay?',
      'Is information accessible in formats communities and watchdogs can interrogate?',
      'Does disclosure enable tracking of funds, progress, and contractor performance?'
    ],
    positiveSignals: [
      'Clear publication schedules covering planning, procurement, delivery, and completion phases.',
      'Open data formats with structured fields aligned to CoST IDS and OC4IDS.',
      'Transparent change logs documenting amendments, variations, and approvals.'
    ],
    redFlags: [
      'Key contract details or change orders are absent or heavily redacted.',
      'Data releases lag months behind real-world decisions.',
      'Information is locked in PDFs or systems that exclude communities.'
    ]
  },
  {
    id: 'assuranceQuality',
    name: 'Assurance Quality',
    description: 'Independent validation confirms that disclosed information is true, complete, and meaningful.',
    guidingQuestions: [
      'Are independent specialists reviewing and verifying the published data?',
      'Do assurance findings lead to corrective actions and public reporting?',
      'Is there a traceable methodology for sampling, verification, and follow-up?'
    ],
    positiveSignals: [
      'Assurance teams have multidisciplinary expertise and independence.',
      'Findings lead to corrective action plans with owners and contractors.',
      'Public summaries translate technical assurance insights for wider audiences.'
    ],
    redFlags: [
      'Assurance is sporadic, under-resourced, or lacks methodological rigor.',
      'Findings are not published or fail to trigger improvements.',
      'Same actors responsible for delivery also review themselves.'
    ]
  },
  {
    id: 'multiStakeholderParticipation',
    name: 'Multi-Stakeholder Participation',
    description: 'Government, private sector, and civil society co-create decisions and oversight.',
    guidingQuestions: [
      'Are civil society and community voices embedded in governance structures?',
      'Do private sector actors engage beyond compliance to champion openness?',
      'Is participation continuous from planning to delivery, not one-off?'
    ],
    positiveSignals: [
      'Balanced governance bodies with formalized roles for civil society and oversight institutions.',
      'Private sector partners co-own transparency commitments and reporting.',
      'Feedback loops show how citizen input alters project decisions.'
    ],
    redFlags: [
      'Participation mechanisms are tokenistic or consult once without follow-up.',
      'Civil society lacks access to information necessary for meaningful input.',
      'Dominant actors can veto or ignore multi-stakeholder recommendations.'
    ]
  },
  {
    id: 'socialAccountability',
    name: 'Social Accountability',
    description: 'Communities can monitor delivery, raise grievances, and secure remedies.',
    guidingQuestions: [
      'Do citizens have channels to monitor performance and costs in real time?',
      'Are grievance mechanisms accessible, responsive, and protective of whistleblowers?',
      'Do accountability outcomes feed back into planning and procurement reforms?'
    ],
    positiveSignals: [
      'Citizen monitors or community scorecards are integrated into project management.',
      'Public dashboards surface performance, cost, and delivery commitments.',
      'Grievance cases lead to transparent resolution and systemic fixes.'
    ],
    redFlags: [
      'Affected communities lack representation or fear retaliation for speaking up.',
      'Issues raised through hotlines or reports vanish without documented resolutions.',
      'Insights from accountability processes never reach decision-makers.'
    ]
  }
];

export const config = {
  // Server
  port: parsePort(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV || 'development',

  // MongoDB Atlas
  mongoUri: required('MONGODB_URI'),
  dbName: process.env.DB_NAME || 'infrascope',
  vectorCollection: 'docs',

  // AI Services
  exaApiKey: required('EXA_SEARCH_API_KEY'),
  geminiApiKey: required('GEMINI_API_KEY'),
  geminiModel: process.env.GEMINI_MODEL || 'gemini-flash-latest',
  openaiApiKey: required('OPENAI_API_KEY'),
  openaiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',

  // Google Cloud Platform
  gcpProjectId: process.env.GCP_PROJECT_ID || '',
  gcsBucketName: process.env.GCS_BUCKET_NAME || '',

  // Crawler settings
  crawlerUserAgent: process.env.CRAWLER_USER_AGENT || 'CoSTKnowledgeHub/1.0',
  crawlerRequestTimeout: parsePort(process.env.CRAWLER_REQUEST_TIMEOUT, 30000),
  crawlerRateLimitMs: parsePort(process.env.CRAWLER_RATE_LIMIT_MS, 1000),

  telemetryWebhookUrl: process.env.TELEMETRY_WEBHOOK_URL,

  // Email (Gmail SMTP)
  emailHost: process.env.EMAIL_HOST || 'smtp.gmail.com',
  emailPort: parsePort(process.env.EMAIL_PORT, 587),
  emailUser: process.env.EMAIL_USER || '',
  emailPassword: process.env.EMAIL_PASSWORD || '',
  emailFrom: process.env.EMAIL_FROM || 'CoST Knowledge Hub <noreply@infrastructuretransparency.org>',

  // Scheduler
  schedulerSecret: process.env.SCHEDULER_SECRET || '',
  frontendAdminUrl: process.env.FRONTEND_ADMIN_URL || 'https://infralens-b1eed.web.app/admin',
  frontendUrl: process.env.FRONTEND_URL || 'https://infralens-b1eed.web.app',

  // Domain Allowlist (for Exa searches)
  domainAllowlist: [
    'infrastructuretransparency.org',
    'infrastructuretransparencyinitiative.org'
  ],

  // CORS
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:4200')
    .split(',')
    .map(s => s.trim()),

  // Rate Limiting
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMaxRequests: 60,

  // Cache
  cacheTtl: 60 * 1000, // 60 seconds
  cacheMaxSize: 500,
  costPrinciples,
} as const;

// Also export as default for files that import it that way
export default config;

// Helper function to validate config at startup
export function validateConfig(): void {
  // Just accessing config will throw if required vars are missing
  console.log(`Config loaded: port=${config.port}, env=${config.nodeEnv}`);
}
