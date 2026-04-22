import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';

const apiFetch = async (path, options = {}) => {
  const response = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      message = data.error || message;
    } catch (_e) {
      // noop
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
};

export const usePersonnel = () => {
  const { showMessageWithTimeout } = useAppContext();

  const [personnel, setPersonnel] = useState([]);

  const [personnelForm, setPersonnelForm] = useState({
    id: null,
    name: '',
    laborType: '',
    hoursPerDay: '',
    daysPerWeek: '',
  });

  const loadPersonnel = useCallback(async () => {
    try {
      const data = await apiFetch('/personnel');
      setPersonnel(data || []);
    } catch (error) {
      console.error('Error loading personnel:', error);
      showMessageWithTimeout(`Error al cargar personal: ${error.message}`);
    }
  }, [showMessageWithTimeout]);

  useEffect(() => {
    loadPersonnel();
  }, [loadPersonnel]);

  const updatePersonnelForm = useCallback((field, value) => {
    setPersonnelForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetPersonnelForm = useCallback(() => {
    setPersonnelForm({
      id: null,
      name: '',
      laborType: '',
      hoursPerDay: '',
      daysPerWeek: '',
    });
  }, []);

  const editPersonnel = useCallback((person) => {
    setPersonnelForm({
      id: person.id,
      name: person.name,
      laborType: person.laborType,
      hoursPerDay: person.hoursPerDay,
      daysPerWeek: person.daysPerWeek,
    });
  }, []);

  const savePersonnel = useCallback(async () => {
    if (!personnelForm.name || !personnelForm.laborType || !personnelForm.hoursPerDay || !personnelForm.daysPerWeek) {
      showMessageWithTimeout('Por favor, complete todos los campos del personal.');
      return false;
    }

    const payload = {
      name: personnelForm.name,
      laborType: personnelForm.laborType,
      hoursPerDay: Number(personnelForm.hoursPerDay),
      daysPerWeek: Number(personnelForm.daysPerWeek),
    };

    try {
      if (personnelForm.id) {
        await apiFetch(`/personnel/${personnelForm.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showMessageWithTimeout('Personal actualizado con éxito.');
      } else {
        await apiFetch('/personnel', { method: 'POST', body: JSON.stringify(payload) });
        showMessageWithTimeout('Personal añadido con éxito.');
      }
      resetPersonnelForm();
      loadPersonnel();
      return true;
    } catch (error) {
      console.error('Error saving personnel:', error);
      showMessageWithTimeout(`Error al guardar personal: ${error.message}`);
      return false;
    }
  }, [personnelForm, showMessageWithTimeout, resetPersonnelForm, loadPersonnel]);

  const deletePersonnel = useCallback(async (id) => {
    try {
      await apiFetch(`/personnel/${id}`, { method: 'DELETE' });
      showMessageWithTimeout('Personal eliminado con éxito.');
      loadPersonnel();
      return true;
    } catch (error) {
      console.error('Error deleting personnel:', error);
      showMessageWithTimeout(`Error al eliminar personal: ${error.message}`);
      return false;
    }
  }, [showMessageWithTimeout, loadPersonnel]);

  return {
    personnel,
    personnelForm,
    updatePersonnelForm,
    resetPersonnelForm,
    editPersonnel,
    savePersonnel,
    deletePersonnel,
  };
};
