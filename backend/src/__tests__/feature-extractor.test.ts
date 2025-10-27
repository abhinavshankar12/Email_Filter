import { featureExtractor } from '../services/feature-extractor';
import { EmailMessage, InternetHeader } from '../types';

describe('FeatureExtractor', () => {
  const mockHeaders: InternetHeader[] = [
    {
      name: 'Authentication-Results',
      value: 'spf=pass dkim=pass dmarc=pass',
    },
  ];

  it('should extract authentication results from headers', async () => {
    const message: EmailMessage = {
      id: 'msg1',
      internetMessageId: '<test@example.com>',
      conversationId: 'conv1',
      subject: 'Test',
      from: { name: 'Test User', address: 'test@example.com' },
      replyTo: [],
      toRecipients: [],
      ccRecipients: [],
      receivedDateTime: new Date().toISOString(),
      hasAttachments: false,
      importance: 'normal',
    };

    const features = await featureExtractor.extract(message, mockHeaders, 'user@test.com');

    expect(features.spfResult).toBe('pass');
    expect(features.dkimResult).toBe('pass');
    expect(features.dmarcResult).toBe('pass');
  });

  it('should detect reply-to mismatch', async () => {
    const message: EmailMessage = {
      id: 'msg2',
      internetMessageId: '<test@example.com>',
      conversationId: 'conv1',
      subject: 'Test',
      from: { name: 'Test User', address: 'test@example.com' },
      replyTo: [{ name: 'Different User', address: 'different@other.com' }],
      toRecipients: [],
      ccRecipients: [],
      receivedDateTime: new Date().toISOString(),
      hasAttachments: false,
      importance: 'normal',
    };

    const features = await featureExtractor.extract(message, mockHeaders, 'user@test.com');

    expect(features.replyToMismatch).toBe(true);
  });

  it('should detect urgency terms in email content', async () => {
    const message: EmailMessage = {
      id: 'msg3',
      internetMessageId: '<test@example.com>',
      conversationId: 'conv1',
      subject: 'URGENT: Immediate action required',
      from: { name: 'Test User', address: 'test@example.com' },
      replyTo: [],
      toRecipients: [],
      ccRecipients: [],
      receivedDateTime: new Date().toISOString(),
      hasAttachments: false,
      importance: 'normal',
      body: {
        contentType: 'text',
        content: 'Your account will be suspended unless you act now!',
      },
    };

    const features = await featureExtractor.extract(message, mockHeaders, 'user@test.com');

    expect(features.urgencyTermsPresent).toBe(true);
  });

  it('should detect dangerous attachments', async () => {
    const message: EmailMessage = {
      id: 'msg4',
      internetMessageId: '<test@example.com>',
      conversationId: 'conv1',
      subject: 'Invoice',
      from: { name: 'Test User', address: 'test@example.com' },
      replyTo: [],
      toRecipients: [],
      ccRecipients: [],
      receivedDateTime: new Date().toISOString(),
      hasAttachments: true,
      importance: 'normal',
      attachments: [
        {
          name: 'invoice.exe',
          contentType: 'application/x-msdownload',
          size: 1024,
          isInline: false,
        },
      ],
    };

    const features = await featureExtractor.extract(message, mockHeaders, 'user@test.com');

    expect(features.dangerousExtensionPresent).toBe(true);
  });
});

