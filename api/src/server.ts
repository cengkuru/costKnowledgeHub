import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { search } from './routes/search.js';
import { intelligentSearch } from './routes/intelligent-search.js';
import { refresh } from './routes/refresh.js';
import { compose } from './routes/compose.js';
import { health } from './routes/health.js';
import { recommendations } from './routes/recommendations.js';
import { filters } from './routes/filters.js';
import { collections } from './routes/collections.js';
import { telemetry } from './routes/telemetry.js';
import { starterQuestions } from './routes/starter-questions.js';
import { quickTopics } from './routes/quick-topics.js';
import { closeMongo } from './services/vectorStore.js';

const app = express();

// Security headers
app.use(helmet());

// CORS configuration for Angular frontend
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logging
const logFormat = config.nodeEnv === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

// API Routes
app.use('/health', health);
app.use('/search', search);
app.use('/intelligent-search', intelligentSearch);  // NEW: Super-intelligent search
app.use('/refresh', refresh);
app.use('/compose', compose);
app.use('/recommendations', recommendations);
app.use('/filters', filters);
app.use('/collections', collections);
app.use('/telemetry', telemetry);
app.use('/starter-questions', starterQuestions);  // DEPRECATED: Keeping for backward compatibility
app.use('/quick-topics', quickTopics);  // NEW: Short topic labels for quick navigation

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  CoST Knowledge Hub API                                   ║
║  Environment: ${config.nodeEnv.padEnd(46)}║
║  Port:        ${String(config.port).padEnd(46)}║
║  CORS:        ${config.allowedOrigins[0].padEnd(46)}║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
const gracefulShutdown = (signal: 'SIGINT' | 'SIGTERM') => {
  console.log(`${signal} signal received: closing HTTP server`);
  server.close(() => {
    console.log('HTTP server closed');
    closeMongo()
      .catch(err => {
        console.error('Error closing MongoDB connection', err);
      })
      .finally(() => process.exit(0));
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('SIGINT', () => {
  console.log();
  gracefulShutdown('SIGINT');
});
