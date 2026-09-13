// Contrôle préalable à la mise en ligne (§ 7.3, CA-14) : identité de l'éditeur renseignée dans les
// pages légales et, avec --env, variables d'environnement de production cohérentes.
//   npm run check:launch               pages légales seulement
//   npm run check:launch -- --env      ajoute les variables de l'environnement courant
import { readFileSync } from 'node:fs';

const problems = [];

const site = readFileSync(new URL('../apps/web/src/legal/site.ts', import.meta.url), 'utf8');
for (const [index, line] of site.split('\n').entries()) {
  const trimmed = line.trim();
  if (!trimmed.includes('A_COMPLETER') || trimmed.startsWith('export const A_COMPLETER') || trimmed.startsWith('export const isFilled')) {
    continue;
  }
  if (trimmed.startsWith('*') || trimmed.startsWith('//')) continue;
  problems.push(`apps/web/src/legal/site.ts:${index + 1} — valeur à compléter : ${trimmed}`);
}

if (process.argv.includes('--env')) {
  const env = process.env;
  if (env.NODE_ENV !== 'production') problems.push('NODE_ENV doit valoir production.');
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32) problems.push('AUTH_SECRET manquant ou trop court (32 caractères minimum).');
  if (!env.APP_URL?.startsWith('https://')) problems.push('APP_URL doit être l’adresse publique en https://.');
  if (!env.SMTP_URL) problems.push('SMTP_URL manquant : aucun courriel de vérification ni de réinitialisation ne partirait.');
  if (!env.MAIL_FROM) problems.push('MAIL_FROM manquant : l’expéditeur par défaut n’est pas une adresse réelle.');
  if (env.APP_ENV && env.APP_ENV !== 'production') problems.push(`APP_ENV vaut ${env.APP_ENV} : le site ne sera pas indexé.`);
}

if (problems.length > 0) {
  console.error(`Mise en ligne bloquée — ${problems.length} point(s) :\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  process.exit(1);
}
console.log('Contrôle préalable à la mise en ligne : aucun point bloquant.');
