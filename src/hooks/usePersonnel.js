import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAppContext } from '../contexts/AppContext';

/**
 * Hook especializado para manejo de personal
 * 
 * ¿Qué conseguimos?
 * - Encapsular toda la lógica de personal
 * - Estado y funciones específicas organizadas
 * - Validaciones centralizadas
 * - Reutilización en múltiples componentes
 */
export const usePersonnel = () => {
  // Contexto global
  const { db, userId, isAuthReady, showMessageWithTimeout, getAppId } = useAppContext();
  
  // Estado local del hook
  const [personnel, setPersonnel] = useState([]);

  // Estado del formulario
  const [personnelForm, setPersonnelForm] = useState({
    id: null, // null para nuevo, id para edición
    name: '',
    laborType: '',
    hoursPerDay: '',
    daysPerWeek: '',
  });

  // Efecto para cargar personal
  useEffect(() => {
    if (!db || !userId || !isAuthReady) return;

    const appId = getAppId();
    const personnelCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/personnel`);
    
    const unsubscribe = onSnapshot(personnelCollectionRef, (snapshot) => {
      const personnelData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPersonnel(personnelData);
    }, (error) => {
      console.error("Error fetching personnel:", error);
      showMessageWithTimeout(`Error al cargar personal: ${error.message}`);
    });

    return () => unsubscribe();
  }, [db, userId, isAuthReady, getAppId, showMessageWithTimeout]);

  // Función para actualizar el formulario
  const updatePersonnelForm = useCallback((field, value) => {
    setPersonnelForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Función para resetear el formulario
  const resetPersonnelForm = useCallback(() => {
    setPersonnelForm({
      id: null,
      name: '',
      laborType: '',
      hoursPerDay: '',
      daysPerWeek: '',
    });
  }, []);

  // Función para cargar una persona en el formulario (edición)
  const editPersonnel = useCallback((person) => {
    setPersonnelForm({
      id: person.id,
      name: person.name,
      laborType: person.laborType,
      hoursPerDay: person.hoursPerDay,
      daysPerWeek: person.daysPerWeek,
    });
  }, []);

  // Función para guardar personal
  const savePersonnel = useCallback(async () => {
    if (!db || !userId) {
      showMessageWithTimeout("Firebase no está inicializado o el usuario no está autenticado.");
      return false;
    }

    // Validaciones
    if (!personnelForm.name || !personnelForm.laborType || 
        !personnelForm.hoursPerDay || !personnelForm.daysPerWeek) {
      showMessageWithTimeout("Por favor, complete todos los campos del personal.");
      return false;
    }

    const personnelData = {
      name: personnelForm.name,
      laborType: personnelForm.laborType,
      hoursPerDay: Number(personnelForm.hoursPerDay),
      daysPerWeek: Number(personnelForm.daysPerWeek),
      userId: userId,
    };

    try {
      const appId = getAppId();
      if (personnelForm.id) {
        // Actualizar
        await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/personnel`, personnelForm.id), personnelData);
        showMessageWithTimeout("Personal actualizado con éxito.");
      } else {
        // Crear nuevo
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/personnel`), personnelData);
        showMessageWithTimeout("Personal añadido con éxito.");
      }
      resetPersonnelForm();
      return true;
    } catch (e) {
      console.error("Error saving personnel:", e);
      showMessageWithTimeout(`Error al guardar personal: ${e.message}`);
      return false;
    }
  }, [db, userId, personnelForm, showMessageWithTimeout, getAppId, resetPersonnelForm]);

  // Función para eliminar personal
  const deletePersonnel = useCallback(async (id) => {
    if (!db || !userId) {
      showMessageWithTimeout("Firebase no está inicializado o el usuario no está autenticado.");
      return false;
    }

    try {
      const appId = getAppId();
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/personnel`, id));
      showMessageWithTimeout("Personal eliminado con éxito.");
      return true;
    } catch (e) {
      console.error("Error deleting personnel:", e);
      showMessageWithTimeout(`Error al eliminar personal: ${e.message}`);
      return false;
    }
  }, [db, userId, showMessageWithTimeout, getAppId]);

  return {
    // Estado
    personnel,
    personnelForm,
    
    // Funciones de formulario
    updatePersonnelForm,
    resetPersonnelForm,
    editPersonnel,
    
    // Operaciones CRUD
    savePersonnel,
    deletePersonnel,
  };
};
