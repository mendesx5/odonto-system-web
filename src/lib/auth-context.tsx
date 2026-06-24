import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Auth, getStoredUser, getToken, setStoredUser, setToken, type MeResponse } from "./api";

interface AuthCtx {
  user: MeResponse | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<MeResponse>;
  logout: () => void;
  refresh: () => Promise<void>;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(() => getStoredUser());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (getToken()) {
        try {
          const me = await Auth.me();
          if (!cancelled) { setUser(me); setStoredUser(me); }
        } catch {
          if (!cancelled) { setUser(null); setToken(null); setStoredUser(null); }
        }
      }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const value: AuthCtx = {
    user,
    ready,
    async login(email, password) {
      const { token } = await Auth.login(email, password);
      setToken(token);
      const me = await Auth.me();
      setStoredUser(me);
      setUser(me);
      return me;
    },
    logout() {
      setToken(null);
      setStoredUser(null);
      setUser(null);
    },
    async refresh() {
      try { const me = await Auth.me(); setUser(me); setStoredUser(me); } catch { /* noop */ }
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
