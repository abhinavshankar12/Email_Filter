import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { config } from '../config';
import { EmailMessage } from '../types';

export class GraphClient {
  private client: Client | null = null;
  private credential: ClientSecretCredential;

  constructor() {
    this.credential = new ClientSecretCredential(
      config.graph.tenantId,
      config.graph.clientId,
      config.graph.clientSecret
    );
  }

  private getClient(): Client {
    if (!this.client) {
      const authProvider = new TokenCredentialAuthenticationProvider(this.credential, {
        scopes: ['https://graph.microsoft.com/.default'],
      });

      this.client = Client.initWithMiddleware({
        authProvider: authProvider,
      });
    }
    return this.client;
  }

  async getMessage(userId: string, messageId: string): Promise<EmailMessage> {
    const client = this.getClient();

    const message = await client
      .api(`/users/${userId}/messages/${messageId}`)
      .select(
        'id,internetMessageId,conversationId,subject,from,sender,replyTo,toRecipients,ccRecipients,receivedDateTime,hasAttachments,importance,body'
      )
      .expand('attachments($select=name,contentType,size,isInline)')
      .get();

    return message;
  }

  async getMessageHeaders(userId: string, messageId: string): Promise<any[]> {
    const client = this.getClient();

    const message = await client
      .api(`/users/${userId}/messages/${messageId}`)
      .select('internetMessageHeaders')
      .get();

    return message.internetMessageHeaders || [];
  }

  async moveMessageToJunk(userId: string, messageId: string): Promise<void> {
    const client = this.getClient();

    // Get the Junk Email folder
    const folders = await client.api(`/users/${userId}/mailFolders`).get();

    const junkFolder = folders.value.find(
      (f: any) => f.displayName === 'Junk Email' || f.displayName === 'Junk'
    );

    if (!junkFolder) {
      throw new Error('Junk Email folder not found');
    }

    // Move the message
    await client.api(`/users/${userId}/messages/${messageId}/move`).post({
      destinationId: junkFolder.id,
    });
  }

  async updateMessageHeaders(
    userId: string,
    messageId: string,
    headers: Record<string, string>
  ): Promise<void> {
    const client = this.getClient();

    // Note: Microsoft Graph doesn't support adding custom headers directly
    // We'll use extended properties instead
    const singleValueExtendedProperties = Object.entries(headers).map(([key, value]) => ({
      id: `String {00020329-0000-0000-C000-000000000046} Name ${key}`,
      value: value,
    }));

    await client.api(`/users/${userId}/messages/${messageId}`).patch({
      singleValueExtendedProperties,
    });
  }

  async createSubscription(
    userId: string,
    notificationUrl: string,
    clientState: string
  ): Promise<any> {
    const client = this.getClient();

    // Subscriptions expire after 4230 minutes (3 days) for mail resources
    const expirationDateTime = new Date();
    expirationDateTime.setMinutes(expirationDateTime.getMinutes() + 4230);

    const subscription = {
      changeType: 'created',
      notificationUrl: notificationUrl,
      resource: `/users/${userId}/messages`,
      expirationDateTime: expirationDateTime.toISOString(),
      clientState: clientState,
    };

    return await client.api('/subscriptions').post(subscription);
  }

  async renewSubscription(subscriptionId: string): Promise<any> {
    const client = this.getClient();

    const expirationDateTime = new Date();
    expirationDateTime.setMinutes(expirationDateTime.getMinutes() + 4230);

    return await client.api(`/subscriptions/${subscriptionId}`).patch({
      expirationDateTime: expirationDateTime.toISOString(),
    });
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    const client = this.getClient();
    await client.api(`/subscriptions/${subscriptionId}`).delete();
  }

  async getRecentMessages(userId: string, top: number = 50): Promise<any[]> {
    const client = this.getClient();

    const response = await client
      .api(`/users/${userId}/messages`)
      .select('id,internetMessageId,receivedDateTime')
      .orderby('receivedDateTime DESC')
      .top(top)
      .get();

    return response.value;
  }

  async getSenderHistory(userId: string, days: number = 90): Promise<Map<string, number>> {
    const client = this.getClient();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const response = await client
      .api(`/users/${userId}/messages`)
      .select('from')
      .filter(`receivedDateTime ge ${startDate.toISOString()}`)
      .top(1000)
      .get();

    const senderCounts = new Map<string, number>();
    response.value.forEach((msg: any) => {
      if (msg.from?.emailAddress?.address) {
        const address = msg.from.emailAddress.address.toLowerCase();
        senderCounts.set(address, (senderCounts.get(address) || 0) + 1);
      }
    });

    return senderCounts;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = this.getClient();
      await client.api('/me').select('id').get();
      return true;
    } catch (error) {
      console.error('Graph health check failed:', error);
      return false;
    }
  }
}

export const graphClient = new GraphClient();

