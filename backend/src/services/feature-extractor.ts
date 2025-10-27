import { EmailMessage, RiskFeatures, InternetHeader } from '../types';
import { headersParser, AuthenticationResults } from './headers-parser';
import { domainRulesService } from './domain-rules';
import { senderHistoryService } from './sender-history';

export class FeatureExtractor {
  async extract(
    message: EmailMessage,
    headers: InternetHeader[],
    userId: string
  ): Promise<RiskFeatures> {
    const authResults = headersParser.parseAuthenticationResults(headers);
    const features: RiskFeatures = {
      spfResult: authResults.spfResult,
      dkimResult: authResults.dkimResult,
      dmarcResult: authResults.dmarcResult,
      displayNameMismatch: this.checkDisplayNameMismatch(message),
      replyToMismatch: this.checkReplyToMismatch(message),
      suspiciousHomoglyphs: this.checkHomoglyphs(message),
      newlySeenDomain: await this.checkNewlySeenDomain(message, userId),
      onAllowlist: await domainRulesService.isOnAllowlist(
        this.extractDomain(message.from.address)
      ),
      onBlocklist: await domainRulesService.isOnBlocklist(
        this.extractDomain(message.from.address)
      ),
      urlCount: 0,
      urlShortenerPresent: false,
      suspiciousTldPresent: false,
      internationalizedDomainPresent: false,
      dangerousExtensionPresent: this.checkDangerousAttachments(message),
      macroPresent: this.checkMacroAttachments(message),
      passwordProtectedArchive: false, // Would need content inspection
      doubleExtensionPresent: this.checkDoubleExtension(message),
      urgencyTermsPresent: this.checkUrgencyTerms(message),
      paymentRequestPresent: this.checkPaymentTerms(message),
      cryptoTermsPresent: this.checkCryptoTerms(message),
      invoiceThemePresent: this.checkInvoiceTheme(message),
      hrBenefitsThemePresent: this.checkHRTheme(message),
      firstTimeSender: await this.checkFirstTimeSender(message, userId),
      relationshipScore: await this.calculateRelationshipScore(message, userId),
      unusualSendTime: this.checkUnusualSendTime(message),
      htmlOnlyMessage: this.checkHtmlOnly(message),
      highHiddenTextRatio: this.checkHiddenTextRatio(message),
      safeLinkPresent: headersParser.hasMicrosoftSafeLinks(headers),
    };

    // Extract and analyze URLs from body
    if (message.body?.content) {
      const urls = this.extractUrls(message.body.content);
      features.urlCount = urls.length;
      features.urlShortenerPresent = this.checkUrlShorteners(urls);
      features.suspiciousTldPresent = this.checkSuspiciousTlds(urls);
      features.internationalizedDomainPresent = this.checkInternationalizedDomains(urls);
    }

    return features;
  }

  private checkDisplayNameMismatch(message: EmailMessage): boolean {
    if (!message.from.name || !message.from.address) {
      return false;
    }

    const displayName = message.from.name.toLowerCase();
    const emailAddress = message.from.address.toLowerCase();
    const domain = this.extractDomain(emailAddress);

    // Check if display name contains a different domain
    const domainPattern = /[a-z0-9-]+\.[a-z]{2,}/gi;
    const domainsInName = displayName.match(domainPattern) || [];

    for (const nameDomain of domainsInName) {
      if (nameDomain !== domain && !domain.includes(nameDomain)) {
        return true;
      }
    }

    return false;
  }

  private checkReplyToMismatch(message: EmailMessage): boolean {
    if (!message.replyTo || message.replyTo.length === 0) {
      return false;
    }

    const fromAddress = message.from.address.toLowerCase();
    const replyToAddress = message.replyTo[0].address.toLowerCase();

    return fromAddress !== replyToAddress;
  }

  private checkHomoglyphs(message: EmailMessage): boolean {
    const address = message.from.address.toLowerCase();
    const domain = this.extractDomain(address);

    // Common homoglyph patterns
    const suspiciousPatterns = [
      /[а-яА-Я]/, // Cyrillic characters
      /[α-ωΑ-Ω]/, // Greek characters
      /\u200b|\u200c|\u200d/, // Zero-width characters
      /rn/g, // 'rn' can look like 'm'
    ];

    // Check for known lookalike domains
    const commonTargets = ['microsoft', 'paypal', 'amazon', 'apple', 'google', 'outlook'];

    for (const target of commonTargets) {
      if (domain.includes(target) && domain !== `${target}.com`) {
        return true;
      }
    }

    return suspiciousPatterns.some((pattern) => pattern.test(domain));
  }

  private async checkNewlySeenDomain(message: EmailMessage, userId: string): Promise<boolean> {
    const domain = this.extractDomain(message.from.address);
    return await senderHistoryService.isNewlySeenDomain(userId, domain, 90);
  }

  private checkDangerousAttachments(message: EmailMessage): boolean {
    if (!message.attachments || message.attachments.length === 0) {
      return false;
    }

    const dangerousExtensions = [
      '.exe',
      '.bat',
      '.cmd',
      '.com',
      '.pif',
      '.scr',
      '.vbs',
      '.js',
      '.jar',
      '.msi',
      '.dll',
      '.scr',
      '.hta',
      '.cpl',
      '.msc',
      '.reg',
    ];

    return message.attachments.some((att) =>
      dangerousExtensions.some((ext) => att.name.toLowerCase().endsWith(ext))
    );
  }

