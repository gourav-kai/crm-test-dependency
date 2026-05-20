export interface SentMessage { to: string; subject: string; text: string; html?: string; }

export interface Mailer {
  send(msg: SentMessage): Promise<void>;
}

export interface DigestRun {
  id: number;
  runAt: string;
  triggeredBy: 'cron' | 'manual';
  recipientsCount: number;
  successCount: number;
  failureCount: number;
  notes: string | null;
}
