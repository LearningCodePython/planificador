
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, } from 'firebase/firestore';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer} from 'recharts';
import './index.css';

// Nueva función para calcular semanas de ocupación
const calcularSemanasOcupacion = (startDateStr, totalHours, hoursPerWeek) => {
  const semanas = [];
  let horasRestantes = totalHours;
  let currentDate = new Date(startDateStr);

  // Ajustar al próximo lunes si no empieza en lunes
  while (currentDate.getDay() !== 1) {
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Asignar horas por semana
  while (horasRestantes > 0) {
    const horasAsignadas = Math.min(hoursPerWeek, horasRestantes);
    semanas.push({
      semanaInicio: currentDate.toISOString().split("T")[0],
      horas: horasAsignadas,
    });
    horasRestantes -= horasAsignadas;
    currentDate.setDate(currentDate.getDate() + 7); // Ir a la siguiente semana
  }

  return semanas;
};

// Nuevas funciones
// Devuelve YYYY-MM para un Date
const ym = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

// Lista de meses YYYY-MM entre dos fechas (incluyendo inicio y fin)
const monthsBetween = (startStr, endStr) => {
  const res = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMarker = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= endMarker) {
    res.push(ym(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return res;
};

// Reparte horas de un presupuesto de forma uniforme por mes
// devuelve { 'YYYY-MM': horasDelMes, ... }
const distributeHoursPerMonth = (startStr, endStr, totalHours) => {
  const months = monthsBetween(startStr, endStr);
  if (months.length === 0) return {};
  const perMonth = totalHours / months.length;
  return months.reduce((acc, m) => (acc[m] = (acc[m] || 0) + perMonth, acc), {});
};

// Horas disponibles por persona al mes (aprox 4.33 semanas/mes)
const monthlyCapacityForPerson = (hoursPerDay, daysPerWeek) =>
  (Number(hoursPerDay) || 0) * (Number(daysPerWeek) || 0) * 4.33;

// Define el componente principal App.
function App() {
  // State variables for Firebase and user authentication
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);


  // State variables for application data
  const [budgets, setBudgets] = useState([]);
  const [personnel, setPersonnel] = useState([]);

  // Variables de estado para las entradas del formulario
  const [newBudgetName, setNewBudgetName] = useState('');
  const [newBudgetTotalHours, setNewBudgetTotalHours] = useState('');
  const [newBudgetLaborBreakdown, setNewBudgetLaborBreakdown] = useState([{ type: '', hours: '' }]);
  const [newBudgetStartDate, setNewBudgetStartDate] = useState('');
  const [newBudgetEndDate, setNewBudgetEndDate] = useState('');
  const [newBudgetStatus, setNewBudgetStatus] = useState('Accepted'); // Default status
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [assignedPersonnelIds, setAssignedPersonnelIds] = useState([]); //Nueva linea

  const [newPersonnelName, setNewPersonnelName] = useState('');
  const [newPersonnelLaborType, setNewPersonnelLaborType] = useState('');
  const [newPersonnelHoursPerDay, setNewPersonnelHoursPerDay] = useState('');
  const [newPersonnelDaysPerWeek, setNewPersonnelDaysPerWeek] = useState('');

  // State for editing
  const [editingBudget, setEditingBudget] = useState(null);
  const [editingPersonnel, setEditingPersonnel] = useState(null);

  // State for UI messages/modals
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);

  // Seleccionar por categorias de presupuestos
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  // Reset forms and editing state
  const resetBudgetForm = () => {
    setEditingBudget(null);
    setNewBudgetName('');
    setNewBudgetTotalHours('');
    setNewBudgetLaborBreakdown([{ type: '', hours: '' }]);
    setNewBudgetStartDate('');
    setNewBudgetEndDate('');
    setNewBudgetStatus('Accepted');
    setNewBudgetCategory('');
    setAssignedPersonnelIds([]);
  };

  const resetPersonnelForm = () => {
    setEditingPersonnel(null);
    setNewPersonnelName('');
    setNewPersonnelLaborType('');
    setNewPersonnelHoursPerDay('');
    setNewPersonnelDaysPerWeek('');
  };


  // Initialize Firebase and set up authentication listener
  useEffect(() => {
    try {
      // Usa las variables de entorno de React
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

      // Listen for authentication state changes
      const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
        if (user) {
          // User is signed in, set userId
          setUserId(user.uid);
        } else {
          // En un entorno real (fuera de Canvas), inicia sesión anónimamente si no hay token
          try {
            await signInAnonymously(authInstance);
          } catch (error) {
            console.error("Error al iniciar sesión anónimamente:", error);
            showMessageWithTimeout(`Error al iniciar sesión: ${error.message}`);
          }
        }
        setIsAuthReady(true); // Authentication state is ready
      });

      // Clean up the listener on component unmount
      return () => unsubscribe();
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      showMessageWithTimeout(`Error al inicializar Firebase: ${error.message}`);
    }
  }, []);

  // Function to display messages in a modal
  const showMessageWithTimeout = (msg, duration = 3000) => {
    setMessage(msg);
    setShowMessage(true);
    setTimeout(() => {
      setShowMessage(false);
      setMessage('');
    }, duration);
  };

  // Fetch budgets and personnel data when auth is ready and userId is available
  useEffect(() => {
    if (db && userId && isAuthReady) {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'; // Fallback for local testing

      // Setup real-time listener for budgets
      const budgetsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/budgets`);
      const unsubscribeBudgets = onSnapshot(budgetsCollectionRef, (snapshot) => {
        const budgetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBudgets(budgetsData);
      }, (error) => {
        console.error("Error fetching budgets:", error);
        showMessageWithTimeout(`Error al cargar presupuestos: ${error.message}`);
      });

      // Setup real-time listener for personnel
      const personnelCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/personnel`);
      const unsubscribePersonnel = onSnapshot(personnelCollectionRef, (snapshot) => {
        const personnelData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPersonnel(personnelData);
      }, (error) => {
        console.error("Error fetching personnel:", error);
        showMessageWithTimeout(`Error al cargar personal: ${error.message}`);
      });

      // Clean up listeners on component unmount or when db/userId changes
      return () => {
        unsubscribeBudgets();
        unsubscribePersonnel();
      };
    }
  }, [db, userId, isAuthReady]);

  // Handle adding a new labor type breakdown field
  const handleAddLaborType = () => {
    setNewBudgetLaborBreakdown([...newBudgetLaborBreakdown, { type: '', hours: '' }]);
  };

  // Handle changes in labor type breakdown fields
  const handleLaborBreakdownChange = (index, field, value) => {
    const updatedBreakdown = newBudgetLaborBreakdown.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setNewBudgetLaborBreakdown(updatedBreakdown);
  };

  // Handle removing a labor type breakdown field
  const handleRemoveLaborType = (index) => {
    const updatedBreakdown = newBudgetLaborBreakdown.filter((_, i) => i !== index);
    setNewBudgetLaborBreakdown(updatedBreakdown);
  };

  // Add or update a budget in Firestore
  const handleAddOrUpdateBudget = async () => {
    if (!db || !userId) {
      showMessageWithTimeout("Firebase no está inicializado o el usuario no está autenticado.");
      return;
    }

    if (!newBudgetName || !newBudgetTotalHours || newBudgetLaborBreakdown.some(item => !item.type || !item.hours)) {
      showMessageWithTimeout("Por favor, complete todos los campos del presupuesto.");
      return;
    }

    if (assignedPersonnelIds.length === 0) {
      showMessageWithTimeout("Debes asignar al menos una persona al presupuesto antes de guardarlo.");
      return;
    }

    if (!newBudgetStartDate || !newBudgetEndDate) {
      showMessageWithTimeout("Debes especificar una fecha de inicio y una fecha de fin.");
      return;
    }

    const start = new Date(newBudgetStartDate);
    const end = new Date(newBudgetEndDate);

    if (start > end) {
      showMessageWithTimeout("La fecha de inicio no puede ser posterior a la fecha de fin.");
      return;
    }

    const budgetData = {
      name: newBudgetName,
      totalHours: Number(newBudgetTotalHours),
      laborBreakdown: newBudgetLaborBreakdown.map(item => ({ type: item.type, hours: Number(item.hours) })),
      startDate: newBudgetStartDate,
      endDate: newBudgetEndDate,
      status: newBudgetStatus,
      category: newBudgetCategory,
      assignedPersonnel: assignedPersonnelIds,
      userId: userId, // Store userId for private data
    };

    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'; // Fallback for local testing
      if (editingBudget) {
        // Update existing budget
        await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/budgets`, editingBudget.id), budgetData);
        showMessageWithTimeout("Presupuesto actualizado con éxito.");
      } else {
        // Add new budget
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/budgets`), budgetData);
        showMessageWithTimeout("Presupuesto añadido con éxito.");
      }
      // Clear form and reset editing state
      setNewBudgetName('');
      setNewBudgetTotalHours('');
      setNewBudgetLaborBreakdown([{ type: '', hours: '' }]);
      setNewBudgetStartDate('');
      setNewBudgetEndDate('');
      setNewBudgetStatus('Accepted');
      setEditingBudget(null);
      setNewBudgetCategory('');
      setAssignedPersonnelIds([]);
    } catch (e) {
      console.error("Error adding/updating budget: ", e);
      showMessageWithTimeout(`Error al guardar presupuesto: ${e.message}`);
    }
  };

  // Set form for editing a budget
  const handleEditBudget = (budget) => {
    setEditingBudget(budget);
    setNewBudgetName(budget.name);
    setNewBudgetTotalHours(budget.totalHours);
    setNewBudgetLaborBreakdown(budget.laborBreakdown);
    setNewBudgetStartDate(budget.startDate);
    setNewBudgetEndDate(budget.endDate);
    setNewBudgetStatus(budget.status);
    setNewBudgetCategory(budget.category || ''); //  <-- Nueva lienea
    setAssignedPersonnelIds(budget.assignedPersonnel || []); // <-- Nueva linea
  };

  // Set form for creating a new budget from an existing one
  const handleUseBudgetAsTemplate = (budget) => {
    setEditingBudget(null); // Nos aseguramos de que NO se entre en modo edición
    setNewBudgetName(`${budget.name} (copia)`);
    setNewBudgetTotalHours(budget.totalHours);
    setNewBudgetLaborBreakdown(budget.laborBreakdown);
    setNewBudgetStatus(budget.status);
    setNewBudgetCategory(budget.category || '');
    setAssignedPersonnelIds(budget.assignedPersonnel || []); 

    // Nueva lógica para fechas
    const originalStart = new Date(budget.startDate);
    const originalEnd = new Date(budget.endDate);
    const durationInDays = Math.ceil((originalEnd - originalStart) / (1000 * 60 * 60 * 24));

    const today = new Date();
    const newStart = today.toISOString().split("T")[0]; // YYYY-MM-DD
    const newEndDate = new Date(today);
    newEndDate.setDate(today.getDate() + durationInDays);
    const newEnd = newEndDate.toISOString().split("T")[0];

    setNewBudgetStartDate(newStart);
    setNewBudgetEndDate(newEnd);

  };

  // Delete a budget from Firestore
  const handleDeleteBudget = async (id) => {
    if (!db || !userId) {
      showMessageWithTimeout("Firebase no está inicializado o el usuario no está autenticado.");
      return;
    }
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'; // Fallback for local testing
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/budgets`, id));
      showMessageWithTimeout("Presupuesto eliminado con éxito.");
    } catch (e) {
      console.error("Error deleting budget: ", e);
      showMessageWithTimeout(`Error al eliminar presupuesto: ${e.message}`);
    }
  };

  // Add or update personnel in Firestore
  const handleAddOrUpdatePersonnel = async () => {
    if (!db || !userId) {
      showMessageWithTimeout("Firebase no está inicializado o el usuario no está autenticado.");
      return;
    }

    if (!newPersonnelName || !newPersonnelLaborType || !newPersonnelHoursPerDay || !newPersonnelDaysPerWeek) {
      showMessageWithTimeout("Por favor, complete todos los campos del personal.");
      return;
    }

    const personnelData = {
      name: newPersonnelName,
      laborType: newPersonnelLaborType,
      hoursPerDay: Number(newPersonnelHoursPerDay),
      daysPerWeek: Number(newPersonnelDaysPerWeek),
      userId: userId, // Store userId for private data
    };

    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'; // Fallback for local testing
      if (editingPersonnel) {
        // Update existing personnel
        await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/personnel`, editingPersonnel.id), personnelData);
        showMessageWithTimeout("Personal actualizado con éxito.");
      } else {
        // Add new personnel
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/personnel`), personnelData);
        showMessageWithTimeout("Personal añadido con éxito.");
      }
      // Clear form and reset editing state
      setNewPersonnelName('');
      setNewPersonnelLaborType('');
      setNewPersonnelHoursPerDay('');
      setNewPersonnelDaysPerWeek('');
      setEditingPersonnel(null);
    } catch (e) {
      console.error("Error adding/updating personnel: ", e);
      showMessageWithTimeout(`Error al guardar personal: ${e.message}`);
    }
  };

  // Set form for editing personnel
  const handleEditPersonnel = (person) => {
    setEditingPersonnel(person);
    setNewPersonnelName(person.name);
    setNewPersonnelLaborType(person.laborType);
    setNewPersonnelHoursPerDay(person.hoursPerDay);
    setNewPersonnelDaysPerWeek(person.daysPerWeek);
  };

  // Delete personnel from Firestore
  const handleDeletePersonnel = async (id) => {
    if (!db || !userId) {
      showMessageWithTimeout("Firebase no está inicializado o el usuario no está autenticado.");
      return;
    }
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'; // Fallback for local testing
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/personnel`, id));
      showMessageWithTimeout("Personal eliminado con éxito.");
    } catch (e) {
      console.error("Error deleting personnel: ", e);
      showMessageWithTimeout(`Error al eliminar personal: ${e.message}`);
    }
  };

  // Calculate required and available hours for capacity planning (MENSUAL, PROMEDIO)
  const calculateCapacity = useCallback(() => {
    const requiredByRoleTotal = {}; // horas totales sumadas en todos los meses
    const monthsByRole = {};        // Set de meses activos por rol

    // Requerido: repartir horas de cada presupuesto aceptado por mes y acumular
    budgets
      .filter(b => b.status === 'Accepted' && b.startDate && b.endDate)
      .forEach(budget => {
        (budget.laborBreakdown || []).forEach(item => {
          const dist = distributeHoursPerMonth(budget.startDate, budget.endDate, Number(item.hours) || 0);
          Object.entries(dist).forEach(([month, hrs]) => {
            requiredByRoleTotal[item.type] = (requiredByRoleTotal[item.type] || 0) + hrs;
            monthsByRole[item.type] ||= new Set();
            monthsByRole[item.type].add(month);
          });
        });
      });

    // Disponible: capacidad mensual por rol (constante por mes)
    const availableMonthly = {};
    personnel.forEach(person => {
      const capMes = monthlyCapacityForPerson(person.hoursPerDay, person.daysPerWeek);
      availableMonthly[person.laborType] = (availableMonthly[person.laborType] || 0) + capMes;
    });

    // Combinar roles
    const allLaborTypes = new Set([...Object.keys(requiredByRoleTotal), ...Object.keys(availableMonthly)]);

    return Array.from(allLaborTypes).map(type => {
      const monthsCount = monthsByRole[type]?.size || 0;
      const reqAvgPerMonth = monthsCount > 0 ? (requiredByRoleTotal[type] / monthsCount) : 0;
      const avail = availableMonthly[type] || 0;

      const deficit = reqAvgPerMonth > avail ? reqAvgPerMonth - avail : 0;
      const surplus = avail > reqAvgPerMonth ? avail - reqAvgPerMonth : 0;
      const utilization = avail > 0 ? (reqAvgPerMonth / avail) * 100 : 0;

      return {
        laborType: type,
        required: Math.round(reqAvgPerMonth),
        available: Math.round(avail),
        deficit: Math.round(deficit),
        surplus: Math.round(surplus),
        utilization: Number(utilization.toFixed(2)),
      };
    });
  }, [budgets, personnel]);


  const capacitySummary = calculateCapacity();

  // Calcular los presupuestos asignados por persona
  const personnelAssignments = personnel.map(person => {
    const assignedBudgets = budgets
      .filter(budget => (budget.assignedPersonnel || []).includes(person.id))
      .map(budget => ({
        id: budget.id,
        name: budget.name,
        hours: (budget.laborBreakdown || []).reduce((sum, item) => {
          return item.type === person.laborType ? sum + item.hours : sum;
        }, 0)
      }));

    return {
      ...person,
      assignedBudgets
    };
  });

  // Calcular la capacidad por persona.
  const calculateWorkloadPerPerson = useCallback(() => {
    const workload = {};

    // Inicializar disponibilidad mensual por persona
    personnel.forEach((person) => {
      const availableHours = monthlyCapacityForPerson(person.hoursPerDay, person.daysPerWeek);
      workload[person.id] = {
        id: person.id,
        name: person.name,
        laborType: person.laborType,
        assignedHours: 0,     // h/mes (promedio)
        availableHours: availableHours, // h/mes
      };
    });

    // Para cada presupuesto, repartir horas de ese rol entre los meses que dura
    budgets.forEach((budget) => {
      if (!budget.assignedPersonnel || !(budget.laborBreakdown && budget.startDate && budget.endDate)) return;

      budget.assignedPersonnel.forEach((personId) => {
        if (!workload[personId]) return; // persona borrada o no cargada

        const personRole = workload[personId].laborType;
        const lb = (budget.laborBreakdown || []).find(x => x.type === personRole);
        if (!lb) return;

        const months = monthsBetween(budget.startDate, budget.endDate);
        const hoursPerMonth = months.length > 0 ? Number(lb.hours || 0) / months.length : 0;

        workload[personId].assignedHours += hoursPerMonth;
      });
    });

    // Redondear para UI
    return Object.values(workload).map(w => ({
      ...w,
      assignedHours: Math.round(w.assignedHours),
      availableHours: Math.round(w.availableHours),
    }));
  }, [budgets, personnel]);


  const workloadSummary = calculateWorkloadPerPerson();

  const monthlyOccupationData = personnel.map(person => {
    // horas asignadas por mes a esta persona (sumando presupuestos donde participa)
    const perMonth = {}; // { 'YYYY-MM': horas }
      budgets
        .filter(b => (b.assignedPersonnel || []).includes(person.id))
        .forEach(b => {
          // horas de este rol en este presupuesto
          const lb = (b.laborBreakdown || []).find(x => x.type === person.laborType);
          if (!lb) return;
          const dist = distributeHoursPerMonth(b.startDate, b.endDate, Number(lb.hours) || 0);
          Object.entries(dist).forEach(([month, hrs]) => {
            perMonth[month] = (perMonth[month] || 0) + hrs;
          });
        });
    if (Object.keys(perMonth).length === 0) return null;

      // Convertimos al formato de Recharts: { name: 'Persona', 'YYYY-MM': horas, ... }
    return { name: person.name, ...perMonth };
  }).filter(Boolean);

  // Unir todas las claves de meses presentes en monthlyOccupationData
  const allMonthKeys = useMemo(() => {
    const s = new Set();
    monthlyOccupationData.forEach(row => {
      Object.keys(row).forEach(k => {
        if (k !== 'name') s.add(k); // "name" es la etiqueta del eje X
      });
    });
    return Array.from(s).sort(); // YYYY-MM en orden
  }, [monthlyOccupationData]);

  // Línea para el filtrado de presupuestos
  const filteredBudgets = selectedCategory === 'Todas'
  ? budgets
  : budgets.filter(b => b.category === selectedCategory);

  // Calcula fin estimado según horas requeridas y capacidad semanal del personal asignado
  function computeProjectedFinishDate(budget, allPersonnel = []) {
    const { startDate, laborBreakdown = [], assignedPersonnel = [] } = budget;
    if (!startDate || laborBreakdown.length === 0 || assignedPersonnel.length === 0) {
      return null; // No hay datos suficientes
    }

    // Capacidad semanal por rol basada en personal asignado
    const weeklyCapacityByRole = {};
    assignedPersonnel.forEach(pid => {
      const p = allPersonnel.find(pp => pp.id === pid);
      if (!p) return;
      const cap = (Number(p.hoursPerDay) || 0) * (Number(p.daysPerWeek) || 0);
      weeklyCapacityByRole[p.laborType] = (weeklyCapacityByRole[p.laborType] || 0) + cap;
    });

    // Para cada rol requerido, cuántas semanas hacen falta
    let maxWeeks = 0;
    for (const item of laborBreakdown) {
      const role = item.type;
      const hours = Number(item.hours) || 0;
      const weeklyCap = weeklyCapacityByRole[role] || 0;
      if (hours > 0 && weeklyCap === 0) {
        return { feasible: false, missingRole: role };
      }
      const weeksForRole = weeklyCap > 0 ? Math.ceil(hours / weeklyCap) : 0;
      if (weeksForRole > maxWeeks) maxWeeks = weeksForRole;
    }

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + maxWeeks * 7);
    const endStr = end.toISOString().split('T')[0];

    return { feasible: true, endDate: endStr, weeks: maxWeeks };
  }

  // 🔮 Estimación de fecha de fin en el formulario según recursos asignados actuales
  const projectedFromForm = useMemo(() => {
    if (!newBudgetStartDate) return null;
    const cleanedBreakdown = newBudgetLaborBreakdown.filter(i => i.type && i.hours);
    const tempBudget = {
      startDate: newBudgetStartDate,
      laborBreakdown: cleanedBreakdown,
      assignedPersonnel: assignedPersonnelIds
    };
    return computeProjectedFinishDate(tempBudget, personnel);
  }, [newBudgetStartDate, newBudgetLaborBreakdown, assignedPersonnelIds, personnel]);

  // Export to CSV
  const exportBudgetsToCSV = () => {
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
  };

  // Render the main application UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-inter text-gray-800">
      {/* Message Modal */}
      {showMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl border border-blue-200 animate-fade-in">
            <p className="text-lg font-semibold text-center text-blue-700">{message}</p>
            <button
              onClick={() => setShowMessage(false)}
              className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300 ease-in-out shadow-md"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <h1 className="text-4xl font-extrabold text-center text-indigo-800 mb-8 drop-shadow-md">
        📊 Planificador de Recursos y Presupuestos
      </h1>

      {/* User ID Display */}
      {userId && (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6 text-center text-sm text-gray-600 border border-blue-200">
          Tu ID de Usuario (para datos privados): <span className="font-mono text-blue-700 break-all">{userId}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Budget Management Section */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-200">
          <h2 className="text-2xl font-bold text-indigo-700 mb-6 border-b pb-3 border-indigo-200">
            📝 Gestión de Presupuestos
          </h2>

          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="budgetName" className="block text-sm font-medium text-gray-700">Nombre del Presupuesto</label>
              <input
                type="text"
                id="budgetName"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={newBudgetName}
                onChange={(e) => setNewBudgetName(e.target.value)}
                placeholder="Ej. Proyecto Alpha"
              />
            </div>
            <div>
              <label htmlFor="budgetTotalHours" className="block text-sm font-medium text-gray-700">Horas Totales Estimadas</label>
              <input
                type="number"
                id="budgetTotalHours"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={newBudgetTotalHours}
                onChange={(e) => setNewBudgetTotalHours(e.target.value)}
                placeholder="Ej. 500"
              />
            </div>
            <div>
              <label htmlFor="assignedPersonnel" className="block text-sm font-medium text-gray-700">Asignar Personal</label>
                <select
                  multiple
                  id="assignedPersonnel"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={assignedPersonnelIds}
                  onChange={(e) => {
                    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                    setAssignedPersonnelIds(selectedOptions);
                  }}
                >
                  {personnel.map(person => (
                    <option key={person.id} value={person.id}>
                      {person.name} ({person.laborType})
                    </option>
                  ))}
                </select>
            </div>

            <h3 className="text-lg font-semibold text-gray-700 mt-4">Desglose por Mano de Obra:</h3>
            {newBudgetLaborBreakdown.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-2 items-end">
                <div className="flex-1 w-full">
                  <label htmlFor={`laborType-${index}`} className="block text-sm font-medium text-gray-700">Tipo</label>
                  <input
                    type="text"
                    id={`laborType-${index}`}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={item.type}
                    onChange={(e) => handleLaborBreakdownChange(index, 'type', e.target.value)}
                    placeholder="Ej. Ingeniero"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label htmlFor={`laborHours-${index}`} className="block text-sm font-medium text-gray-700">Horas</label>
                  <input
                    type="number"
                    id={`laborHours-${index}`}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={item.hours}
                    onChange={(e) => handleLaborBreakdownChange(index, 'hours', e.target.value)}
                    placeholder="Ej. 200"
                  />
                </div>
                {newBudgetLaborBreakdown.length > 1 && (
                  <button
                    onClick={() => handleRemoveLaborType(index)}
                    className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 ease-in-out shadow-sm flex-shrink-0"
                    title="Eliminar tipo de mano de obra"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={handleAddLaborType}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-300 ease-in-out shadow-md flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Añadir Tipo de Mano de Obra
            </button>

            <div>
              <label htmlFor="budgetStartDate" className="block text-sm font-medium text-gray-700">Fecha de Inicio Estimada</label>
              <input
                type="date"
                id="budgetStartDate"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={newBudgetStartDate}
                onChange={(e) => setNewBudgetStartDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="budgetEndDate" className="block text-sm font-medium text-gray-700">
                Fecha de Finalización Deseada
              </label>
              <input
                type="date"
                id="budgetEndDate"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={newBudgetEndDate}
                onChange={(e) => setNewBudgetEndDate(e.target.value)}
              />

              {/* 👇 Campo informativo: Fin estimado con recursos asignados */}
              <div className="mt-1 text-xs">
                {projectedFromForm ? (
                  projectedFromForm.feasible ? (
                    <span className="text-emerald-700">
                      Fin estimado con recursos asignados: <strong>{projectedFromForm.endDate}</strong> ({projectedFromForm.weeks} semanas)
                    </span>
                  ) : (
                    <span className="text-red-600">
                      No es posible estimar: falta capacidad del rol <strong>{projectedFromForm.missingRole}</strong>.
                    </span>
                  )
                ) : (
                  <span className="text-gray-500">
                    Completa fecha de inicio, desglose y (opcional) personal asignado para estimar fin.
                  </span>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="budgetStatus" className="block text-sm font-medium text-gray-700">Estado</label>
              <select
                id="budgetStatus"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={newBudgetStatus}
                onChange={(e) => setNewBudgetStatus(e.target.value)}
              >
                <option value="Accepted">Aceptado</option>
                <option value="Pending">Pendiente</option>
                <option value="Completed">Completado</option>
                <option value="On Hold">En Espera</option>
              </select>
            </div>
            <div>
              <label htmlFor="budgetCategory" className="block text-sm font-medium text-gray-700">Categoría del Proyecto</label>
              <select
                id="budgetCategory"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={newBudgetCategory}
                onChange={(e) => setNewBudgetCategory(e.target.value)}
              >
                <option value="">Seleccione una categoría</option>
                <option value="Obra">Obra</option>
                <option value="Mantenimiento">Mantenimiento</option>
              </select>
            </div>
            <button
              onClick={handleAddOrUpdateBudget}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 ease-in-out shadow-md flex items-center justify-center gap-2"
            >
              {editingBudget ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.827-2.828z" />
                  </svg>
                  Actualizar Presupuesto
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Añadir Presupuesto
                </>
              )}
            </button>
          </div>

          <h3 className="text-xl font-bold text-indigo-700 mb-4 border-b pb-2 border-indigo-200">
            Lista de Presupuestos
          </h3>
          <button
            onClick={exportBudgetsToCSV}
            className="mb-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm shadow"
          >
            📤 Exportar Presupuestos a CSV
          </button>

          <div className="mb-4">
            <label htmlFor="categoryFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por categoría:
            </label>
            <select
              id="categoryFilter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-60 p-2 border border-gray-300 rounded-md shadow-sm text-sm"
            >
              <option value="Todas">Todas</option>
              {[...new Set(budgets.map(b => b.category).filter(Boolean))].map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {filteredBudgets.length === 0 ? (
            <p className="text-gray-500">No hay presupuestos añadidos aún.</p>
          ) : (
            <div className="space-y-4">
              {filteredBudgets.map((budget) => {
                const assignedPeople = personnel.filter(p => (budget.assignedPersonnel || []).includes(p.id));

                return (
                <div key={budget.id} className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-100">
                  <p className="text-lg font-semibold text-blue-800">{budget.name} ({budget.status})</p>
                  <p className="text-sm text-gray-600">Horas Totales: {budget.totalHours}</p>
                  <p className="text-sm text-gray-600">Inicio: {budget.startDate} | Fin: {budget.endDate}</p>

                  {assignedPeople.length > 0 && (
                    <div className="mt-2 text-sm text-gray-700">
                      <span className="font-medium">Personal Asignado:</span>
                      <ul className="list-disc list-inside">
                        {assignedPeople.map((person) => (
                          <li key={person.id}>{person.name} ({person.laborType})</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-2 text-sm text-gray-700">
                    <span className="font-medium">Desglose:</span>
                    {(budget.laborBreakdown || []).map((item, idx) => (
                      <span key={idx} className="ml-2 bg-blue-200 px-2 py-1 rounded-full text-xs font-semibold">
                        {item.type}: {item.hours}h
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => handleEditBudget(budget)}
                      className="flex-1 bg-yellow-500 text-white py-1 px-3 rounded-md hover:bg-yellow-600 transition duration-300 ease-in-out text-sm shadow-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteBudget(budget.id)}
                      className="flex-1 bg-red-500 text-white py-1 px-3 rounded-md hover:bg-red-600 transition duration-300 ease-in-out text-sm shadow-sm"
                    >
                      Eliminar
                    </button>
                    <button
                      onClick={() => handleUseBudgetAsTemplate(budget)}
                      className="flex-1 bg-blue-600 text-white py-1 px-3 rounded-md hover:bg-blue-700 transition duration-300 ease-in-out text-sm shadow-sm"
                    >
                      USAR COMO BASE
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* Personnel Management Section */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-200">
          <h2 className="text-2xl font-bold text-indigo-700 mb-6 border-b pb-3 border-indigo-200">
            👥 Gestión de Personal
          </h2>

          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="personnelName" className="block text-sm font-medium text-gray-700">Nombre del Empleado</label>
              <input
                type="text"
                id="personnelName"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={newPersonnelName}
                onChange={(e) => setNewPersonnelName(e.target.value)}
                placeholder="Ej. Juan Pérez"
              />
            </div>
            <div>
              <label htmlFor="personnelLaborType" className="block text-sm font-medium text-gray-700">Tipo de Mano de Obra / Rol</label>
              <input
                type="text"
                id="personnelLaborType"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={newPersonnelLaborType}
                onChange={(e) => setNewPersonnelLaborType(e.target.value)}
                placeholder="Ej. Diseñador"
              />
            </div>
            <div>
              <label htmlFor="personnelHoursPerDay" className="block text-sm font-medium text-gray-700">Horas Disponibles por Día</label>
              <input
                type="number"
                id="personnelHoursPerDay"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={newPersonnelHoursPerDay}
                onChange={(e) => setNewPersonnelHoursPerDay(e.target.value)}
                placeholder="Ej. 8"
              />
            </div>
            <div>
              <label htmlFor="personnelDaysPerWeek" className="block text-sm font-medium text-gray-700">Días Disponibles por Semana</label>
              <input
                type="number"
                id="personnelDaysPerWeek"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={newPersonnelDaysPerWeek}
                onChange={(e) => setNewPersonnelDaysPerWeek(e.target.value)}
                placeholder="Ej. 5"
              />
            </div>
            <button
              onClick={handleAddOrUpdatePersonnel}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 ease-in-out shadow-md flex items-center justify-center gap-2"
            >
              {editingPersonnel ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.827-2.828z" />
                  </svg>
                  Actualizar Personal
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Añadir Personal
                </>
              )}
            </button>
          </div>

          <h3 className="text-xl font-bold text-indigo-700 mb-4 border-b pb-2 border-indigo-200">
            Lista de Personal
          </h3>
          {personnel.length === 0 ? (
            <p className="text-gray-500">No hay personal añadido aún.</p>
          ) : (
            <div className="space-y-4">
              {personnelAssignments.map((person) => (
                <div key={person.id} className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-100">
                  <p className="text-lg font-semibold text-blue-800">{person.name}</p>
                  <p className="text-sm text-gray-600">Rol: {person.laborType}</p>
                  <p className="text-sm text-gray-600">Horas/Día: {person.hoursPerDay} | Días/Semana: {person.daysPerWeek}</p>
                  {person.assignedBudgets.length > 0 && (
                    <div className="mt-2 text-sm text-gray-700">
                      <span className="font-medium">Presupuestos Asignados:</span>
                      <ul className="list-disc list-inside">
                        {person.assignedBudgets.map((b) => (
                          <li key={b.id}>{b.name} ({b.hours}h)</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleEditPersonnel(person)}
                      className="flex-1 bg-yellow-500 text-white py-1 px-3 rounded-md hover:bg-yellow-600 transition duration-300 ease-in-out text-sm shadow-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeletePersonnel(person.id)}
                      className="flex-1 bg-red-500 text-white py-1 px-3 rounded-md hover:bg-red-600 transition duration-300 ease-in-out text-sm shadow-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
      {/* Capacity Planning Section */}
      <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-green-200">
        <h2 className="text-2xl font-bold text-green-700 mb-6 border-b pb-3 border-green-200">
          📋 Carga de Trabajo por Persona
        </h2>
        {workloadSummary.length === 0 ? (
          <p className="text-gray-500">No hay datos suficientes para calcular la carga.</p>
        ) : (
          <div className="space-y-4">
            {workloadSummary.map((person, index) => {
              const assigned = Number(person.assignedHours) || 0;   // h/mes
              const available = Number(person.availableHours) || 0; // h/mes
              const over = Math.max(assigned - available, 0);
              const free = Math.max(available - assigned, 0);
              const pct = available > 0 ? Math.min((assigned / available) * 100, 100) : 0;

              return (
                <div key={index} className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg shadow-md border border-green-200">
                  <h3 className="text-xl font-semibold text-green-800">{person.name} ({person.laborType})</h3>

                  <p className="text-sm text-gray-700">Horas Asignadas: <span className="font-bold">{assigned} h/mes</span></p>
                  <p className="text-sm text-gray-700">Horas Disponibles: <span className="font-bold">{available} h/mes</span></p>

                  {over > 0 ? (
                    <p className="text-red-600 font-bold text-sm">🔺 Sobrecarga: Excede en {over} h/mes</p>
                  ) : (
                    <p className="text-green-600 font-bold text-sm">✅ OK: Disponible {free} h/mes</p>
                  )}

                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div
                      className={`h-2.5 rounded-full ${over > 0 ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                
                  {/* Nueva sección de meses ocupados */}
                  <div className="mt-3 text-sm text-gray-800">
                    <span className="font-semibold">Meses ocupados:</span>
                    <ul className="list-disc list-inside mt-1">
                      {(() => {
                        const persona = personnel.find(p => p.name === person.name);
                        if (!persona) return null;
                      
                        const perMonth = {};
                        budgets
                          .filter(b => (b.assignedPersonnel || []).includes(persona.id))
                          .forEach(b => {
                            const lb = (b.laborBreakdown || []).find(x => x.type === persona.laborType);
                            if (!lb) return;
                            const dist = distributeHoursPerMonth(b.startDate, b.endDate, Number(lb.hours) || 0);
                            Object.entries(dist).forEach(([m, hrs]) => { perMonth[m] = (perMonth[m] || 0) + hrs; });
                          });
                        
                        const months = Object.keys(perMonth).sort();
                        return months.map((m) => (
                          <li key={m}>
                            <strong>{m}</strong>: {Math.round(perMonth[m])}h
                          </li>
                        ));
                      })()}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-purple-200">
        <h2 className="text-2xl font-bold text-purple-700 mb-6 border-b pb-3 border-purple-200">
          📅 Ocupación Mensual del Personal (Gráfico)
        </h2>
        {monthlyOccupationData.length === 0 ? (
          <p className="text-gray-500">No hay datos suficientes para mostrar el gráfico.</p>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={monthlyOccupationData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: 'Horas/mes', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              {allMonthKeys.map((monthKey, idx) => (
                <Bar
                  key={monthKey}
                  dataKey={monthKey}
                  stackId="a"
                  fill={`hsl(${(idx * 70) % 360}, 70%, 60%)`}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
export default App;