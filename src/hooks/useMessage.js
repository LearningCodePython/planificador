import { useCallback, useEffect, useRef, useState } from 'react';

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
  const timeoutRef = useRef(null);

  const hideMessage = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowMessage(false);
    setMessage('');
  }, []);

  useEffect(() => () => hideMessage(), [hideMessage]);

  const showMessageWithTimeout = useCallback(
    (msg, duration = 3000) => {
      hideMessage();
      setMessage(msg);
      setShowMessage(true);
      timeoutRef.current = setTimeout(() => {
        setShowMessage(false);
        setMessage('');
        timeoutRef.current = null;
      }, duration);
    },
    [hideMessage]
  );

  return { 
    message, 
    showMessage, 
    showMessageWithTimeout, 
    hideMessage,
    setShowMessage // Por si necesitas control manual
  };
};
