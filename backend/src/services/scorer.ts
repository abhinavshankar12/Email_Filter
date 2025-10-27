import { RiskFeatures, ScoringResult, RiskReason, RulesConfig } from '../types';
import { config } from '../config';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

export class Scorer {
  private rules: RulesConfig | null = null;

  constructor() {
    this.loadRules();
  }

  private loadRules(): void {
    try {
      const rulesPath = path.join(__dirname, '../data/rules.yaml');
      const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
      this.rules = yaml.parse(rulesContent);
    } catch (error) {
      console.error('Failed to load rules:', error);
      throw error;
    }
  }

  score(features: RiskFeatures): ScoringResult {
    if (!this.rules) {
      throw new Error('Rules not loaded');
    }

    let baseScore = 0;
    const reasons: RiskReason[] = [];

    // Authentication failures
    if (features.spfResult === 'none') {
      const rule = this.getRule('no_spf');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    } else if (features.spfResult === 'fail') {
      const rule = this.getRule('spf_fail');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    if (features.dkimResult === 'fail') {
      const rule = this.getRule('dkim_fail');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    if (features.dmarcResult === 'fail') {
      const rule = this.getRule('dmarc_fail');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    // From address anomalies
    if (features.displayNameMismatch) {
      const rule = this.getRule('display_name_mismatch');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    if (features.replyToMismatch) {
      const rule = this.getRule('reply_to_mismatch');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    if (features.suspiciousHomoglyphs) {
      const rule = this.getRule('suspicious_homoglyphs');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    if (features.newlySeenDomain) {
      const rule = this.getRule('newly_seen_domain');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    // Domain reputation (allowlist reduces score, blocklist increases)
    if (features.onBlocklist) {
      const rule = this.getRule('on_blocklist');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    if (features.onAllowlist) {
      const rule = this.getRule('on_allowlist');
      baseScore += rule.points; // This is negative
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    // Link analysis
    if (features.urlShortenerPresent) {
      const rule = this.getRule('url_shortener_present');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    if (features.suspiciousTldPresent) {
      const rule = this.getRule('suspicious_tld');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    if (features.internationalizedDomainPresent) {
      const rule = this.getRule('internationalized_domain');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    if (features.urlCount > 10) {
      const rule = this.getRule('excessive_urls');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    // Attachment analysis
    if (features.dangerousExtensionPresent) {
      const rule = this.getRule('dangerous_extension');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    if (features.macroPresent) {
      const rule = this.getRule('macro_present');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    if (features.passwordProtectedArchive) {
      const rule = this.getRule('password_protected_archive');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    if (features.doubleExtensionPresent) {
      const rule = this.getRule('double_extension');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    // Content analysis
    if (features.urgencyTermsPresent) {
      const rule = this.getRule('urgency_terms');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    if (features.paymentRequestPresent) {
      const rule = this.getRule('payment_request');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    if (features.cryptoTermsPresent) {
      const rule = this.getRule('crypto_terms');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    if (features.invoiceThemePresent) {
      const rule = this.getRule('invoice_theme');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    if (features.hrBenefitsThemePresent) {
      const rule = this.getRule('hr_benefits_theme');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    // Thread context
    if (features.firstTimeSender) {
      const rule = this.getRule('first_time_sender');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    if (features.relationshipScore < 3) {
      const rule = this.getRule('low_relationship_score');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    // Time analysis
    if (features.unusualSendTime) {
      const rule = this.getRule('unusual_send_time');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    // Visual analysis
    if (features.htmlOnlyMessage) {
      const rule = this.getRule('html_only_message');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    if (features.highHiddenTextRatio) {
      const rule = this.getRule('high_hidden_text_ratio');
      baseScore += rule.points;
      reasons.push({
        rule: rule.id,
        points: rule.points,
        description: rule.description,
      });
    }

    // Ensure score is between 0 and 100
    baseScore = Math.max(0, Math.min(100, baseScore));

    // Determine decision
    let decision: 'junk' | 'warning' | 'safe' = 'safe';
    if (baseScore >= config.processing.riskThresholdJunk) {
      decision = 'junk';
    } else if (baseScore >= config.processing.riskThresholdWarning) {
      decision = 'warning';
    }

    return {
      baseScore,
      finalScore: baseScore,
      reasons,
      decision,
    };
  }

  private getRule(id: string): any {
    if (!this.rules) {
      throw new Error('Rules not loaded');
    }

    const rule = this.rules.rules.find((r) => r.id === id);
    if (!rule) {
      throw new Error(`Rule not found: ${id}`);
    }

    return rule;
  }
}

export const scorer = new Scorer();

