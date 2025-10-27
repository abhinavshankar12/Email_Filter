import { MLClassifier, MLClassifierResult, RiskFeatures } from '../types';
import { config } from '../config';
import axios from 'axios';

// Mock ML Classifier for demonstration
export class MockMLClassifier implements MLClassifier {
  async classify(features: RiskFeatures, emailText: string): Promise<MLClassifierResult> {
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simple heuristic-based mock classification
    let confidence = 0.5;
    let label: 'spam' | 'phishing' | 'legitimate' = 'legitimate';
    let rationale = 'Email appears legitimate based on standard checks.';

    // High-risk indicators suggest phishing
    if (
      features.suspiciousHomoglyphs ||
      features.onBlocklist ||
      (features.urgencyTermsPresent && features.paymentRequestPresent)
    ) {
      label = 'phishing';
      confidence = 0.85;
      rationale =
        'Email shows phishing indicators: suspicious domain patterns and urgency tactics.';
    }
    // Medium-risk indicators suggest spam
    else if (
      features.urlShortenerPresent ||
      features.htmlOnlyMessage ||
      features.cryptoTermsPresent
    ) {
      label = 'spam';
      confidence = 0.75;
      rationale = 'Email shows spam characteristics: promotional content and suspicious links.';
    }
    // Trusted sources
    else if (features.onAllowlist && features.relationshipScore > 5) {
      label = 'legitimate';
      confidence = 0.95;
      rationale = 'Email from trusted sender with established communication history.';
    }

    return {
      label,
      confidence,
      rationale,
      score: label === 'phishing' ? 30 : label === 'spam' ? 15 : -10,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

// OpenAI-based ML Classifier
export class OpenAIClassifier implements MLClassifier {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
  }

  async classify(features: RiskFeatures, emailText: string): Promise<MLClassifierResult> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = this.buildPrompt(features, emailText);

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You are an email security expert. Analyze emails and classify them as spam, phishing, or legitimate. Respond in JSON format with: label (spam/phishing/legitimate), confidence (0-1), and rationale (brief explanation).',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 150,
          temperature: 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: config.ml.timeoutMs,
        }
      );

      const content = response.data.choices[0].message.content;
      const result = JSON.parse(content);

      return {
        label: result.label,
        confidence: result.confidence,
        rationale: result.rationale,
        score: this.calculateScore(result.label, result.confidence),
      };
    } catch (error) {
      console.error('OpenAI classification error:', error);
      throw error;
    }
  }

  private buildPrompt(features: RiskFeatures, emailText: string): string {
    const featureSummary = `
Features:
- Authentication: SPF=${features.spfResult}, DKIM=${features.dkimResult}, DMARC=${features.dmarcResult}
- Display name mismatch: ${features.displayNameMismatch}
- Suspicious homoglyphs: ${features.suspiciousHomoglyphs}
- On blocklist: ${features.onBlocklist}
- On allowlist: ${features.onAllowlist}
- URL count: ${features.urlCount}
- URL shorteners: ${features.urlShortenerPresent}
- Dangerous attachments: ${features.dangerousExtensionPresent}
- Urgency terms: ${features.urgencyTermsPresent}
- Payment request: ${features.paymentRequestPresent}
- First time sender: ${features.firstTimeSender}

Email text (truncated): ${emailText.substring(0, 500)}
    `.trim();

    return featureSummary;
  }

  private calculateScore(label: string, confidence: number): number {
    if (label === 'phishing') {
      return Math.round(30 * confidence);
    } else if (label === 'spam') {
      return Math.round(15 * confidence);
    } else {
      return Math.round(-10 * confidence);
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      await axios.get('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }
}

// Factory function to get the appropriate classifier
export function getMLClassifier(): MLClassifier {
  if (!config.ml.enabled) {
    return new MockMLClassifier();
  }

  const provider = config.ml.provider.toLowerCase();

  if (provider === 'openai') {
    return new OpenAIClassifier();
  }

  // Default to mock
  return new MockMLClassifier();
}

export const mlClassifier = getMLClassifier();

