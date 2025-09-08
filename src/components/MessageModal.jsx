import React from 'react';
import { useAppContext } from '../contexts/AppContext';

/**
 * Componente Modal de Mensajes reutilizable
 * 
 * ¿Qué conseguimos?
 * - Componente independiente y reutilizable
 * - Usa el contexto directamente
 * - Fácil de testear por separado
 * - UI consistente en toda la aplicación
 */
const MessageModal = () => {
  const { message, showMessage, hideMessage } = useAppContext();

  if (!showMessage) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl border border-blue-200 animate-fade-in max-w-md w-full mx-4">
        <p className="text-lg font-semibold text-center text-blue-700 mb-4">
          {message}
        </p>
        <button
          onClick={hideMessage}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300 ease-in-out shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default MessageModal;
