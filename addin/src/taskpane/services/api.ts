import axios, { AxiosInstance } from 'axios';
import { ProcessingDecision } from '../types';

class ApiService {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:3000/api';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async classifyMessage(userId: string, messageId: string): Promise<ProcessingDecision> {
    const response = await this.client.post('/classify', {
      userId,
      messageId,
    });
    return response.data;
  }

  async getDecision(messageId: string): Promise<ProcessingDecision | null> {
    try {
      const response = await this.client.get(`/classify/${messageId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async submitFeedback(
    userId: string,
    messageId: string,
    feedbackType: 'mark_safe' | 'mark_junk' | 'report_phish'
  ): Promise<void> {
    await this.client.post('/feedback', {
      userId,
      messageId,
      feedbackType,
    });
  }

  async getRecentDecisions(userId: string, limit: number = 200): Promise<ProcessingDecision[]> {
    const response = await this.client.get(`/classify/user/${userId}/recent`, {
      params: { limit },
    });
    return response.data;
  }

  async getStats(userId: string): Promise<any> {
    const response = await this.client.get(`/classify/user/${userId}/stats`);
    return response.data;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'ok';
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();

