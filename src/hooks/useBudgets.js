import { useState, useEffect, useCallback, useMemo } from 'react';
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

const apiUploadPdf = async (path, file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`/api${path}`, {
    method: 'POST',
    body: formData,
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

  return response.json();
};

export const useBudgets = () => {
  const { showMessageWithTimeout } = useAppContext();

  const [budgets, setBudgets] = useState([]);
  const [acceptedBudgets, setAcceptedBudgets] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [acceptedBudgetPdfFile, setAcceptedBudgetPdfFile] = useState(null);

  const [acceptedBudgetForm, setAcceptedBudgetForm] = useState({
    id: null,
    name: '',
    budgetNumber: '',
    acceptanceDate: '',
    ticketRef: '',
    pdfFilename: '',
    pdfOriginalName: '',
  });

  const [budgetForm, setBudgetForm] = useState({
    id: null,
    name: '',
    budgetNumber: '',
    acceptanceDate: '',
    ticketRef: '',
    totalHours: '',
    laborBreakdown: [{ type: '', hours: '' }],
    startDate: '',
    endDate: '',
    status: 'Accepted',
    category: '',
    assignedPersonnel: [],
  });

  const loadBudgets = useCallback(async () => {
    try {
      const data = await apiFetch('/budgets');
      setBudgets(data || []);
    } catch (error) {
      console.error('Error loading budgets:', error);
      showMessageWithTimeout(`Error al cargar presupuestos: ${error.message}`);
    }
  }, [showMessageWithTimeout]);

  const loadAcceptedBudgets = useCallback(async () => {
    try {
      const data = await apiFetch('/accepted-budgets');
      setAcceptedBudgets(data || []);
    } catch (error) {
      console.error('Error loading accepted budgets:', error);
      showMessageWithTimeout(`Error al cargar bolsa de aceptados: ${error.message}`);
    }
  }, [showMessageWithTimeout]);

  useEffect(() => {
    loadBudgets();
    loadAcceptedBudgets();
  }, [loadBudgets, loadAcceptedBudgets]);

  const updateBudgetForm = useCallback((field, value) => {
    setBudgetForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateAcceptedBudgetForm = useCallback((field, value) => {
    setAcceptedBudgetForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetAcceptedBudgetForm = useCallback(() => {
    setAcceptedBudgetForm({
      id: null,
      name: '',
      budgetNumber: '',
      acceptanceDate: '',
      ticketRef: '',
      pdfFilename: '',
      pdfOriginalName: '',
    });
    setAcceptedBudgetPdfFile(null);
  }, []);

  const resetBudgetForm = useCallback(() => {
    setBudgetForm({
      id: null,
      name: '',
      budgetNumber: '',
      acceptanceDate: '',
      ticketRef: '',
      totalHours: '',
      laborBreakdown: [{ type: '', hours: '' }],
      startDate: '',
      endDate: '',
      status: 'Accepted',
      category: '',
      assignedPersonnel: [],
    });
  }, []);

  const editBudget = useCallback((budget) => {
    setBudgetForm({
      id: budget.id,
      name: budget.name,
      budgetNumber: budget.budgetNumber || '',
      acceptanceDate: budget.acceptanceDate || '',
      ticketRef: budget.ticketRef || '',
      totalHours: budget.totalHours,
      laborBreakdown: budget.laborBreakdown || [{ type: '', hours: '' }],
      startDate: budget.startDate || '',
      endDate: budget.endDate || '',
      status: budget.status || 'Accepted',
      category: budget.category || '',
      assignedPersonnel: budget.assignedPersonnel || [],
    });
  }, []);

  const useBudgetAsTemplate = useCallback((budget) => {
    const originalStart = new Date(budget.startDate);
    const originalEnd = new Date(budget.endDate);
    const hasValidDates = !Number.isNaN(originalStart.getTime()) && !Number.isNaN(originalEnd.getTime());
    const durationInDays = hasValidDates
      ? Math.max(1, Math.ceil((originalEnd - originalStart) / (1000 * 60 * 60 * 24)))
      : 30;

    const today = new Date();
    const newStart = today.toISOString().split('T')[0];
    const newEndDate = new Date(today);
    newEndDate.setDate(today.getDate() + durationInDays);
    const newEnd = newEndDate.toISOString().split('T')[0];

    setBudgetForm({
      id: null,
      name: `${budget.name} (copia)`,
      budgetNumber: budget.budgetNumber || '',
      acceptanceDate: budget.acceptanceDate || '',
      ticketRef: budget.ticketRef || '',
      totalHours: budget.totalHours,
      laborBreakdown: budget.laborBreakdown || [{ type: '', hours: '' }],
      startDate: newStart,
      endDate: newEnd,
      status: budget.status || 'Accepted',
      category: budget.category || '',
      assignedPersonnel: budget.assignedPersonnel || [],
    });
  }, []);

  const saveBudget = useCallback(async () => {
    if (!budgetForm.name || !budgetForm.totalHours || budgetForm.laborBreakdown.some((item) => !item.type || !item.hours)) {
      showMessageWithTimeout('Por favor, complete todos los campos del presupuesto.');
      return false;
    }

    if (budgetForm.startDate && budgetForm.endDate) {
      const start = new Date(budgetForm.startDate);
      const end = new Date(budgetForm.endDate);
      if (start > end) {
        showMessageWithTimeout('La fecha de inicio no puede ser posterior a la fecha de fin.');
        return false;
      }
    }

    const payload = {
      name: budgetForm.name,
      budgetNumber: budgetForm.budgetNumber || '',
      acceptanceDate: budgetForm.acceptanceDate || '',
      ticketRef: budgetForm.ticketRef || '',
      totalHours: Number(budgetForm.totalHours),
      laborBreakdown: budgetForm.laborBreakdown.map((item) => ({
        type: item.type,
        hours: Number(item.hours),
      })),
      startDate: budgetForm.startDate || '',
      endDate: budgetForm.endDate || '',
      status: budgetForm.status,
      category: budgetForm.category,
      assignedPersonnel: budgetForm.assignedPersonnel,
      fromAcceptedBag: Boolean(budgetForm.fromAcceptedBag),
    };

    try {
      if (budgetForm.id) {
        await apiFetch(`/budgets/${budgetForm.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showMessageWithTimeout('Presupuesto actualizado con éxito.');
      } else {
        await apiFetch('/budgets', { method: 'POST', body: JSON.stringify(payload) });
        showMessageWithTimeout('Presupuesto añadido con éxito.');
      }
      resetBudgetForm();
      loadBudgets();
      return true;
    } catch (error) {
      console.error('Error saving budget:', error);
      showMessageWithTimeout(`Error al guardar presupuesto: ${error.message}`);
      return false;
    }
  }, [budgetForm, showMessageWithTimeout, resetBudgetForm, loadBudgets]);

  const saveAcceptedBudget = useCallback(async () => {
    if (!acceptedBudgetForm.name || !acceptedBudgetForm.budgetNumber || !acceptedBudgetForm.acceptanceDate) {
      showMessageWithTimeout('Completa nombre, número y fecha de aceptación.');
      return false;
    }

    try {
      const payload = {
        name: acceptedBudgetForm.name,
        budgetNumber: acceptedBudgetForm.budgetNumber,
        acceptanceDate: acceptedBudgetForm.acceptanceDate,
        ticketRef: acceptedBudgetForm.ticketRef || '',
        status: 'Accepted',
      };

      let saved;
      if (acceptedBudgetForm.id) {
        saved = await apiFetch(`/accepted-budgets/${acceptedBudgetForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showMessageWithTimeout('Presupuesto de la bolsa actualizado.');
      } else {
        saved = await apiFetch('/accepted-budgets', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showMessageWithTimeout('Presupuesto añadido a la bolsa de aceptados.');
      }

      if (acceptedBudgetPdfFile && saved?.id) {
        await apiUploadPdf(`/accepted-budgets/${saved.id}/pdf`, acceptedBudgetPdfFile);
        showMessageWithTimeout('PDF subido correctamente.');
      }
      resetAcceptedBudgetForm();
      loadAcceptedBudgets();
      return true;
    } catch (error) {
      console.error('Error saving accepted budget:', error);
      showMessageWithTimeout(`Error al guardar en bolsa de aceptados: ${error.message}`);
      return false;
    }
  }, [
    acceptedBudgetForm,
    acceptedBudgetPdfFile,
    resetAcceptedBudgetForm,
    loadAcceptedBudgets,
    showMessageWithTimeout,
  ]);

  const editAcceptedBudget = useCallback((accepted) => {
    setAcceptedBudgetPdfFile(null);
    setAcceptedBudgetForm({
      id: accepted.id,
      name: accepted.name || '',
      budgetNumber: accepted.budgetNumber || '',
      acceptanceDate: accepted.acceptanceDate || '',
      ticketRef: accepted.ticketRef || '',
      pdfFilename: accepted.pdfFilename || '',
      pdfOriginalName: accepted.pdfOriginalName || '',
    });
  }, []);

  const moveAcceptedToPlanning = useCallback(async (acceptedBudgetId) => {
    const selected = acceptedBudgets.find((item) => item.id === acceptedBudgetId);
    if (!selected) {
      showMessageWithTimeout('No se encontró el presupuesto en la bolsa de aceptados.');
      return false;
    }

    try {
      await apiFetch('/budgets', {
        method: 'POST',
        body: JSON.stringify({
          name: selected.name || '',
          budgetNumber: selected.budgetNumber || '',
          acceptanceDate: selected.acceptanceDate || '',
          ticketRef: selected.ticketRef || '',
          pdfFilename: selected.pdfFilename || null,
          pdfOriginalName: selected.pdfOriginalName || null,
          totalHours: Number(selected.totalHours || 0),
          laborBreakdown: selected.laborBreakdown || [],
          startDate: '',
          endDate: '',
          status: 'Accepted',
          category: selected.category || '',
          assignedPersonnel: selected.assignedPersonnel || [],
          fromAcceptedBag: true,
        }),
      });
      await apiFetch(`/accepted-budgets/${acceptedBudgetId}`, { method: 'DELETE' });
      await Promise.all([loadBudgets(), loadAcceptedBudgets()]);
      showMessageWithTimeout('Presupuesto movido a la mesa de planificación.');
      return true;
    } catch (error) {
      console.error('Error moving accepted budget:', error);
      showMessageWithTimeout(`Error al mover a planificación: ${error.message}`);
      return false;
    }
  }, [acceptedBudgets, loadBudgets, loadAcceptedBudgets, showMessageWithTimeout]);

  const deleteAcceptedBudget = useCallback(async (acceptedBudgetId) => {
    try {
      await apiFetch(`/accepted-budgets/${acceptedBudgetId}`, { method: 'DELETE' });
      loadAcceptedBudgets();
      showMessageWithTimeout('Presupuesto eliminado de la bolsa de aceptados.');
      return true;
    } catch (error) {
      console.error('Error deleting accepted budget:', error);
      showMessageWithTimeout(`Error al eliminar de bolsa de aceptados: ${error.message}`);
      return false;
    }
  }, [loadAcceptedBudgets, showMessageWithTimeout]);

  const deleteBudget = useCallback(async (id) => {
    try {
      await apiFetch(`/budgets/${id}`, { method: 'DELETE' });
      loadBudgets();
      showMessageWithTimeout('Presupuesto eliminado con éxito.');
      return true;
    } catch (error) {
      console.error('Error deleting budget:', error);
      showMessageWithTimeout(`Error al eliminar presupuesto: ${error.message}`);
      return false;
    }
  }, [loadBudgets, showMessageWithTimeout]);

  const moveBudgetToAcceptedBag = useCallback(async (budgetId) => {
    const selected = budgets.find((item) => item.id === budgetId);
    if (!selected) {
      showMessageWithTimeout('No se encontró el presupuesto en la mesa de planificación.');
      return false;
    }

    try {
      await apiFetch('/accepted-budgets', {
        method: 'POST',
        body: JSON.stringify({
          name: selected.name || '',
          budgetNumber: selected.budgetNumber || '',
          acceptanceDate: selected.acceptanceDate || '',
          ticketRef: selected.ticketRef || '',
          pdfFilename: selected.pdfFilename || null,
          pdfOriginalName: selected.pdfOriginalName || null,
          status: selected.status || 'Accepted',
          totalHours: Number(selected.totalHours || 0),
          laborBreakdown: selected.laborBreakdown || [],
          category: selected.category || '',
          assignedPersonnel: selected.assignedPersonnel || [],
        }),
      });
      await apiFetch(`/budgets/${budgetId}`, { method: 'DELETE' });
      await Promise.all([loadBudgets(), loadAcceptedBudgets()]);
      showMessageWithTimeout('Presupuesto devuelto a la bolsa de aceptados.');
      return true;
    } catch (error) {
      console.error('Error returning budget to accepted bag:', error);
      showMessageWithTimeout(`Error al devolver a bolsa: ${error.message}`);
      return false;
    }
  }, [budgets, loadBudgets, loadAcceptedBudgets, showMessageWithTimeout]);

  const addLaborType = useCallback(() => {
    setBudgetForm((prev) => ({
      ...prev,
      laborBreakdown: [...prev.laborBreakdown, { type: '', hours: '' }],
    }));
  }, []);

  const updateLaborBreakdown = useCallback((index, field, value) => {
    setBudgetForm((prev) => ({
      ...prev,
      laborBreakdown: prev.laborBreakdown.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  }, []);

  const removeLaborType = useCallback((index) => {
    setBudgetForm((prev) => ({
      ...prev,
      laborBreakdown: prev.laborBreakdown.filter((_, i) => i !== index),
    }));
  }, []);

  const totalHoursByType = useMemo(() => {
    const totals = {};
    budgets.forEach((budget) => {
      if (budget.laborBreakdown) {
        budget.laborBreakdown.forEach((item) => {
          const type = item.type;
          const hours = Number(item.hours);
          if (type && !Number.isNaN(hours)) {
            totals[type] = (totals[type] || 0) + hours;
          }
        });
      }
    });
    return Object.entries(totals).map(([type, hours]) => ({ type, hours }));
  }, [budgets]);

  const exportToCSV = useCallback((personnel = []) => {
    if (!budgets || budgets.length === 0) {
      showMessageWithTimeout('No hay presupuestos para exportar.');
      return;
    }

    const header = ['Nombre', '#Ticket', 'Categoría', 'Estado', 'Inicio', 'Fin', 'Horas Totales', 'Personal Asignado'];

    const rows = budgets.map((budget) => {
      const assigned = personnel
        .filter((p) => (budget.assignedPersonnel || []).includes(p.id))
        .map((p) => `${p.name} (${p.laborType})`)
        .join('; ');

      return [
        budget.name,
        budget.ticketRef || '',
        budget.category || '',
        budget.status,
        budget.startDate,
        budget.endDate,
        budget.totalHours,
        assigned,
      ];
    });

    const csvContent = [header, ...rows].map((row) => row.map((value) => `"${value}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'presupuestos_exportados.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [budgets, showMessageWithTimeout]);

  return {
    budgets,
    acceptedBudgets,
    budgetForm,
    acceptedBudgetForm,
    acceptedBudgetPdfFile,
    selectedCategory,
    updateBudgetForm,
    updateAcceptedBudgetForm,
    setAcceptedBudgetPdfFile,
    resetAcceptedBudgetForm,
    resetBudgetForm,
    editBudget,
    useBudgetAsTemplate,
    saveBudget,
    saveAcceptedBudget,
    editAcceptedBudget,
    deleteBudget,
    moveAcceptedToPlanning,
    deleteAcceptedBudget,
    moveBudgetToAcceptedBag,
    addLaborType,
    updateLaborBreakdown,
    removeLaborType,
    setSelectedCategory,
    totalHoursByType,
    exportToCSV,
  };
};
