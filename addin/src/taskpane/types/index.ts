export interface ProcessingDecision {
  messageId: string;
  internetMessageId: string;
  userId: string;
  processedAt: string;
  riskScore: number;
  baseScore?: number;
  mlScore?: number;
  mlConfidence?: number;
  mlRationale?: string;
  decision: 'junk' | 'warning' | 'safe';
  reasons: RiskReason[];
  mlUsed: boolean;
  actionTaken: string;
  processingTimeMs: number;
}

export interface RiskReason {
  rule: string;
  points: number;
  description: string;
}

export interface UserFeedback {
  messageId: string;
  userId: string;
  feedbackType: 'mark_safe' | 'mark_junk' | 'report_phish';
  timestamp: string;
  originalScore: number;
  originalDecision: string;
}

