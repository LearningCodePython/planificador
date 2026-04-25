import React, { createContext, useContext } from 'react';
import { useBackendAuth } from '../hooks/useBackendAuth';
import { useMessage } from '../hooks/useMessage';

/**
 * Contexto principal de la aplicación
 * 
 * ¿Qué conseguimos?
 * - Estado global accesible desde cualquier componente
 * - Eliminar "props drilling" 
 * - Centralizar la lógica común (auth local, mensajes)
 * - Mejor organización del código
 */

// Crear el contexto
const AppContext = createContext();

// Hook para usar el contexto (con validación)
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext debe ser usado dentro de un AppProvider');
  }
  return context;
};

// Proveedor del contexto
export const AppProvider = ({ children }) => {
  // Hook personalizado para mensajes
  const { 
    message, 
    showMessage, 
    showMessageWithTimeout, 
    hideMessage 
  } = useMessage();

  // Hook de autenticación backend (sesión/roles/permisos)
  const {
    user,
    userId, 
    isAuthReady,
    signUp,
    signIn,
    logOut
  } = useBackendAuth(showMessageWithTimeout);

  // Función helper para obtener el appId
  const getAppId = () => {
    return typeof window !== 'undefined' && typeof window.__app_id !== 'undefined' 
      ? window.__app_id 
      : 'default-app-id';
  };

  // Valores que se compartirán con todos los componentes hijos
  const contextValue = {
    // Auth
    user,
    userId,
    isAuthReady,
    signUp,
    signIn,
    logOut,
    getAppId,
    
    // Mensajes
    message,
    showMessage,
    showMessageWithTimeout,
    hideMessage,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};
