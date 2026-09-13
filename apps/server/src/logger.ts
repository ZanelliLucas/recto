/**
 * § 7.5 — journalisation des erreurs applicatives. En production, une ligne JSON par événement,
 * exploitable par l'hébergeur ; en développement, un texte lisible. Jamais d'adresse IP, de
 * cookie ni de contenu de requête : seulement ce qui sert à diagnostiquer.
 */
type Level = 'info' | 'warn' | 'error';
type Context = Record<string, unknown>;

const structured = process.env.NODE_ENV === 'production';

function describeError(error: unknown): Context {
  if (error instanceof Error) return { error: error.message, stack: error.stack };
  return error === undefined ? {} : { error: String(error) };
}

function write(level: Level, message: string, context: Context = {}): void {
  const output = level === 'info' ? console.log : level === 'warn' ? console.warn : console.error;
  if (structured) {
    output(JSON.stringify({ time: new Date().toISOString(), level, message, ...context }));
    return;
  }
  const { stack, ...rest } = context;
  const details = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';
  output(`[${level}] ${message}${details}${typeof stack === 'string' ? `\n${stack}` : ''}`);
}

export const logger = {
  info: (message: string, context?: Context) => write('info', message, context),
  warn: (message: string, context?: Context) => write('warn', message, context),
  error: (message: string, error?: unknown, context?: Context) => write('error', message, { ...context, ...describeError(error) }),
};
