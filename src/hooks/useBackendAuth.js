import { useCallback, useEffect, useState } from 'react';

const apiFetch = async (path, options = {}) => {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      message = data.error || message;
    } catch (_e) {
      // noop
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
};

export const useBackendAuth = (showMessageWithTimeout) => {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let alive = true;
    apiFetch('/auth/me')
      .then((data) => {
        if (!alive) return;
        setUser(data?.user || null);
      })
      .catch((error) => {
        console.error('Error loading session:', error);
        if (showMessageWithTimeout) showMessageWithTimeout(`Error cargando sesión: ${error.message}`);
      })
      .finally(() => {
        if (!alive) return;
        setIsAuthReady(true);
      });

    return () => {
      alive = false;
    };
  }, [showMessageWithTimeout]);

  const signUp = useCallback(
    async (email, password) => {
      const data = await apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
      setUser(data?.user || null);
    },
    []
  );

  const signIn = useCallback(
    async (email, password) => {
      const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      setUser(data?.user || null);
    },
    []
  );

  const logOut = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (error) {
      // si falla el logout, igual limpiamos estado local
      console.warn('Logout error:', error);
    } finally {
      setUser(null);
    }
  }, []);

  return {
    user,
    userId: user ? user.id : null,
    isAuthReady,
    signUp,
    signIn,
    logOut,
  };
};

