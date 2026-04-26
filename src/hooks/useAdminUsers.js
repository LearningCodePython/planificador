import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

export const useAdminUsers = (showMessageWithTimeout, enabled = true) => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const showMessageRef = useRef(showMessageWithTimeout);

  useEffect(() => {
    showMessageRef.current = showMessageWithTimeout;
  }, [showMessageWithTimeout]);

  const rolesSet = useMemo(() => new Set(roles), [roles]);

  const reload = useCallback(async () => {
    if (!enabled) {
      setUsers([]);
      setRoles([]);
      return;
    }
    setIsLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([apiFetch('/auth/users'), apiFetch('/auth/roles')]);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setRoles(Array.isArray(rolesData?.roles) ? rolesData.roles : []);
    } catch (error) {
      console.error('Error loading admin users:', error);
      if (showMessageRef.current) showMessageRef.current(`Error cargando usuarios: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    reload().catch(() => {});
  }, [enabled, reload]);

  const createUser = useCallback(
    async ({ email, password, roles: nextRoles }) => {
      if (!enabled) return;
      try {
        const payload = {
          email,
          password,
          roles: Array.isArray(nextRoles) ? nextRoles.filter((r) => rolesSet.has(r)) : [],
        };
        const data = await apiFetch('/auth/users', { method: 'POST', body: JSON.stringify(payload) });
        if (data?.user) {
          setUsers((prev) => [...prev, data.user].sort((a, b) => Number(a.id) - Number(b.id)));
        } else {
          await reload();
        }
        if (showMessageRef.current) showMessageRef.current('Usuario creado.');
      } catch (error) {
        console.error('Create user error:', error);
        if (showMessageRef.current) showMessageRef.current(`Error creando usuario: ${error.message}`);
        throw error;
      }
    },
    [enabled, reload, rolesSet]
  );

  const updateUser = useCallback(
    async (id, patch) => {
      if (!enabled) return;
      try {
        const payload = {};
        if (patch?.isActive != null) payload.isActive = Boolean(patch.isActive);
        if (Array.isArray(patch?.roles)) payload.roles = patch.roles.filter((r) => rolesSet.has(r));
        if (patch?.password != null) payload.password = patch.password;

        const data = await apiFetch(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        if (data?.user) {
          setUsers((prev) => prev.map((u) => (String(u.id) === String(id) ? data.user : u)));
        } else {
          await reload();
        }
        if (showMessageRef.current) showMessageRef.current('Usuario actualizado.');
      } catch (error) {
        console.error('Update user error:', error);
        if (showMessageRef.current) showMessageRef.current(`Error actualizando usuario: ${error.message}`);
        throw error;
      }
    },
    [enabled, reload, rolesSet]
  );

  return {
    users,
    roles,
    isLoading,
    reload,
    createUser,
    updateUser,
  };
};
