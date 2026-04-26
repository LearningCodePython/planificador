import React, { useMemo, useState } from 'react';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { useAppContext } from '../contexts/AppContext';

const ROLE_LABELS = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

function sanitizeRoles(roles, availableRoles) {
  const available = new Set(availableRoles);
  return (Array.isArray(roles) ? roles : []).filter((r) => available.has(r));
}

const UserAdmin = () => {
  const { user: currentUser, showMessageWithTimeout } = useAppContext();
  const isAdmin = Boolean(currentUser?.roles?.includes('admin'));

  const { users, roles, isLoading, createUser, updateUser, reload } = useAdminUsers(showMessageWithTimeout, isAdmin);

  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRoles, setCreateRoles] = useState(['viewer']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rolesSorted = useMemo(() => [...roles].sort(), [roles]);

  const onToggleCreateRole = (roleName) => {
    setCreateRoles((prev) => {
      const set = new Set(prev);
      if (set.has(roleName)) set.delete(roleName);
      else set.add(roleName);
      const out = Array.from(set);
      return out.length ? out : ['viewer'];
    });
  };

  const onCreate = async (e) => {
    e.preventDefault();
    if (!createEmail || !createPassword) {
      showMessageWithTimeout('Email y contraseña son obligatorios.');
      return;
    }
    setIsSubmitting(true);
    try {
      await createUser({
        email: createEmail,
        password: createPassword,
        roles: sanitizeRoles(createRoles, rolesSorted),
      });
      setCreateEmail('');
      setCreatePassword('');
      setCreateRoles(['viewer']);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-2">Usuarios</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">Necesitas rol admin para gestionar usuarios.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold">Gestión de Usuarios</h2>
          <button
            onClick={() => reload().catch(() => {})}
            className="px-3 py-2 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            disabled={isLoading}
          >
            {isLoading ? 'Actualizando...' : 'Refrescar'}
          </button>
        </div>

        <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              type="email"
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              placeholder="usuario@empresa.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <input
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              type="password"
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              placeholder="mínimo 8 caracteres"
              required
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              {rolesSorted.map((roleName) => (
                <label key={roleName} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={createRoles.includes(roleName)}
                    onChange={() => onToggleCreateRole(roleName)}
                  />
                  <span>{ROLE_LABELS[roleName] || roleName}</span>
                </label>
              ))}
            </div>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:bg-indigo-300"
            >
              {isSubmitting ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Roles</th>
                <th className="py-2 pr-3">Activo</th>
                <th className="py-2 pr-3">Reset pass</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow
                  key={`${u.id}-${u.updatedAt || ''}`}
                  user={u}
                  roles={rolesSorted}
                  currentUserId={currentUser?.id}
                  onSave={updateUser}
                />
              ))}
              {!users.length && (
                <tr>
                  <td colSpan={5} className="py-4 text-gray-500">
                    No hay usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Consejo: evita quitarte el rol <span className="font-semibold">admin</span> o desactivar tu propio usuario.
        </p>
      </div>
    </div>
  );
};

const UserRow = ({ user, roles, currentUserId, onSave }) => {
  const [nextRoles, setNextRoles] = useState(Array.isArray(user.roles) ? user.roles : []);
  const [nextIsActive, setNextIsActive] = useState(Boolean(user.isActive));
  const [nextPassword, setNextPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isSelf = String(user.id) === String(currentUserId);

  const onToggleRole = (roleName) => {
    setNextRoles((prev) => {
      const set = new Set(prev);
      if (set.has(roleName)) set.delete(roleName);
      else set.add(roleName);
      const out = Array.from(set);
      return out.length ? out : ['viewer'];
    });
  };

  const dirty =
    nextIsActive !== Boolean(user.isActive) ||
    JSON.stringify([...nextRoles].sort()) !== JSON.stringify([...(user.roles || [])].sort()) ||
    nextPassword !== '';

  const save = async () => {
    setIsSaving(true);
    try {
      await onSave(user.id, { isActive: nextIsActive, roles: nextRoles, password: nextPassword || null });
      setNextPassword('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <tr className="border-b border-gray-100 dark:border-gray-700 align-top">
      <td className="py-3 pr-3 whitespace-nowrap">{user.email}</td>
      <td className="py-3 pr-3">
        <div className="flex flex-wrap gap-3">
          {roles.map((roleName) => (
            <label key={roleName} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={nextRoles.includes(roleName)}
                onChange={() => onToggleRole(roleName)}
                disabled={isSelf && roleName === 'admin'}
              />
              <span>{ROLE_LABELS[roleName] || roleName}</span>
            </label>
          ))}
        </div>
      </td>
      <td className="py-3 pr-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={nextIsActive} onChange={(e) => setNextIsActive(e.target.checked)} disabled={isSelf} />
          <span className="text-xs text-gray-500">{isSelf ? '(tú)' : ''}</span>
        </label>
      </td>
      <td className="py-3 pr-3">
        <input
          value={nextPassword}
          onChange={(e) => setNextPassword(e.target.value)}
          type="password"
          className="w-48 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
          placeholder="nueva contraseña"
        />
      </td>
      <td className="py-3 pr-3">
        <button
          onClick={save}
          disabled={!dirty || isSaving}
          className="px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:bg-indigo-300"
        >
          {isSaving ? 'Guardando...' : 'Guardar'}
        </button>
      </td>
    </tr>
  );
};

export default UserAdmin;
