import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import AuthForm from './AuthForm'; // Crearemos este componente a continuación

/**
 * Componente que envuelve la aplicación y decide si mostrar
 * el formulario de autenticación o el contenido principal.
 */
const AuthWrapper = ({ children }) => {
  const { user, isAuthReady } = useAppContext();

  // Muestra un spinner o un mensaje mientras se inicializa el estado de auth
  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-xl font-semibold text-gray-700">Cargando...</div>
      </div>
    );
  }

  // Si no hay usuario, muestra el formulario de login/registro
  if (!user) {
    return <AuthForm />;
  }

  // Si hay un usuario, muestra la aplicación
  return children;
};

export default AuthWrapper;
