// Appliqué avant le premier affichage, pour éviter un éclair du thème sombre chez qui a choisi le clair.
// Fichier distinct plutôt que script en ligne : la politique de sécurité de contenu interdit ces derniers.
// Même logique que src/settings/preferences.ts, qui reprend la main une fois l'application chargée.
(function () {
  var prefs = {};
  try {
    prefs = JSON.parse(localStorage.getItem('recto.preferences') || '{}') || {};
  } catch (e) {}
  var media = function (query) {
    return window.matchMedia && window.matchMedia(query).matches;
  };
  var theme = prefs.theme === 'clair' ? 'light' : prefs.theme === 'systeme' && media('(prefers-color-scheme: light)') ? 'light' : 'dark';
  var reduced = prefs.motion === 'reduites' || media('(prefers-reduced-motion: reduce)');
  var root = document.documentElement;
  root.setAttribute('data-theme', theme);
  if (reduced) root.setAttribute('data-motion', 'reduced');
})();
