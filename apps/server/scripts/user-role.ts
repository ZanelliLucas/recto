/**
 * Attribue un rôle à un compte existant (EF-7.5) : seul un administrateur accède au back-office.
 *
 * Usage : npm run user:role -- <adresse> <admin|joueur>
 */
import { normalizeEmail } from '../src/auth/authService';
import { SqlUserRepository } from '../src/auth/userRepository';
import { config } from '../src/config';
import { openDatabase } from '../src/db/client';

const [email, role] = process.argv.slice(2);
if (!email || (role !== 'admin' && role !== 'joueur')) {
  console.error('Usage : npm run user:role -- <adresse> <admin|joueur>');
  process.exit(1);
}

const users = new SqlUserRepository(await openDatabase(config.databaseUrl, config.migrationsDir));
const user = await users.findByEmail(normalizeEmail(email));
if (!user) {
  console.error(`Aucun compte pour ${email}. Inscrivez-vous d’abord sur le site.`);
  process.exit(1);
}
await users.update(user.id, { role });
console.log(`${user.pseudo} : rôle « ${role} ».`);
