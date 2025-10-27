import { Router } from 'express';
import { graphClient } from '../services/graph-client';
import { mlClassifier } from '../services/ml-classifier';
import { getDatabase } from '../db';

const router = Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: false,
      graph: false,
      ml: false,
    },
  };

  try {
    // Check database
    const db = getDatabase();
    db.prepare('SELECT 1').get();
    health.checks.database = true;
  } catch (error) {
    console.error('Database health check failed:', error);
    health.status = 'degraded';
  }

  try {
    // Check Graph API (skip in dev if credentials not configured)
    if (process.env.GRAPH_TENANT_ID) {
      health.checks.graph = await graphClient.healthCheck();
    } else {
      health.checks.graph = true; // Skip check if not configured
    }
  } catch (error) {
    console.error('Graph health check failed:', error);
    health.status = 'degraded';
  }

  try {
    // Check ML service
    health.checks.ml = await mlClassifier.healthCheck();
  } catch (error) {
    console.error('ML health check failed:', error);
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Readiness check
router.get('/ready', (req, res) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
});

export default router;