  private checkMacroAttachments(message: EmailMessage): boolean {
    if (!message.attachments || message.attachments.length === 0) {
      return false;
    }

    const macroExtensions = ['.xlsm', '.docm', '.pptm', '.xlam', '.dotm'];

    return message.attachments.some((att) =>
      macroExtensions.some((ext) => att.name.toLowerCase().endsWith(ext))
    );
  }

  private checkDoubleExtension(message: EmailMessage): boolean {
    if (!message.attachments || message.attachments.length === 0) {
      return false;
    }

    return message.attachments.some((att) => {
      const parts = att.name.split('.');
      return parts.length > 2; // file.pdf.exe
    });
  }

  private checkUrgencyTerms(message: EmailMessage): boolean {
    const urgencyTerms = [
      'urgent',
      'immediate action',
      'act now',
      'expires',
      'suspended',
      'limited time',
      'verify now',
      'confirm immediately',
      'account will be closed',
      'unusual activity',
    ];

    const text = this.getEmailText(message).toLowerCase();
    return urgencyTerms.some((term) => text.includes(term));
  }

  private checkPaymentTerms(message: EmailMessage): boolean {
    const paymentTerms = [
      'wire transfer',
      'payment required',
      'update payment',
      'billing problem',
      'credit card',
      'bank account',
      'paypal',
      'venmo',
      'refund',
      'payment failed',
    ];

    const text = this.getEmailText(message).toLowerCase();
    return paymentTerms.some((term) => text.includes(term));
  }

  private checkCryptoTerms(message: EmailMessage): boolean {
    const cryptoTerms = ['bitcoin', 'btc', 'ethereum', 'crypto', 'wallet', 'blockchain'];

    const text = this.getEmailText(message).toLowerCase();
    return cryptoTerms.some((term) => text.includes(term));
  }

  private checkInvoiceTheme(message: EmailMessage): boolean {
    const invoiceTerms = ['invoice', 'receipt', 'payment due', 'amount owed', 'billing statement'];

    const subject = message.subject.toLowerCase();
    const text = this.getEmailText(message).toLowerCase();

    return invoiceTerms.some((term) => subject.includes(term) || text.includes(term));
  }

  private checkHRTheme(message: EmailMessage): boolean {
    const hrTerms = [
      'hr department',
      'human resources',
      'benefits enrollment',
      'payroll',
      '401k',
      'w-2',
      'w2',
      'direct deposit',
    ];

    const subject = message.subject.toLowerCase();
    const text = this.getEmailText(message).toLowerCase();

    return hrTerms.some((term) => subject.includes(term) || text.includes(term));
  }

  private async checkFirstTimeSender(message: EmailMessage, userId: string): Promise<boolean> {
    return await senderHistoryService.isFirstTimeSender(userId, message.from.address);
  }

  private async calculateRelationshipScore(
    message: EmailMessage,
    userId: string
  ): Promise<number> {
    const history = await senderHistoryService.getSenderHistory(userId, message.from.address);

    if (!history) {
      return 0;
    }

    // Score based on message count: 0-10
    // 1 message = 1, 5 messages = 5, 10+ messages = 10
    return Math.min(history.message_count, 10);
  }

  private checkUnusualSendTime(message: EmailMessage): boolean {
    const received = new Date(message.receivedDateTime);
    const hour = received.getHours();

    // Flag emails sent between 11 PM and 5 AM local time
    return hour >= 23 || hour <= 5;
  }

  private checkHtmlOnly(message: EmailMessage): boolean {
    return message.body?.contentType === 'html';
  }

  private checkHiddenTextRatio(message: EmailMessage): boolean {
    if (!message.body || message.body.contentType !== 'html') {
      return false;
    }

    const content = message.body.content;

    // Look for hidden text indicators
    const hiddenPatterns = [
      /display:\s*none/gi,
      /visibility:\s*hidden/gi,
      /font-size:\s*0/gi,
      /color:\s*#ffffff/gi, // White text (assuming white background)
      /opacity:\s*0/gi,
    ];

    const hiddenMatches = hiddenPatterns.reduce(
      (count, pattern) => count + (content.match(pattern) || []).length,
      0
    );

    // If more than 5 hidden elements, flag it
    return hiddenMatches > 5;
  }

  private extractUrls(content: string): string[] {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    return [...new Set(content.match(urlRegex) || [])];
  }

  private checkUrlShorteners(urls: string[]): boolean {
    const shorteners = [
      'bit.ly',
      'tinyurl.com',
      'goo.gl',
      't.co',
      'ow.ly',
      'is.gd',
      'buff.ly',
      'adf.ly',
    ];

    return urls.some((url) => shorteners.some((shortener) => url.includes(shortener)));
  }

  private checkSuspiciousTlds(urls: string[]): boolean {
    const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.work', '.click'];

    return urls.some((url) => suspiciousTlds.some((tld) => url.toLowerCase().includes(tld)));
  }

  private checkInternationalizedDomains(urls: string[]): boolean {
    return urls.some((url) => /[^\x00-\x7F]/.test(url)); // Non-ASCII characters
  }

  private getEmailText(message: EmailMessage): string {
    return `${message.subject} ${message.body?.content || ''}`;
  }

  private extractDomain(email: string): string {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1].toLowerCase() : '';
  }
}

export const featureExtractor = new FeatureExtractor();

