import { InternetHeader } from '../types';

export interface AuthenticationResults {
  spfResult?: 'pass' | 'fail' | 'none';
  dkimResult?: 'pass' | 'fail' | 'none';
  dmarcResult?: 'pass' | 'fail' | 'none';
}

export class HeadersParser {
  parseAuthenticationResults(headers: InternetHeader[]): AuthenticationResults {
    const authHeader = headers.find(
      (h) =>
        h.name.toLowerCase() === 'authentication-results' ||
        h.name.toLowerCase() === 'x-microsoft-antispam-prvs'
    );

    if (!authHeader) {
      return {};
    }

    const value = authHeader.value.toLowerCase();
    const results: AuthenticationResults = {};

    // Parse SPF
    if (value.includes('spf=pass')) {
      results.spfResult = 'pass';
    } else if (value.includes('spf=fail') || value.includes('spf=softfail')) {
      results.spfResult = 'fail';
    } else if (value.includes('spf=none')) {
      results.spfResult = 'none';
    }

    // Parse DKIM
    if (value.includes('dkim=pass')) {
      results.dkimResult = 'pass';
    } else if (value.includes('dkim=fail')) {
      results.dkimResult = 'fail';
    } else if (value.includes('dkim=none')) {
      results.dkimResult = 'none';
    }

    // Parse DMARC
    if (value.includes('dmarc=pass')) {
      results.dmarcResult = 'pass';
    } else if (value.includes('dmarc=fail')) {
      results.dmarcResult = 'fail';
    } else if (value.includes('dmarc=none')) {
      results.dmarcResult = 'none';
    }

    return results;
  }

  hasMicrosoftSafeLinks(headers: InternetHeader[]): boolean {
    return headers.some(
      (h) =>
        h.name.toLowerCase() === 'x-ms-exchange-safelinks' ||
        h.value.toLowerCase().includes('safelinks.protection.outlook.com')
    );
  }

  getReceivedTime(headers: InternetHeader[]): Date | null {
    const receivedHeader = headers.find((h) => h.name.toLowerCase() === 'date');

    if (receivedHeader) {
      try {
        return new Date(receivedHeader.value);
      } catch {
        return null;
      }
    }

    return null;
  }

  extractAllUrls(headers: InternetHeader[]): string[] {
    const urls: string[] = [];
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

    headers.forEach((header) => {
      const matches = header.value.match(urlRegex);
      if (matches) {
        urls.push(...matches);
      }
    });

    return [...new Set(urls)]; // Remove duplicates
  }
}

export const headersParser = new HeadersParser();

