import type { PublicUser } from '@recto/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/client';
import { invalidateStats } from '../game/bestTimes';

interface AuthValue {
  /** Faux tant que la session n'a pas été vérifiée auprès du serveur. */
  ready: boolean;
  user: PublicUser | null;
  setUser: (user: PublicUser | null) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUserState] = useState<PublicUser | null>(null);

  const setUser = useCallback((next: PublicUser | null) => {
    invalidateStats();
    setUserState(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setUser((await authApi.me()).user);
    } catch {
      // Serveur injoignable : on reste en mode invité, le jeu fonctionne.
    } finally {
      setReady(true);
    }
  }, [setUser]);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    setUser(null);
  }, [setUser]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ ready, user, setUser, refresh, logout }), [ready, user, setUser, refresh, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth doit être utilisé sous AuthProvider');
  return value;
}

/** Adresse de retour après connexion : chemin interne uniquement, jamais une autre origine. */
export function safeReturn(value: string | null): string | null {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
}
