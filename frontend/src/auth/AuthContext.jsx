/** Contexto pequeno de autenticação: usuário atual e ações de entrar/sair. */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { fetchCurrentUser, signIn as apiSignIn, signOut as apiSignOut } from "../api/auth";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchCurrentUser()
      .then((currentUser) => {
        if (isMounted) setUser(currentUser);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingSession(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const signedInUser = await apiSignIn(email, password);
    setUser(signedInUser);
    return signedInUser;
  }, []);

  const signOut = useCallback(async () => {
    await apiSignOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoadingSession, signIn, signOut }),
    [user, isLoadingSession, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return context;
}
