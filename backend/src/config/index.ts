import dotenv from 'dotenv';
import { Config } from '../types';

dotenv.config();

export const config: Config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    webhookBaseUrl: process.env.WEBHOOK_BASE_URL || 'http://localhost:3000',
  },
  graph: {
    tenantId: process.env.GRAPH_TENANT_ID || '',
    clientId: process.env.GRAPH_CLIENT_ID || '',
    clientSecret: process.env.GRAPH_CLIENT_SECRET || '',
    redirectUri: process.env.GRAPH_REDIRECT_URI || 'http://localhost:3000/auth/callback',
  },
  database: {
    path: process.env.DATABASE_PATH || './data/invora.db',
  },
  processing: {
    riskThresholdJunk: parseInt(process.env.RISK_THRESHOLD_JUNK || '80', 10),
    riskThresholdWarning: parseInt(process.env.RISK_THRESHOLD_WARNING || '50', 10),
    timeoutMs: parseInt(process.env.PROCESSING_TIMEOUT_MS || '6000', 10),
    pollingIntervalMs: parseInt(process.env.FALLBACK_POLLING_INTERVAL_MS || '300000', 10),
  },
  ml: {
    enabled: process.env.ML_ENABLED === 'true',
    provider: process.env.ML_PROVIDER || 'mock',
    timeoutMs: parseInt(process.env.ML_TIMEOUT_MS || '3000', 10),
  },
  privacy: {
    logFullEmailAddresses: process.env.LOG_FULL_EMAIL_ADDRESSES === 'true',
    sendBodyToMl: process.env.SEND_BODY_TO_ML === 'true',
  },
  features: {
    enableComposeWarning: process.env.ENABLE_COMPOSE_WARNING !== 'false',
    enableAutoMove: process.env.ENABLE_AUTO_MOVE !== 'false',
    enableFeedbackLearning: process.env.ENABLE_FEEDBACK_LEARNING !== 'false',
  },
};

export function validateConfig(): void {
  const required = [
    'GRAPH_TENANT_ID',
    'GRAPH_CLIENT_ID',
    'GRAPH_CLIENT_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn(
      `Warning: Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

