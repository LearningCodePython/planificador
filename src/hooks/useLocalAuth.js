import { useState, useEffect, useCallback } from 'react';

export const useLocalAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('planificador_local_user_email') || 'local@planificador.local';
    setUser({ uid: 'local-user', email: savedEmail });
    setIsAuthReady(true);
  }, []);

  const signUp = useCallback(async (email) => {
    const safeEmail = email || 'local@planificador.local';
    localStorage.setItem('planificador_local_user_email', safeEmail);
    setUser({ uid: 'local-user', email: safeEmail });
  }, []);

  const signIn = useCallback(async (email) => {
    const safeEmail = email || 'local@planificador.local';
    localStorage.setItem('planificador_local_user_email', safeEmail);
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

