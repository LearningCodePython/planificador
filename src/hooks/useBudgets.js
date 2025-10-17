import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAppContext } from '../contexts/AppContext';
import { monthsBetween, distributeHoursPerMonth, monthlyCapacityForPerson, computeProjectedFinishDate } from '../utils';

/**
 * Hook especializado para manejo de presupuestos
 * 
 * ¿Qué conseguimos?
 * - Encapsular TODA la lógica de presupuestos
 * - Reutilizar en cualquier componente que necesite budgets
 * - Estado y funciones específicas organizadas
 * - Validaciones centralizadas
 */
export const useBudgets = () => {
  // Contexto global
  const { db, userId, isAuthReady, showMessageWithTimeout, getAppId } = useAppContext();
  
  // Estado local del hook
  const [budgets, setBudgets] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  // Estado del formulario
  const [budgetForm, setBudgetForm] = useState({
    id: null, // null para nuevo, id para edición
    name: '',
    totalHours: '',
    laborBreakdown: [{ type: '', hours: '' }],
    startDate: '',
    endDate: '',
    status: 'Accepted',
    category: '',
    assignedPersonnel: [],
  });

  // Efecto para cargar presupuestos
  useEffect(() => {
    if (!db || !userId || !isAuthReady) return;

    const appId = getAppId();
    const budgetsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/budgets`);
    
    const unsubscribe = onSnapshot(budgetsCollectionRef, (snapshot) => {
      const budgetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBudgets(budgetsData);
    }, (error) => {
      console.error("Error fetching budgets:", error);
      showMessageWithTimeout(`Error al cargar presupuestos: ${error.message}`);
    });

    return () => unsubscribe();
  }, [db, userId, isAuthReady, getAppId, showMessageWithTimeout]);

  // Función para actualizar el formulario
  const updateBudgetForm = useCallback((field, value) => {
    setBudgetForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // Función para resetear el formulario
  const resetBudgetForm = useCallback(() => {
    setBudgetForm({
      id: null,
      name: '',
      totalHours: '',
      laborBreakdown: [{ type: '', hours: '' }],
      startDate: '',
      endDate: '',
      status: 'Accepted',
      category: '',
      assignedPersonnel: [],
    });
  }, []);

  // Función para cargar un presupuesto en el formulario (edición)
  const editBudget = useCallback((budget) => {
    setBudgetForm({
      id: budget.id,
      name: budget.name,
      totalHours: budget.totalHours,
      laborBreakdown: budget.laborBreakdown,
      startDate: budget.startDate,
      endDate: budget.endDate,
      status: budget.status,
      category: budget.category || '',
      assignedPersonnel: budget.assignedPersonnel || [],
    });
  }, []);

  // Función para usar como plantilla
  const useBudgetAsTemplate = useCallback((budget) => {
    const originalStart = new Date(budget.startDate);
    const originalEnd = new Date(budget.endDate);
    const durationInDays = Math.ceil((originalEnd - originalStart) / (1000 * 60 * 60 * 24));
    const today = new Date();
    const newStart = today.toISOString().split("T")[0];
    const newEndDate = new Date(today);
    newEndDate.setDate(today.getDate() + durationInDays);
    const newEnd = newEndDate.toISOString().split("T")[0];

    setBudgetForm({
      id: null,
      name: `${budget.name} (copia)`,
      totalHours: budget.totalHours,
      laborBreakdown: budget.laborBreakdown,
      startDate: newStart,
      endDate: newEnd,
      status: budget.status,
      category: budget.category || '',
      assignedPersonnel: budget.assignedPersonnel || [],
    });
  }, []);

  // Función para agregar/actualizar presupuesto
  const saveBudget = useCallback(async () => {
    if (!db || !userId) {
      showMessageWithTimeout("Firebase no está inicializado o el usuario no está autenticado.");
      return false;
    }

    // Validaciones
    if (!budgetForm.name || !budgetForm.totalHours || 
        budgetForm.laborBreakdown.some(item => !item.type || !item.hours)) {
      showMessageWithTimeout("Por favor, complete todos los campos del presupuesto.");
      return false;
    }

    // Validar fechas solo si ambas están presentes
    if (budgetForm.startDate && budgetForm.endDate) {
      const start = new Date(budgetForm.startDate);
      const end = new Date(budgetForm.endDate);
      if (start > end) {
        showMessageWithTimeout("La fecha de inicio no puede ser posterior a la fecha de fin.");
        return false;
      }
    }

    const budgetData = {
      name: budgetForm.name,
      totalHours: Number(budgetForm.totalHours),
      laborBreakdown: budgetForm.laborBreakdown.map(item => ({ 
        type: item.type, 
        hours: Number(item.hours) 
      })),
      startDate: budgetForm.startDate,
      endDate: budgetForm.endDate,
      status: budgetForm.status,
      category: budgetForm.category,
      assignedPersonnel: budgetForm.assignedPersonnel,
      userId: userId,
    };

    try {
      const appId = getAppId();
      if (budgetForm.id) {
        // Actualizar
        await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/budgets`, budgetForm.id), budgetData);
        showMessageWithTimeout("Presupuesto actualizado con éxito.");
      } else {
        // Crear nuevo
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/budgets`), budgetData);
        showMessageWithTimeout("Presupuesto añadido con éxito.");
      }
      resetBudgetForm();
      return true;
    } catch (e) {
      console.error("Error saving budget:", e);
      showMessageWithTimeout(`Error al guardar presupuesto: ${e.message}`);
      return false;
    }
  }, [db, userId, budgetForm, showMessageWithTimeout, getAppId, resetBudgetForm]);

  // Función para eliminar presupuesto
  const deleteBudget = useCallback(async (id) => {
    if (!db || !userId) {
      showMessageWithTimeout("Firebase no está inicializado o el usuario no está autenticado.");
      return false;
    }

    try {
      const appId = getAppId();
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/budgets`, id));
      showMessageWithTimeout("Presupuesto eliminado con éxito.");
      return true;
    } catch (e) {
      console.error("Error deleting budget:", e);
      showMessageWithTimeout(`Error al eliminar presupuesto: ${e.message}`);
      return false;
    }
  }, [db, userId, showMessageWithTimeout, getAppId]);

  // Funciones para manejar laborBreakdown
  const addLaborType = useCallback(() => {
    setBudgetForm(prev => ({
      ...prev,
      laborBreakdown: [...prev.laborBreakdown, { type: '', hours: '' }]
    }));
  }, []);

  const updateLaborBreakdown = useCallback((index, field, value) => {
    setBudgetForm(prev => ({
      ...prev,
      laborBreakdown: prev.laborBreakdown.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  }, []);

  const removeLaborType = useCallback((index) => {
    setBudgetForm(prev => ({
      ...prev,
      laborBreakdown: prev.laborBreakdown.filter((_, i) => i !== index)
    }));
  }, []);

  // Funciones calculadas (memoizadas)
  const totalHoursByType = useMemo(() => {
    const totals = {};
    budgets.forEach(budget => {
      if (budget.laborBreakdown) {
        budget.laborBreakdown.forEach(item => {
          const type = item.type;
          const hours = Number(item.hours);
          if (type && !isNaN(hours)) {
            totals[type] = (totals[type] || 0) + hours;
          }
        });
      }
    });
    return Object.entries(totals).map(([type, hours]) => ({ type, hours }));
  }, [budgets]);

  const exportToCSV = useCallback((personnel = []) => {
    if (!budgets || budgets.length === 0) {
      showMessageWithTimeout("No hay presupuestos para exportar.");
      return;
    }

    const header = [
      "Nombre",
      "Categoría", 
      "Estado",
      "Inicio",
      "Fin",
      "Horas Totales",
      "Personal Asignado"
    ];

    const rows = budgets.map(budget => {
      const assigned = personnel
        .filter(p => (budget.assignedPersonnel || []).includes(p.id))
        .map(p => `${p.name} (${p.laborType})`)
        .join("; ");
      
      return [
        budget.name,
        budget.category || "",
        budget.status,
        budget.startDate,
        budget.endDate,
        budget.totalHours,
        assigned
      ];
    });

    const csvContent = [header, ...rows]
      .map(row => row.map(value => `"${value}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", "presupuestos_exportados.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [budgets, showMessageWithTimeout]);

  return {
    // Estado
    budgets,
    budgetForm,
    selectedCategory,
    
    // Funciones de formulario
    updateBudgetForm,
    resetBudgetForm,
    editBudget,
    useBudgetAsTemplate,
    
    // Operaciones CRUD
    saveBudget,
    deleteBudget,
    
    // Labor breakdown
    addLaborType,
    updateLaborBreakdown,
    removeLaborType,
    
    // Filtros
    setSelectedCategory,
    
    // Datos calculados
    totalHoursByType,
    
    // Utilidades
    exportToCSV,
  };
};
