import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Avatar, ProfilePatch, PublicUser } from '@recto/shared';
import { HttpError } from '../http/httpError';
import type { Mailer } from '../mail/mailer';
import { hashPassword, verifyPassword } from './passwords';
import type { SqlUserRepository, TokenPurpose, UserRecord } from './userRepository';

const HOUR = 60 * 60 * 1000;
/** EF-4.2 et EF-4.3 — liens à usage unique et à durée limitée. */
const TOKEN_TTL: Record<TokenPurpose, number> = { verification: 48 * HOUR, reinitialisation: HOUR };

const digest = (token: string) => createHash('sha256').update(token).digest('base64url');

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const pseudoKey = (pseudo: string) => pseudo.trim().toLocaleLowerCase('fr');

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    pseudo: user.pseudo,
    avatar: user.avatar as Avatar,
    role: user.role,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: new Date(user.createdAt).toISOString(),
  };
}

interface AuthOptions {
  appUrl: string;
  now?: () => number;
}

/** Comptes utilisateurs (EF-4) : inscription, vérification, connexion, réinitialisation, profil. */
export class AuthService {
  private readonly now: () => number;

  constructor(
    private readonly users: SqlUserRepository,
    private readonly mailer: Mailer,
    private readonly options: AuthOptions,
  ) {
    this.now = options.now ?? Date.now;
  }

  /** EF-4.1 — adresse et pseudonyme uniques ; le courriel de vérification part aussitôt. */
  async register(input: { email: string; password: string; pseudo: string; avatar: Avatar }): Promise<UserRecord> {
    const email = normalizeEmail(input.email);
    const pseudo = input.pseudo.trim();
    if (await this.users.findByEmail(email)) {
      throw new HttpError(409, 'email_existant', 'Un compte existe déjà avec cette adresse.');
    }
    if (await this.users.findByPseudoKey(pseudoKey(pseudo))) {
      throw new HttpError(409, 'pseudo_existant', 'Ce pseudonyme est déjà pris.');
    }
    const user: UserRecord = {
      id: randomUUID(),
      email,
      passwordHash: await hashPassword(input.password),
      pseudo,
      pseudoKey: pseudoKey(pseudo),
      avatar: input.avatar,
      role: 'joueur',
      emailVerifiedAt: null,
      tokenVersion: 0,
      createdAt: this.now(),
    };
    await this.users.insert(user);
    await this.sendVerification(user);
    return user;
  }

  async login(email: string, password: string): Promise<UserRecord> {
    const user = await this.users.findByEmail(normalizeEmail(email));
    if (!(await verifyPassword(user?.passwordHash ?? null, password)) || !user) {
      throw new HttpError(401, 'identifiants_invalides', 'Adresse ou mot de passe incorrect.');
    }
    return user;
  }

  async sendVerification(user: UserRecord): Promise<void> {
    if (user.emailVerifiedAt !== null) return;
    const token = await this.issueToken(user.id, 'verification');
    await this.mailer.send({
      to: user.email,
      subject: 'RECTO — confirmez votre adresse',
      text: [
        `Bonjour ${user.pseudo},`,
        '',
        'Pour confirmer votre adresse et finaliser votre compte RECTO, ouvrez ce lien :',
        `${this.options.appUrl}/verification?jeton=${token}`,
        '',
        'Ce lien est valable 48 heures et ne sert qu’une fois.',
        'Si vous n’avez pas créé de compte, ignorez ce message.',
      ].join('\n'),
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await this.users.consumeToken(digest(token), 'verification', this.now());
    if (!userId) throw invalidToken();
    await this.users.update(userId, { emailVerifiedAt: this.now() });
  }

  /** Réponse identique que l'adresse soit inscrite ou non : rien n'est révélé. */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.users.findByEmail(normalizeEmail(email));
    if (!user) return;
    const token = await this.issueToken(user.id, 'reinitialisation');
    await this.mailer.send({
      to: user.email,
      subject: 'RECTO — réinitialisation du mot de passe',
      text: [
        `Bonjour ${user.pseudo},`,
        '',
        'Pour choisir un nouveau mot de passe, ouvrez ce lien :',
        `${this.options.appUrl}/reinitialisation?jeton=${token}`,
        '',
        'Ce lien est valable une heure et ne sert qu’une fois.',
        'Si vous n’êtes pas à l’origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.',
      ].join('\n'),
    });
  }

  /** EF-4.3 — nouveau mot de passe ; toutes les sessions ouvertes sont révoquées. */
  async resetPassword(token: string, password: string): Promise<UserRecord> {
    const userId = await this.users.consumeToken(digest(token), 'reinitialisation', this.now());
    if (!userId) throw invalidToken();
    const user = (await this.users.findById(userId))!;
    // Le lien reçu prouve la possession de l'adresse.
    await this.users.update(userId, {
      passwordHash: await hashPassword(password),
      tokenVersion: user.tokenVersion + 1,
      emailVerifiedAt: user.emailVerifiedAt ?? this.now(),
    });
    return (await this.users.findById(userId))!;
  }

  async changePassword(user: UserRecord, current: string, next: string): Promise<UserRecord> {
    await this.confirmPassword(user, current);
    await this.users.update(user.id, { passwordHash: await hashPassword(next), tokenVersion: user.tokenVersion + 1 });
    return (await this.users.findById(user.id))!;
  }

  async updateProfile(user: UserRecord, patch: ProfilePatch): Promise<UserRecord> {
    const update: Partial<UserRecord> = {};
    if (patch.pseudo !== undefined && patch.pseudo.trim() !== user.pseudo) {
      const key = pseudoKey(patch.pseudo);
      const holder = await this.users.findByPseudoKey(key);
      if (holder && holder.id !== user.id) throw new HttpError(409, 'pseudo_existant', 'Ce pseudonyme est déjà pris.');
      update.pseudo = patch.pseudo.trim();
      update.pseudoKey = key;
    }
    if (patch.avatar !== undefined) update.avatar = patch.avatar;
    if (Object.keys(update).length > 0) await this.users.update(user.id, update);
    return (await this.users.findById(user.id))!;
  }

  /** EF-4.5, ENF-6.3 — suppression définitive, sur confirmation du mot de passe. */
  async deleteAccount(user: UserRecord, password: string): Promise<void> {
    await this.confirmPassword(user, password);
    await this.users.delete(user.id);
  }

  private async confirmPassword(user: UserRecord, password: string): Promise<void> {
    if (!(await verifyPassword(user.passwordHash, password))) {
      throw new HttpError(403, 'mot_de_passe_incorrect', 'Mot de passe incorrect.');
    }
  }

  private async issueToken(userId: string, purpose: TokenPurpose): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const now = this.now();
    await this.users.replaceToken({ tokenHash: digest(token), userId, purpose, expiresAt: now + TOKEN_TTL[purpose], createdAt: now });
    return token;
  }
}

function invalidToken(): HttpError {
  return new HttpError(400, 'jeton_invalide', 'Ce lien est invalide, expiré ou déjà utilisé.');
}
