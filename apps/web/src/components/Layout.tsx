import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { t } from '../i18n';
import { AvatarIcon } from './AvatarIcon';
import styles from './Layout.module.css';

export function Layout() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
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
      <footer className={styles.footer}>
        <span>
          {t('app.name')} · {t('app.tagline')}
        </span>
        {!user && <span>{t('app.guestNotice')}</span>}
        <Link to="/credits" className={styles.footerLink}>
          {t('nav.credits')}
        </Link>
      </footer>
    </>
  );
}
