import { useState, useEffect, useCallback } from 'react';

function safeGetLocalStorage(key) {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  } catch (_e) {
    return null;
  }
}

function safeSetLocalStorage(key, value) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  } catch (_e) {
    // noop
  }
}

export const useLocalAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const savedEmail = safeGetLocalStorage('planificador_local_user_email') || 'local@planificador.local';
    setUser({ uid: 'local-user', email: savedEmail });
    setIsAuthReady(true);
  }, []);

  const signUp = useCallback(async (email) => {
    const safeEmail = email || 'local@planificador.local';
    safeSetLocalStorage('planificador_local_user_email', safeEmail);
    setUser({ uid: 'local-user', email: safeEmail });
  }, []);

  const signIn = useCallback(async (email) => {
    const safeEmail = email || 'local@planificador.local';
    safeSetLocalStorage('planificador_local_user_email', safeEmail);
    setUser({ uid: 'local-user', email: safeEmail });
  }, []);

  const logOut = useCallback(async () => {
    setUser(null);
  }, []);

  return {
    user,
    userId: user ? user.uid : null,
    isAuthReady,
    signUp,
    signIn,
    logOut,
  };
};
