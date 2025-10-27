import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, validateConfig } from './config';
import { getDatabase } from './db';
import webhookRouter from './routes/webhook';
import classifyRouter from './routes/classify';
import feedbackRouter from './routes/feedback';
import adminRouter from './routes/admin';
import healthRouter from './routes/health';

// Validate configuration
validateConfig();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', webhookRouter);
app.use('/api', classifyRouter);
app.use('/api', feedbackRouter);
app.use('/api', adminRouter);
app.use('/api', healthRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Invora Email Filter API',
    version: '1.0.0',
    status: 'running',
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Initialize database
try {
  getDatabase();
  console.log('Database initialized');
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}

// Start server
const port = config.server.port;
const server = app.listen(port, () => {
  console.log(`Invora Email Filter API running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`ML enabled: ${config.ml.enabled}`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    const { closeDatabase } = require('./db');
    closeDatabase();
    console.log('Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;

