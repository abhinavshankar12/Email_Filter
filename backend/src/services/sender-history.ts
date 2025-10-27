import { getDatabase } from '../db';
import { EmailMessage } from '../types';

export class SenderHistoryService {
  async recordSender(userId: string, message: EmailMessage): Promise<void> {
    const db = getDatabase();
    const senderAddress = message.from.address.toLowerCase();
    const senderDomain = this.extractDomain(senderAddress);
    const now = new Date().toISOString();

    const existing = db
      .prepare(
        `
      SELECT * FROM sender_history 
      WHERE user_id = ? AND sender_address = ?
    `
      )
      .get(userId, senderAddress) as any;

    if (existing) {
      db.prepare(
        `
        UPDATE sender_history 
        SET last_seen = ?, message_count = message_count + 1, updated_at = ?
        WHERE user_id = ? AND sender_address = ?
      `
      ).run(now, now, userId, senderAddress);
    } else {
      db.prepare(
        `
        INSERT INTO sender_history (user_id, sender_address, sender_domain, first_seen, last_seen, message_count)
        VALUES (?, ?, ?, ?, ?, 1)
      `
      ).run(userId, senderAddress, senderDomain, now, now);
    }
  }

  async isFirstTimeSender(userId: string, senderAddress: string): Promise<boolean> {
    const db = getDatabase();

    const result = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM sender_history 
      WHERE user_id = ? AND sender_address = ?
    `
      )
      .get(userId, senderAddress.toLowerCase()) as { count: number };

    return result.count === 0;
  }

  async isNewlySeenDomain(userId: string, domain: string, days: number): Promise<boolean> {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM sender_history 
      WHERE user_id = ? AND sender_domain = ? AND first_seen < ?
    `
      )
      .get(userId, domain.toLowerCase(), cutoffDate.toISOString()) as { count: number };

    return result.count === 0;
  }

  async getSenderHistory(
    userId: string,
    senderAddress: string
  ): Promise<{ first_seen: string; last_seen: string; message_count: number } | null> {
    const db = getDatabase();

    const result = db
      .prepare(
        `
      SELECT first_seen, last_seen, message_count FROM sender_history 
      WHERE user_id = ? AND sender_address = ?
    `
      )
      .get(userId, senderAddress.toLowerCase()) as any;

    return result || null;
  }

  async getDomainHistory(
    userId: string,
    domain: string
  ): Promise<{ first_seen: string; message_count: number }[]> {
    const db = getDatabase();

    return db
      .prepare(
        `
      SELECT first_seen, message_count FROM sender_history 
      WHERE user_id = ? AND sender_domain = ?
    `
      )
      .all(userId, domain.toLowerCase()) as any[];
  }

  private extractDomain(email: string): string {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1].toLowerCase() : '';
  }
}

export const senderHistoryService = new SenderHistoryService();

