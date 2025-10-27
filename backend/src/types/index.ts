export interface EmailMessage {
  id: string;
  internetMessageId: string;
  conversationId: string;
  subject: string;
  from: EmailAddress;
  sender?: EmailAddress;
  replyTo: EmailAddress[];
  toRecipients: EmailAddress[];
  ccRecipients: EmailAddress[];
  receivedDateTime: string;
  hasAttachments: boolean;
  importance: string;
  internetMessageHeaders?: InternetHeader[];
  body?: {
    contentType: string;
    content: string;
  };
  attachments?: Attachment[];
}

export interface EmailAddress {
  name: string;
  address: string;
}

export interface InternetHeader {
  name: string;
  value: string;
}

export interface Attachment {
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
}

export interface RiskFeatures {
  // Header analysis
  spfResult?: 'pass' | 'fail' | 'none';
  dkimResult?: 'pass' | 'fail' | 'none';
  dmarcResult?: 'pass' | 'fail' | 'none';
  
  // From address analysis
  displayNameMismatch: boolean;
  replyToMismatch: boolean;
  suspiciousHomoglyphs: boolean;
  newlySeenDomain: boolean;
  
  // Domain reputation
  onAllowlist: boolean;
  onBlocklist: boolean;
  
  // Link analysis
  urlCount: number;
  urlShortenerPresent: boolean;
  suspiciousTldPresent: boolean;
  internationalizedDomainPresent: boolean;
  
  // Attachment analysis
  dangerousExtensionPresent: boolean;
  macroPresent: boolean;
  passwordProtectedArchive: boolean;
  doubleExtensionPresent: boolean;
  
  // Content analysis
  urgencyTermsPresent: boolean;
  paymentRequestPresent: boolean;
  cryptoTermsPresent: boolean;
  invoiceThemePresent: boolean;
  hrBenefitsThemePresent: boolean;
  
  // Thread context
  firstTimeSender: boolean;
  relationshipScore: number; // 0-10 based on past interactions
  
  // Time analysis
  unusualSendTime: boolean;
  
  // Visual analysis
  htmlOnlyMessage: boolean;
  highHiddenTextRatio: boolean;
  
  // Microsoft features
  safeLinkPresent: boolean;
}

export interface ScoringResult {
  baseScore: number;
  mlScore?: number;
  mlConfidence?: number;
  mlRationale?: string;
  finalScore: number;
  reasons: RiskReason[];
  decision: 'junk' | 'warning' | 'safe';
}

export interface RiskReason {
  rule: string;
  points: number;
  description: string;
}

export interface MLClassifierResult {
  label: 'spam' | 'phishing' | 'legitimate';
  confidence: number; // 0-1
  rationale: string;
  score?: number; // Optional 0-100 score adjustment
}

export interface MLClassifier {
  classify(features: RiskFeatures, emailText: string): Promise<MLClassifierResult>;
  healthCheck(): Promise<boolean>;
}

export interface ProcessingDecision {
  messageId: string;
  internetMessageId: string;
  userId: string;
  processedAt: string;
  riskScore: number;
  decision: string;
  reasons: RiskReason[];
  mlUsed: boolean;
  actionTaken: string;
  processingTimeMs: number;
}

export interface UserFeedback {
  messageId: string;
  userId: string;
  feedbackType: 'mark_safe' | 'mark_junk' | 'report_phish';
  timestamp: string;
  originalScore: number;
  originalDecision: string;
}

export interface DomainRule {
  domain: string;
  type: 'allow' | 'block';
  source: 'seed' | 'user_feedback' | 'admin';
  addedAt: string;
  expiresAt?: string;
}

export interface Config {
  server: {
    port: number;
    webhookBaseUrl: string;
  };
  graph: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  database: {
    path: string;
  };
  processing: {
    riskThresholdJunk: number;
    riskThresholdWarning: number;
    timeoutMs: number;
    pollingIntervalMs: number;
  };
  ml: {
    enabled: boolean;
    provider: string;
    timeoutMs: number;
  };
  privacy: {
    logFullEmailAddresses: boolean;
    sendBodyToMl: boolean;
  };
  features: {
    enableComposeWarning: boolean;
    enableAutoMove: boolean;
    enableFeedbackLearning: boolean;
  };
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  points: number;
  enabled: boolean;
}

export interface RulesConfig {
  version: string;
  rules: Rule[];
}

