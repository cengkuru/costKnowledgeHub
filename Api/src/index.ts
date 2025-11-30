import express from 'express';
import cors from 'cors';
import { config } from './config';
import { connectToDatabase } from './db';
import { initializeAI } from './services/aiService';
import { ensureSearchIndexes } from './utils/ensureSearchIndex';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { startDescriptionJob } from './jobs/descriptionJob';

const app = express();

// Configure CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (config.allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all routes
app.use(apiLimiter);

// Mount all routes
app.use(routes);

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectToDatabase();
    console.log('✅ Database connected');

    // Initialize search indexes
    await ensureSearchIndexes();

    // Initialize AI service
    initializeAI();
    console.log('✅ AI service initialized');

    // Start scheduled jobs
    startDescriptionJob();
    console.log('✅ Scheduled jobs initialized');

    // Start listening
    app.listen(config.port, () => {
      console.log(`✅ Server running at http://localhost:${config.port}`);
      console.log(`   Environment: ${config.nodeEnv}`);
      console.log(`   Database: ${config.dbName}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

export default app;
