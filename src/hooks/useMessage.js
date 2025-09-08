import { useState } from 'react';

/**
 * Hook personalizado para manejar mensajes de notificación
 * 
 * ¿Qué conseguimos?
 * - Encapsular toda la lógica de mensajes en un lugar
 * - Reutilizar en cualquier componente que necesite mostrar mensajes
 * - Simplificar el código eliminando estado repetitivo
 */
export const useMessage = () => {
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);

  const showMessageWithTimeout = (msg, duration = 3000) => {
    setMessage(msg);
    setShowMessage(true);
    setTimeout(() => {
      setShowMessage(false);
      setMessage('');
    }, duration);
  };

  const hideMessage = () => {
    setShowMessage(false);
    setMessage('');
  };

  return { 
    message, 
    showMessage, 
    showMessageWithTimeout, 
    hideMessage,
    setShowMessage // Por si necesitas control manual
  };
};
