import nodemailer from 'nodemailer';
import type { Mailer, SentMessage } from './digest.types';
import { env } from '@/config/env';

export function createNodemailerMailer(): Mailer {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return {
    async send(msg) {
      await transporter.sendMail({ from: env.SMTP_FROM, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html });
    },
  };
}

export function createFakeMailer() {
  const sent: SentMessage[] = [];
  let fail: ((m: SentMessage) => boolean) | null = null;
  const mailer: Mailer & { sent: SentMessage[]; failOn(predicate: (m: SentMessage) => boolean): void } = {
    async send(msg) {
      if (fail?.(msg)) throw new Error(`Mail failed for ${msg.to}`);
      sent.push(msg);
    },
    sent,
    failOn(predicate) { fail = predicate; },
  };
  return mailer;
}
