import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Hook personalizado para manejar Firebase
 * 
 * ¿Qué conseguimos?
 * - Centralizar toda la lógica de Firebase en un solo lugar
 * - Reutilizar la conexión de Firebase en cualquier componente
 * - Separar responsabilidades: Firebase vs UI logic
 * - Manejo de errores consistente
 */
export const useFirebase = (onError) => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const initFirebase = async () => {
      try {
        const firebaseConfig = {
          apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
          authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
          storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.REACT_APP_FIREBASE_APP_ID,
          measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
        };

        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const authInstance = getAuth(app);
        
        setDb(firestore);
        setAuth(authInstance);

        const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
          if (user) {
            setUserId(user.uid);
          } else {
            try {
              await signInAnonymously(authInstance);
            } catch (error) {
              console.error("Error al iniciar sesión anónimamente:", error);
              if (onError) {
                onError(`Error al iniciar sesión: ${error.message}`);
              }
            }
          }
          setIsAuthReady(true);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error initializing Firebase:", error);
        if (onError) {
          onError(`Error al inicializar Firebase: ${error.message}`);
        }
      }
    };

    initFirebase();
  }, [onError]);

  return { 
    db, 
    auth, 
    userId, 
    isAuthReady 
  };
};
