import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { t, type MessageKey } from '../i18n';
import { trackPageView } from '../lib/audience';
import { AvatarIcon } from './AvatarIcon';
import styles from './Layout.module.css';

const FOOTER_LINKS: readonly (readonly [string, MessageKey])[] = [
  ['/comment-jouer', 'nav.help'],
  ['/parametres', 'nav.settings'],
  ['/credits', 'nav.credits'],
  ['/mentions-legales', 'nav.legal'],
  ['/confidentialite', 'nav.privacy'],
  ['/contact', 'nav.contact'],
];

export function Layout() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!pathname.startsWith('/admin')) trackPageView(pathname);
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#contenu">
        {t('nav.skip')}
      </a>
      <header className={styles.header}>
        <Link to="/" className={styles.brand} aria-label={t('nav.home')}>
          <span className={styles.mark} aria-hidden="true">
            <span />
            <span />
          </span>
          <span className={styles.wordmark}>{t('app.name')}</span>
        </Link>
        <nav aria-label={t('nav.main')} className={styles.nav}>
          <NavLink to="/categories" className={styles.navLink}>
            {t('nav.categories')}
          </NavLink>
          {user ? (
            <NavLink to="/profil" className={`${styles.navLink} ${styles.account}`} aria-label={t('nav.profile', { pseudo: user.pseudo })}>
              <AvatarIcon avatar={user.avatar} size={26} />
              <span className={styles.pseudo}>{user.pseudo}</span>
            </NavLink>
          ) : (
            <NavLink to="/connexion" className={styles.navLink}>
              {t('nav.login')}
            </NavLink>
          )}
        </nav>
      </header>
      <main id="contenu" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      {/* CA-14 — mentions légales et confidentialité accessibles depuis toutes les pages. */}
      <footer className={styles.footer}>
        <div className={styles.footerIntro}>
          <span>
            {t('app.name')} · {t('app.tagline')}
          </span>
          {!user && <span>{t('app.guestNotice')}</span>}
        </div>
        <nav aria-label={t('nav.footer')}>
          <ul className={styles.footerLinks}>
            {FOOTER_LINKS.map(([to, label]) => (
              <li key={to}>
                <Link to={to} className={styles.footerLink}>
                  {t(label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </footer>
    </>
  );
}
