import { EventEmitter } from 'events';

/**
 * Notification types
 */
export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
}

/**
 * Notification severity levels
 */
export enum NotificationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  enabled: boolean;
  type: NotificationType;
  recipient: string; // email or phone number
  severityFilter?: NotificationSeverity[];
  deviceFilter?: number[]; // specific device IDs
}

/**
 * Notification message
 */
export interface NotificationMessage {
  id: string;
  type: NotificationType;
  recipient: string;
  subject?: string;
  body: string;
  severity: NotificationSeverity;
  deviceId: number;
  alertId: number;
  timestamp: number;
  status: 'pending' | 'sent' | 'failed';
  retryCount: number;
  maxRetries: number;
}

/**
 * Notification provider interface
 */
interface NotificationProvider {
  send(message: NotificationMessage): Promise<void>;
  isConfigured(): boolean;
}

/**
 * Email notification provider
 */
class EmailProvider implements NotificationProvider {
  private configured: boolean = false;
  private apiKey: string | null = null;

  constructor() {
    // Initialize with environment variable or configuration
    this.apiKey = process.env.EMAIL_API_KEY || null;
    this.configured = !!this.apiKey;
  }

  async send(message: NotificationMessage): Promise<void> {
    if (!this.configured) {
      console.warn('[Email Provider] Not configured, skipping email');
      return;
    }

    try {
      // Simulate email sending - in production, use SendGrid, AWS SES, etc.
      console.log(`[Email] Sending to ${message.recipient}`);
      console.log(`  Subject: ${message.subject}`);
      console.log(`  Body: ${message.body}`);
      console.log(`  Severity: ${message.severity}`);

      // In production, implement actual email sending:
      // const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.apiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     personalizations: [{ to: [{ email: message.recipient }] }],
      //     from: { email: 'alerts@smartfactory.io' },
      //     subject: message.subject,
      //     content: [{ type: 'text/plain', value: message.body }],
      //   }),
      // });
      // if (!response.ok) throw new Error('Failed to send email');
    } catch (error) {
      console.error('[Email Provider] Error:', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }
}

/**
 * SMS notification provider
 */
class SMSProvider implements NotificationProvider {
  private configured: boolean = false;
  private apiKey: string | null = null;

  constructor() {
    // Initialize with environment variable or configuration
    this.apiKey = process.env.SMS_API_KEY || null;
    this.configured = !!this.apiKey;
  }

  async send(message: NotificationMessage): Promise<void> {
    if (!this.configured) {
      console.warn('[SMS Provider] Not configured, skipping SMS');
      return;
    }

    try {
      // Simulate SMS sending - in production, use Twilio, AWS SNS, etc.
      console.log(`[SMS] Sending to ${message.recipient}`);
      console.log(`  Body: ${message.body}`);
      console.log(`  Severity: ${message.severity}`);

      // In production, implement actual SMS sending:
      // const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      //     'Content-Type': 'application/x-www-form-urlencoded',
      //   },
      //   body: new URLSearchParams({
      //     From: '+1234567890',
      //     To: message.recipient,
      //     Body: message.body,
      //   }).toString(),
      // });
      // if (!response.ok) throw new Error('Failed to send SMS');
    } catch (error) {
      console.error('[SMS Provider] Error:', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }
}

/**
 * Push notification provider
 */
class PushProvider implements NotificationProvider {
  private configured: boolean = false;

  constructor() {
    this.configured = !!process.env.PUSH_ENABLED;
  }

  async send(message: NotificationMessage): Promise<void> {
    if (!this.configured) {
      console.warn('[Push Provider] Not configured, skipping push notification');
      return;
    }

    try {
      console.log(`[Push] Sending notification`);
      console.log(`  Body: ${message.body}`);
      console.log(`  Severity: ${message.severity}`);
    } catch (error) {
      console.error('[Push Provider] Error:', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }
}

/**
 * Notification service manager
 * Handles sending notifications through multiple channels
 */
export class NotificationService extends EventEmitter {
  private emailProvider: EmailProvider;
  private smsProvider: SMSProvider;
  private pushProvider: PushProvider;
  private configs: Map<string, NotificationConfig> = new Map();
  private messageQueue: NotificationMessage[] = [];
  private isProcessing: boolean = false;

  constructor() {
    super();
    this.emailProvider = new EmailProvider();
    this.smsProvider = new SMSProvider();
    this.pushProvider = new PushProvider();
  }

  /**
   * Register notification configuration
   */
  public registerConfig(configId: string, config: NotificationConfig): void {
    this.configs.set(configId, config);
    console.log(`[Notification Service] Registered config: ${configId}`);
  }

  /**
   * Send notification for alert
   */
  public async sendAlertNotification(
    deviceId: number,
    alertId: number,
    severity: NotificationSeverity,
    message: string,
    subject?: string
  ): Promise<void> {
    // Find applicable configurations
    const applicableConfigs = Array.from(this.configs.values()).filter((config) => {
      if (!config.enabled) return false;
      if (config.deviceFilter && !config.deviceFilter.includes(deviceId)) return false;
      if (config.severityFilter && !config.severityFilter.includes(severity)) return false;
      return true;
    });

    for (const config of applicableConfigs) {
      const notification: NotificationMessage = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: config.type,
        recipient: config.recipient,
        subject: subject || `Alert: Device ${deviceId}`,
        body: message,
        severity,
        deviceId,
        alertId,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
      };

      this.messageQueue.push(notification);
    }

    // Process queue
    this.processQueue();
  }

  /**
   * Process notification queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const notification = this.messageQueue.shift();
      if (!notification) break;

      try {
        await this.sendNotification(notification);
        notification.status = 'sent';
        this.emit('notification_sent', notification);
      } catch (error) {
        notification.retryCount++;
        if (notification.retryCount < notification.maxRetries) {
          // Re-queue for retry
          this.messageQueue.push(notification);
          console.log(`[Notification Service] Queued for retry: ${notification.id}`);
        } else {
          notification.status = 'failed';
          this.emit('notification_failed', notification);
          console.error(`[Notification Service] Failed to send notification: ${notification.id}`);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Send single notification
   */
  private async sendNotification(notification: NotificationMessage): Promise<void> {
    switch (notification.type) {
      case NotificationType.EMAIL:
        await this.emailProvider.send(notification);
        break;
      case NotificationType.SMS:
        await this.smsProvider.send(notification);
        break;
      case NotificationType.PUSH:
        await this.pushProvider.send(notification);
        break;
      default:
        throw new Error(`Unknown notification type: ${notification.type}`);
    }
  }

  /**
   * Get notification configurations
   */
  public getConfigs(): NotificationConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Update notification configuration
   */
  public updateConfig(configId: string, config: Partial<NotificationConfig>): void {
    const existing = this.configs.get(configId);
    if (existing) {
      this.configs.set(configId, { ...existing, ...config });
      console.log(`[Notification Service] Updated config: ${configId}`);
    }
  }

  /**
   * Delete notification configuration
   */
  public deleteConfig(configId: string): void {
    this.configs.delete(configId);
    console.log(`[Notification Service] Deleted config: ${configId}`);
  }

  /**
   * Get queue size
   */
  public getQueueSize(): number {
    return this.messageQueue.length;
  }
}

export const notificationService = new NotificationService();
