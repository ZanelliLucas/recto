import { describe, expect, it } from 'vitest';
import { PASSWORD, lastToken, register, setup } from './helpers';

describe('inscription (EF-4.1, EF-4.2)', () => {
  it('ouvre une session httpOnly et envoie un lien de vérification à usage unique', async () => {
    const ctx = await setup([]);
    const response = await ctx.agent
      .post('/api/auth/register')
      .send({ email: ' Alice@Exemple.fr ', pseudo: 'Alice', password: PASSWORD, avatar: 'lune', ageConfirmed: true })
      .expect(201);
    expect(String(response.headers['set-cookie'])).toMatch(/recto_session=.+HttpOnly.+SameSite=Lax/i);
    expect(response.body).toMatchObject({ email: 'alice@exemple.fr', pseudo: 'Alice', avatar: 'lune', emailVerified: false, role: 'joueur' });
    expect(response.body).not.toHaveProperty('passwordHash');

    expect(ctx.mailer.sent).toHaveLength(1);
    expect(ctx.mailer.sent[0]!.text).toContain('https://recto.test/verification?jeton=');
    const token = lastToken(ctx);
    await ctx.agent.post('/api/auth/verify-email').send({ token }).expect(204);
    expect((await ctx.agent.get('/api/auth/me').expect(200)).body.user.emailVerified).toBe(true);
    await ctx.agent.post('/api/auth/verify-email').send({ token }).expect(400);
  });

  it('valide les champs et refuse adresse ou pseudonyme déjà pris', async () => {
    const ctx = await setup([]);
    const base = { email: 'bob@exemple.fr', pseudo: 'Bob', password: PASSWORD, avatar: 'onde', ageConfirmed: true };
    await ctx.agent.post('/api/auth/register').send({ ...base, password: 'trop-court' }).expect(400);
    await ctx.agent.post('/api/auth/register').send({ ...base, ageConfirmed: false }).expect(400);
    await ctx.agent.post('/api/auth/register').send({ ...base, avatar: 'licorne' }).expect(400);
    await ctx.agent.post('/api/auth/register').send({ ...base, pseudo: 'a b' }).expect(400);
    await ctx.newAgent().post('/api/auth/register').send(base).expect(201);
    const email = await ctx.newAgent().post('/api/auth/register').send({ ...base, pseudo: 'Autre' }).expect(409);
    expect(email.body.error.code).toBe('email_existant');
    const pseudo = await ctx.newAgent().post('/api/auth/register').send({ ...base, email: 'b2@exemple.fr', pseudo: 'BOB' }).expect(409);
    expect(pseudo.body.error.code).toBe('pseudo_existant');
  });
});

describe('connexion', () => {
  it('ouvre et ferme une session, sans distinguer adresse inconnue et mauvais mot de passe', async () => {
    const ctx = await setup([]);
    const account = await register(ctx.newAgent());
    const wrong = await ctx.agent.post('/api/auth/login').send({ email: account.email, password: 'mauvais-mot-de-passe' }).expect(401);
    const unknown = await ctx.agent.post('/api/auth/login').send({ email: 'personne@exemple.fr', password: PASSWORD }).expect(401);
    expect(wrong.body).toEqual(unknown.body);

    await ctx.agent.post('/api/auth/login').send({ email: account.email.toUpperCase(), password: PASSWORD }).expect(200);
    expect((await ctx.agent.get('/api/auth/me').expect(200)).body.user.pseudo).toBe(account.pseudo);
    await ctx.agent.post('/api/auth/logout').expect(204);
    expect((await ctx.agent.get('/api/auth/me').expect(200)).body.user).toBeNull();
  });

  it('limite à cinq tentatives par minute et par adresse (ENF-5.3)', async () => {
    const ctx = await setup([]);
    const account = await register(ctx.newAgent());
    for (let i = 0; i < 5; i++) {
      await ctx.agent.post('/api/auth/login').send({ email: account.email, password: 'mauvais-mot-de-passe' }).expect(401);
    }
    await ctx.agent.post('/api/auth/login').send({ email: account.email, password: PASSWORD }).expect(429);
  });

  it('refuse une écriture annoncée depuis une autre origine', async () => {
    const ctx = await setup([]);
    await ctx.agent.post('/api/auth/logout').set('Origin', 'https://pirate.example').expect(403);
  });

  it('admet l’origine publique du site et l’hôte joint derrière un proxy', async () => {
    const ctx = await setup([]);
    await ctx.agent.post('/api/auth/logout').set('Origin', 'https://recto.test').expect(204);
    await ctx.agent
      .post('/api/auth/logout')
      .set('Origin', 'http://localhost:5173')
      .set('X-Forwarded-Host', 'localhost:5173')
      .expect(204);
  });
});

describe('réinitialisation du mot de passe (EF-4.3)', () => {
  it('ne révèle rien pour une adresse inconnue', async () => {
    const ctx = await setup([]);
    await ctx.agent.post('/api/auth/forgot-password').send({ email: 'personne@exemple.fr' }).expect(204);
    expect(ctx.mailer.sent).toHaveLength(0);
  });

  it('change le mot de passe par lien à usage unique et révoque les autres sessions', async () => {
    const ctx = await setup([]);
    const other = ctx.newAgent();
    const account = await register(other);

    await ctx.agent.post('/api/auth/forgot-password').send({ email: account.email }).expect(204);
    const token = lastToken(ctx);
    expect(ctx.mailer.sent.at(-1)!.text).toContain('https://recto.test/reinitialisation?jeton=');
    await ctx.agent.post('/api/auth/reset-password').send({ token, password: 'nouveau-mot-de-passe' }).expect(204);
    await ctx.agent.post('/api/auth/reset-password').send({ token, password: 'encore-un-autre-mdp' }).expect(400);

    expect((await ctx.agent.get('/api/auth/me').expect(200)).body.user.emailVerified).toBe(true);
    expect((await other.get('/api/auth/me').expect(200)).body.user).toBeNull();
    await ctx.newAgent().post('/api/auth/login').send({ email: account.email, password: PASSWORD }).expect(401);
    await ctx.newAgent().post('/api/auth/login').send({ email: account.email, password: 'nouveau-mot-de-passe' }).expect(200);
  });

  it('refuse un lien expiré', async () => {
    const ctx = await setup([]);
    const account = await register(ctx.newAgent());
    await ctx.agent.post('/api/auth/forgot-password').send({ email: account.email }).expect(204);
    ctx.advance(61 * 60 * 1000);
    await ctx.agent.post('/api/auth/reset-password').send({ token: lastToken(ctx), password: 'nouveau-mot-de-passe' }).expect(400);
  });
});
