import Database from 'better-sqlite3';
import { config } from '../config';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbDir = path.dirname(config.database.path);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(config.database.path);
    initializeSchema(db);
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

function initializeSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS processing_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL,
      internet_message_id TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      processed_at TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      decision TEXT NOT NULL,
      reasons TEXT NOT NULL,
      ml_used INTEGER NOT NULL DEFAULT 0,
      action_taken TEXT NOT NULL,
      processing_time_ms INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_internet_message_id 
      ON processing_decisions(internet_message_id);
    
    CREATE INDEX IF NOT EXISTS idx_user_id 
      ON processing_decisions(user_id);
    
    CREATE INDEX IF NOT EXISTS idx_processed_at 
      ON processing_decisions(processed_at);

    CREATE TABLE IF NOT EXISTS user_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      feedback_type TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      original_score INTEGER NOT NULL,
      original_decision TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_feedback_message_id 
      ON user_feedback(message_id);
    
    CREATE INDEX IF NOT EXISTS idx_feedback_user_id 
      ON user_feedback(user_id);

    CREATE TABLE IF NOT EXISTS domain_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      user_id TEXT,
      added_at TEXT NOT NULL,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_domain_rules_domain 
      ON domain_rules(domain);
    
    CREATE INDEX IF NOT EXISTS idx_domain_rules_type 
      ON domain_rules(type);

    CREATE TABLE IF NOT EXISTS graph_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscription_id TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      resource TEXT NOT NULL,
      change_type TEXT NOT NULL,
      expiration_date_time TEXT NOT NULL,
      client_state TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id 
      ON graph_subscriptions(user_id);
    
    CREATE INDEX IF NOT EXISTS idx_subscriptions_expiration 
      ON graph_subscriptions(expiration_date_time);

    CREATE TABLE IF NOT EXISTS sender_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      sender_address TEXT NOT NULL,
      sender_domain TEXT NOT NULL,
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      message_count INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, sender_address)
    );

    CREATE INDEX IF NOT EXISTS idx_sender_history_user_domain 
      ON sender_history(user_id, sender_domain);
  `);
}

export default { getDatabase, closeDatabase };

