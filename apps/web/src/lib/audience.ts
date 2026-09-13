/**
 * ENF-6.4 — mesure d'audience sans cookie ni identifiant : seule l'adresse de la page vue est
 * transmise, et le serveur n'en garde qu'un compteur par jour. Aucun bandeau de consentement requis.
 */
export function trackPageView(path: string): void {
  try {
    const body = JSON.stringify({ path });
    const sent = navigator.sendBeacon?.('/api/audience', new Blob([body], { type: 'application/json' }));
    if (!sent) {
      void fetch('/api/audience', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(
        () => undefined,
      );
    }
  } catch {
    // La mesure d'audience ne doit jamais gêner la navigation.
  }
}
