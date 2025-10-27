import { UserFeedback } from '../types';
import { getDatabase } from '../db';
import { domainRulesService } from './domain-rules';
import { messageProcessor } from './message-processor';
import { graphClient } from './graph-client';
import { config } from '../config';

export class FeedbackService {
  async handleFeedback(
    userId: string,
    messageId: string,
    feedbackType: 'mark_safe' | 'mark_junk' | 'report_phish'
  ): Promise<void> {
    // Get the original decision
    const decision = await messageProcessor.getDecision(messageId);

    if (!decision) {
      throw new Error('No decision found for message');
    }

    // Save feedback
    const feedback: UserFeedback = {
      messageId,
      userId,
      feedbackType,
      timestamp: new Date().toISOString(),
      originalScore: decision.riskScore,
      originalDecision: decision.decision,
    };

    this.saveFeedback(feedback);

    // Apply learning if enabled
    if (config.features.enableFeedbackLearning) {
      await this.applyLearning(userId, messageId, feedbackType);
    }
  }

  private saveFeedback(feedback: UserFeedback): void {
    const db = getDatabase();

    db.prepare(
      `
      INSERT INTO user_feedback (message_id, user_id, feedback_type, timestamp, original_score, original_decision)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    ).run(
      feedback.messageId,
      feedback.userId,
      feedback.feedbackType,
      feedback.timestamp,
      feedback.originalScore,
      feedback.originalDecision
    );
  }

  private async applyLearning(
    userId: string,
    messageId: string,
    feedbackType: string
  ): Promise<void> {
    try {
      // Get the message to extract sender domain
      const message = await graphClient.getMessage(userId, messageId);
      const senderDomain = this.extractDomain(message.from.address);

      if (feedbackType === 'mark_safe') {
        // Add to allowlist with TTL
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90); // 90 days

        await domainRulesService.addRule({
          domain: senderDomain,
          type: 'allow',
          source: 'user_feedback',
          addedAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
        });

        console.log(`Added ${senderDomain} to allowlist based on user feedback`);
      } else if (feedbackType === 'mark_junk' || feedbackType === 'report_phish') {
        // Add to blocklist
        await domainRulesService.addRule({
          domain: senderDomain,
          type: 'block',
          source: 'user_feedback',
          addedAt: new Date().toISOString(),
        });

        console.log(`Added ${senderDomain} to blocklist based on user feedback`);

        // If reporting phish and not already moved, move to junk
        if (feedbackType === 'report_phish') {
          try {
            await graphClient.moveMessageToJunk(userId, messageId);
          } catch (error) {
            console.error('Failed to move reported phish:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to apply learning:', error);
    }
  }

  async getFeedbackHistory(userId: string, limit: number = 100): Promise<UserFeedback[]> {
    const db = getDatabase();

    const rows = db
      .prepare(
        `
      SELECT * FROM user_feedback
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `
      )
      .all(userId, limit) as any[];

    return rows.map((row) => ({
      messageId: row.message_id,
      userId: row.user_id,
      feedbackType: row.feedback_type,
      timestamp: row.timestamp,
      originalScore: row.original_score,
      originalDecision: row.original_decision,
    }));
  }

  async getFeedbackStats(userId: string): Promise<any> {
    const db = getDatabase();

    const stats = db
      .prepare(
        `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN feedback_type = 'mark_safe' THEN 1 ELSE 0 END) as mark_safe_count,
        SUM(CASE WHEN feedback_type = 'mark_junk' THEN 1 ELSE 0 END) as mark_junk_count,
        SUM(CASE WHEN feedback_type = 'report_phish' THEN 1 ELSE 0 END) as report_phish_count
      FROM user_feedback
      WHERE user_id = ?
    `
      )
      .get(userId) as any;

    return stats;
  }

  private extractDomain(email: string): string {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1].toLowerCase() : '';
  }
}

export const feedbackService = new FeedbackService();

