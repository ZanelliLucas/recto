import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import nodemailer, { type Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  /** Version texte, toujours présente : lue par les clients qui refusent le HTML. */
  text: string;
  html?: string;
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
    const base = path.join(this.directory, String(Date.now()));
    await writeFile(`${base}.txt`, `À : ${message.to}\nObjet : ${message.subject}\n\n${message.text}\n`);
    // Version HTML à ouvrir dans un navigateur pour en vérifier la mise en forme.
    if (message.html) await writeFile(`${base}.html`, message.html);
    console.log(`Courriel écrit dans ${base}.txt`);
  }
}

/** Tests : les courriels sont conservés en mémoire. */
export class MemoryMailer implements Mailer {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }
}
