import React, { createContext, useContext } from 'react';
import { useFirebase } from '../hooks/useFirebase';
import { useMessage } from '../hooks/useMessage';

/**
 * Contexto principal de la aplicación
 * 
 * ¿Qué conseguimos?
 * - Estado global accesible desde cualquier componente
 * - Eliminar "props drilling" 
 * - Centralizar la lógica común (Firebase, mensajes)
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

  // Hook personalizado para Firebase
  const { 
    db, 
    auth, 
    userId, 
    isAuthReady 
  } = useFirebase(showMessageWithTimeout);

  // Función helper para obtener el appId
  const getAppId = () => {
    return typeof window !== 'undefined' && typeof window.__app_id !== 'undefined' 
      ? window.__app_id 
      : 'default-app-id';
  };

  // Valores que se compartirán con todos los componentes hijos
  const contextValue = {
    // Firebase
    db,
    auth,
    userId,
    isAuthReady,
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
