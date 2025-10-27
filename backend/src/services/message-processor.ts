import { EmailMessage, ProcessingDecision, ScoringResult } from '../types';
import { graphClient } from './graph-client';
import { featureExtractor } from './feature-extractor';
import { scorer } from './scorer';
import { mlClassifier } from './ml-classifier';
import { senderHistoryService } from './sender-history';
import { getDatabase } from '../db';
import { config } from '../config';

export class MessageProcessor {
  async processMessage(userId: string, messageId: string): Promise<ProcessingDecision> {
    const startTime = Date.now();

    // Check if already processed
    const existing = this.getExistingDecision(messageId);
    if (existing) {
      console.log(`Message ${messageId} already processed, skipping`);
      return existing;
    }

    try {
      // Fetch message and headers
      const message = await graphClient.getMessage(userId, messageId);
      const headers = await graphClient.getMessageHeaders(userId, messageId);

      // Extract features
      const features = await featureExtractor.extract(message, headers, userId);

      // Calculate base score
      let scoringResult: ScoringResult = scorer.score(features);

      // Apply ML if enabled
      let mlUsed = false;
      if (config.ml.enabled) {
        try {
          const emailText = this.buildEmailText(message);
          const mlResult = await this.withTimeout(
            mlClassifier.classify(features, emailText),
            config.ml.timeoutMs
          );

          // Adjust score based on ML result
          if (mlResult.score !== undefined) {
            scoringResult.mlScore = mlResult.score;
            scoringResult.mlConfidence = mlResult.confidence;
            scoringResult.mlRationale = mlResult.rationale;
            scoringResult.finalScore = Math.max(
              0,
              Math.min(100, scoringResult.baseScore + mlResult.score)
            );

            // Re-evaluate decision with ML score
            if (scoringResult.finalScore >= config.processing.riskThresholdJunk) {
              scoringResult.decision = 'junk';
            } else if (scoringResult.finalScore >= config.processing.riskThresholdWarning) {
              scoringResult.decision = 'warning';
            } else {
              scoringResult.decision = 'safe';
            }
          }

          mlUsed = true;
        } catch (error) {
          console.error('ML classification failed, falling back to rules only:', error);
        }
      }

      // Take action
      let actionTaken = 'none';
      if (scoringResult.decision === 'junk' && config.features.enableAutoMove) {
        try {
          await graphClient.moveMessageToJunk(userId, messageId);
          actionTaken = 'moved_to_junk';

          // Update headers
          await graphClient.updateMessageHeaders(userId, messageId, {
            'X-Invora-Risk-Score': scoringResult.finalScore.toString(),
            'X-Invora-Reasons': scoringResult.reasons
              .map((r) => `${r.rule}:${r.points}`)
              .join(','),
          });
        } catch (error) {
          console.error('Failed to move message to junk:', error);
          actionTaken = 'move_failed';
        }
      } else if (scoringResult.decision === 'warning') {
        actionTaken = 'warning_flagged';
      }

      // Record sender history
      await senderHistoryService.recordSender(userId, message);

      // Save decision
      const decision: ProcessingDecision = {
        messageId: message.id,
        internetMessageId: message.internetMessageId,
        userId,
        processedAt: new Date().toISOString(),
        riskScore: scoringResult.finalScore,
        decision: scoringResult.decision,
        reasons: scoringResult.reasons,
        mlUsed,
        actionTaken,
        processingTimeMs: Date.now() - startTime,
      };

      this.saveDecision(decision);

      return decision;
    } catch (error) {
      console.error('Message processing error:', error);
      throw error;
    }
  }

  private buildEmailText(message: EmailMessage): string {
    const parts = [message.subject];

    if (config.privacy.sendBodyToMl && message.body?.content) {
      // Limit body to first 1000 characters
      parts.push(message.body.content.substring(0, 1000));
    }

    return parts.join('\n');
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      ),
    ]);
  }

  private getExistingDecision(messageId: string): ProcessingDecision | null {
    const db = getDatabase();

    const row = db
      .prepare(
        `
      SELECT * FROM processing_decisions 
      WHERE message_id = ? OR internet_message_id = ?
    `
      )
      .get(messageId, messageId) as any;

    if (!row) {
      return null;
    }

    return {
      messageId: row.message_id,
      internetMessageId: row.internet_message_id,
      userId: row.user_id,
      processedAt: row.processed_at,
      riskScore: row.risk_score,
      decision: row.decision,
      reasons: JSON.parse(row.reasons),
      mlUsed: row.ml_used === 1,
      actionTaken: row.action_taken,
      processingTimeMs: row.processing_time_ms,
    };
  }

  private saveDecision(decision: ProcessingDecision): void {
    const db = getDatabase();

    db.prepare(
      `
      INSERT OR REPLACE INTO processing_decisions (
        message_id, internet_message_id, user_id, processed_at,
        risk_score, decision, reasons, ml_used, action_taken, processing_time_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      decision.messageId,
      decision.internetMessageId,
      decision.userId,
      decision.processedAt,
      decision.riskScore,
      decision.decision,
      JSON.stringify(decision.reasons),
      decision.mlUsed ? 1 : 0,
      decision.actionTaken,
      decision.processingTimeMs
    );
  }

  async getDecision(messageId: string): Promise<ProcessingDecision | null> {
    return this.getExistingDecision(messageId);
  }

  async getRecentDecisions(userId: string, limit: number = 200): Promise<ProcessingDecision[]> {
    const db = getDatabase();

    const rows = db
      .prepare(
        `
      SELECT * FROM processing_decisions 
      WHERE user_id = ?
      ORDER BY processed_at DESC
      LIMIT ?
    `
      )
      .all(userId, limit) as any[];

    return rows.map((row) => ({
      messageId: row.message_id,
      internetMessageId: row.internet_message_id,
      userId: row.user_id,
      processedAt: row.processed_at,
      riskScore: row.risk_score,
      decision: row.decision,
      reasons: JSON.parse(row.reasons),
      mlUsed: row.ml_used === 1,
      actionTaken: row.action_taken,
      processingTimeMs: row.processing_time_ms,
    }));
  }

  async getDecisionStats(userId: string): Promise<any> {
    const db = getDatabase();

    const stats = db
      .prepare(
        `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN decision = 'junk' THEN 1 ELSE 0 END) as junk_count,
        SUM(CASE WHEN decision = 'warning' THEN 1 ELSE 0 END) as warning_count,
        SUM(CASE WHEN decision = 'safe' THEN 1 ELSE 0 END) as safe_count,
        AVG(risk_score) as avg_risk_score,
        AVG(processing_time_ms) as avg_processing_time
      FROM processing_decisions
      WHERE user_id = ?
    `
      )
      .get(userId) as any;

    return stats;
  }
}

export const messageProcessor = new MessageProcessor();

