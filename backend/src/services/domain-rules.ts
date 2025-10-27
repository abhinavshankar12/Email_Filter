import { getDatabase } from '../db';
import { DomainRule } from '../types';
import fs from 'fs';
import path from 'path';

export class DomainRulesService {
  private allowlistCache: Set<string> = new Set();
  private blocklistCache: Set<string> = new Set();
  private lastCacheUpdate: number = 0;
  private cacheTimeout: number = 60000; // 1 minute

  async loadSeedData(): Promise<void> {
    const db = getDatabase();

    // Load allowlist
    const allowlistPath = path.join(__dirname, '../data/allowlist.json');
    if (fs.existsSync(allowlistPath)) {
      const allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf-8'));
      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO domain_rules (domain, type, source, added_at)
        VALUES (?, ?, ?, ?)
      `);

      for (const rule of allowlist) {
        insertStmt.run(rule.domain, rule.type, rule.source, rule.addedAt);
      }
    }

    // Load blocklist
    const blocklistPath = path.join(__dirname, '../data/blocklist.json');
    if (fs.existsSync(blocklistPath)) {
      const blocklist = JSON.parse(fs.readFileSync(blocklistPath, 'utf-8'));
      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO domain_rules (domain, type, source, added_at)
        VALUES (?, ?, ?, ?)
      `);

      for (const rule of blocklist) {
        insertStmt.run(rule.domain, rule.type, rule.source, rule.addedAt);
      }
    }

    this.refreshCache();
  }

  private refreshCache(): void {
    const db = getDatabase();
    const now = Date.now();

    if (now - this.lastCacheUpdate < this.cacheTimeout) {
      return;
    }

    this.allowlistCache.clear();
    this.blocklistCache.clear();

    // Load allowlist
    const allowRules = db
      .prepare(
        `
      SELECT domain FROM domain_rules 
      WHERE type = 'allow' 
      AND (expires_at IS NULL OR expires_at > datetime('now'))
    `
      )
      .all() as { domain: string }[];

    allowRules.forEach((rule) => this.allowlistCache.add(rule.domain.toLowerCase()));

    // Load blocklist
    const blockRules = db
      .prepare(
        `
      SELECT domain FROM domain_rules 
      WHERE type = 'block'
      AND (expires_at IS NULL OR expires_at > datetime('now'))
    `
      )
      .all() as { domain: string }[];

    blockRules.forEach((rule) => this.blocklistCache.add(rule.domain.toLowerCase()));

    this.lastCacheUpdate = now;
  }

  async isOnAllowlist(domain: string): Promise<boolean> {
    this.refreshCache();
    const lowerDomain = domain.toLowerCase();

    // Check exact match
    if (this.allowlistCache.has(lowerDomain)) {
      return true;
    }

    // Check wildcard matches
    for (const rule of this.allowlistCache) {
      if (rule.startsWith('*.')) {
        const baseDomain = rule.substring(2);
        if (lowerDomain === baseDomain || lowerDomain.endsWith('.' + baseDomain)) {
          return true;
        }
      }
    }

    return false;
  }

  async isOnBlocklist(domain: string): Promise<boolean> {
    this.refreshCache();
    const lowerDomain = domain.toLowerCase();

    // Check exact match
    if (this.blocklistCache.has(lowerDomain)) {
      return true;
    }

    // Check wildcard matches
    for (const rule of this.blocklistCache) {
      if (rule.startsWith('*.')) {
        const baseDomain = rule.substring(2);
        if (lowerDomain === baseDomain || lowerDomain.endsWith('.' + baseDomain)) {
          return true;
        }
      }
    }

    return false;
  }

  async addRule(rule: Omit<DomainRule, 'id'>): Promise<void> {
    const db = getDatabase();

    db.prepare(
      `
      INSERT INTO domain_rules (domain, type, source, user_id, added_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    ).run(
      rule.domain.toLowerCase(),
      rule.type,
      rule.source,
      (rule as any).user_id || null,
      rule.addedAt,
      rule.expiresAt || null
    );

    this.lastCacheUpdate = 0; // Force cache refresh
  }

  async removeRule(domain: string, type: 'allow' | 'block'): Promise<void> {
    const db = getDatabase();

    db.prepare(
      `
      DELETE FROM domain_rules 
      WHERE domain = ? AND type = ?
    `
    ).run(domain.toLowerCase(), type);

    this.lastCacheUpdate = 0; // Force cache refresh
  }

  async getAllRules(): Promise<DomainRule[]> {
    const db = getDatabase();

    const rules = db
      .prepare(
        `
      SELECT * FROM domain_rules 
      ORDER BY added_at DESC
    `
      )
      .all() as any[];

    return rules.map((row) => ({
      domain: row.domain,
      type: row.type,
      source: row.source,
      addedAt: row.added_at,
      expiresAt: row.expires_at,
    }));
  }
}

export const domainRulesService = new DomainRulesService();

