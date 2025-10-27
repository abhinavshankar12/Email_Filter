import { scorer } from '../services/scorer';
import { RiskFeatures } from '../types';

describe('Scorer', () => {
  it('should score safe email with low risk', () => {
    const features: RiskFeatures = {
      spfResult: 'pass',
      dkimResult: 'pass',
      dmarcResult: 'pass',
      displayNameMismatch: false,
      replyToMismatch: false,
      suspiciousHomoglyphs: false,
      newlySeenDomain: false,
      onAllowlist: true,
      onBlocklist: false,
      urlCount: 2,
      urlShortenerPresent: false,
      suspiciousTldPresent: false,
      internationalizedDomainPresent: false,
      dangerousExtensionPresent: false,
      macroPresent: false,
      passwordProtectedArchive: false,
      doubleExtensionPresent: false,
      urgencyTermsPresent: false,
      paymentRequestPresent: false,
      cryptoTermsPresent: false,
      invoiceThemePresent: false,
      hrBenefitsThemePresent: false,
      firstTimeSender: false,
      relationshipScore: 8,
      unusualSendTime: false,
      htmlOnlyMessage: false,
      highHiddenTextRatio: false,
      safeLinkPresent: false,
    };

    const result = scorer.score(features);

    expect(result.finalScore).toBeLessThan(50);
    expect(result.decision).toBe('safe');
  });

  it('should score phishing email with high risk', () => {
    const features: RiskFeatures = {
      spfResult: 'fail',
      dkimResult: 'fail',
      dmarcResult: 'fail',
      displayNameMismatch: true,
      replyToMismatch: true,
      suspiciousHomoglyphs: true,
      newlySeenDomain: true,
      onAllowlist: false,
      onBlocklist: true,
      urlCount: 15,
      urlShortenerPresent: true,
      suspiciousTldPresent: true,
      internationalizedDomainPresent: false,
      dangerousExtensionPresent: true,
      macroPresent: false,
      passwordProtectedArchive: false,
      doubleExtensionPresent: false,
      urgencyTermsPresent: true,
      paymentRequestPresent: true,
      cryptoTermsPresent: false,
      invoiceThemePresent: false,
      hrBenefitsThemePresent: false,
      firstTimeSender: true,
      relationshipScore: 0,
      unusualSendTime: true,
      htmlOnlyMessage: true,
      highHiddenTextRatio: true,
      safeLinkPresent: false,
    };

    const result = scorer.score(features);

    expect(result.finalScore).toBeGreaterThanOrEqual(80);
    expect(result.decision).toBe('junk');
  });

  it('should include reason descriptions', () => {
    const features: RiskFeatures = {
      spfResult: 'fail',
      displayNameMismatch: true,
      suspiciousHomoglyphs: false,
      newlySeenDomain: false,
      onAllowlist: false,
      onBlocklist: false,
      urlCount: 0,
      urlShortenerPresent: false,
      suspiciousTldPresent: false,
      internationalizedDomainPresent: false,
      dangerousExtensionPresent: false,
      macroPresent: false,
      passwordProtectedArchive: false,
      doubleExtensionPresent: false,
      urgencyTermsPresent: false,
      paymentRequestPresent: false,
      cryptoTermsPresent: false,
      invoiceThemePresent: false,
      hrBenefitsThemePresent: false,
      firstTimeSender: false,
      relationshipScore: 5,
      unusualSendTime: false,
      htmlOnlyMessage: false,
      highHiddenTextRatio: false,
      safeLinkPresent: false,
      replyToMismatch: false,
    };

    const result = scorer.score(features);

    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons[0]).toHaveProperty('description');
    expect(result.reasons[0]).toHaveProperty('points');
  });
});

