/**
 * § 7.5 — journalisation des erreurs applicatives survenues dans le navigateur. Seuls le message,
 * la pile et la page sont transmis : ni identifiant, ni contenu saisi.
 */
const MAX_REPORTS_PER_PAGE = 5;
let reported = 0;

function report(message: string, stack?: string): void {
  if (reported >= MAX_REPORTS_PER_PAGE) return;
  reported++;
  try {
    const body = JSON.stringify({
      message: message.slice(0, 500),
      stack: stack?.slice(0, 4000),
      path: location.pathname,
    });
    navigator.sendBeacon?.('/api/client-errors', new Blob([body], { type: 'application/json' }));
  } catch {
    // Signalement impossible : l'erreur reste visible dans la console.
  }
}

export function installErrorReporting(): void {
  window.addEventListener('error', (event) => {
    // Échec de chargement d'une ressource (image…) : pas une erreur de code.
    if (!(event.error instanceof Error) && !event.message) return;
    report(event.message || String(event.error), event.error instanceof Error ? event.error.stack : undefined);
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason: unknown = event.reason;
    report(reason instanceof Error ? reason.message : String(reason), reason instanceof Error ? reason.stack : undefined);
  });
}
