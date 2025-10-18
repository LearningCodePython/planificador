import { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
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
  const [user, setUser] = useState(null); // Cambiado de userId a user para tener más info
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

        const unsubscribe = onAuthStateChanged(authInstance, (user) => {
          setUser(user);
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

  // Funciones de autenticación
  const signUp = useCallback(async (email, password) => {
    if (!auth) return;
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error en el registro:", error);
      if (onError) onError(`Error en el registro: ${error.message}`);
      throw error; // Re-lanzar para manejar en el formulario
    }
  }, [auth, onError]);

  const signIn = useCallback(async (email, password) => {
    if (!auth) return;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      if (onError) onError(`Error al iniciar sesión: ${error.message}`);
      throw error; // Re-lanzar para manejar en el formulario
    }
  }, [auth, onError]);

  const logOut = useCallback(async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      if (onError) onError(`Error al cerrar sesión: ${error.message}`);
    }
  }, [auth, onError]);

  return { 
    db, 
    auth, 
    user, // Ahora devolvemos el objeto user completo
    userId: user ? user.uid : null, // Mantenemos userId por compatibilidad
    isAuthReady,
    signUp,
    signIn,
    logOut
  };
};
