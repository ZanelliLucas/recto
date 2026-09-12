import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import nodemailer, { type Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/** Envoi réel par SMTP (production). */
export class SmtpMailer implements Mailer {
  private readonly transport: Transporter;

  constructor(
    smtpUrl: string,
    private readonly from: string,
  ) {
    this.transport = nodemailer.createTransport(smtpUrl);
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport.sendMail({ from: this.from, ...message });
  }
}

/** Développement : aucun envoi, le courriel est écrit sur disque et signalé dans la console. */
export class FileMailer implements Mailer {
  constructor(private readonly directory: string) {}

  async send(message: MailMessage): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const file = path.join(this.directory, `${Date.now()}.txt`);
    await writeFile(file, `À : ${message.to}\nObjet : ${message.subject}\n\n${message.text}\n`);
    console.log(`Courriel écrit dans ${file}`);
  }
}

/** Tests : les courriels sont conservés en mémoire. */
export class MemoryMailer implements Mailer {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }
}
