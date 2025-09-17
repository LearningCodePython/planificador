import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, } from 'firebase/firestore';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import './index.css';
import BudgetDashboard from './BudgetDashboard';
import PersonnelManager from './PersonnelManager';
import { monthsBetween, distributeHoursPerMonth, monthlyCapacityForPerson, computeProjectedFinishDate } from './utils';


function App() {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [budgets, setBudgets] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [newBudgetName, setNewBudgetName] = useState('');
  const [newBudgetTotalHours, setNewBudgetTotalHours] = useState('');
  const [newBudgetLaborBreakdown, setNewBudgetLaborBreakdown] = useState([{ type: '', hours: '' }]);
  const [newBudgetStartDate, setNewBudgetStartDate] = useState('');
  const [newBudgetEndDate, setNewBudgetEndDate] = useState('');
  const [newBudgetStatus, setNewBudgetStatus] = useState('Accepted');
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [assignedPersonnelIds, setAssignedPersonnelIds] = useState([]);
  const [newPersonnelName, setNewPersonnelName] = useState('');
  const [newPersonnelLaborType, setNewPersonnelLaborType] = useState('');
  const [newPersonnelHoursPerDay, setNewPersonnelHoursPerDay] = useState('');
  const [newPersonnelDaysPerWeek, setNewPersonnelDaysPerWeek] = useState('');
  const [editingBudget, setEditingBudget] = useState(null);
  const [editingPersonnel, setEditingPersonnel] = useState(null);
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  const resetBudgetForm = useCallback(() => {
    setEditingBudget(null);
    setNewBudgetName('');
    setNewBudgetTotalHours('');
    setNewBudgetLaborBreakdown([{ type: '', hours: '' }]);
    setNewBudgetStartDate('');
    setNewBudgetEndDate('');
    setNewBudgetStatus('Accepted');
    setNewBudgetCategory('');
    setAssignedPersonnelIds([]);
  }, []);

  const resetPersonnelForm = useCallback(() => {
    setEditingPersonnel(null);
    setNewPersonnelName('');
    setNewPersonnelLaborType('');
    setNewPersonnelHoursPerDay('');
    setNewPersonnelDaysPerWeek('');
  }, []);

  useEffect(() => {
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
            showMessageWithTimeout(`Error al iniciar sesión: ${error.message}`);
          }
        }
        setIsAuthReady(true);
      });
      return () => unsubscribe();
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      showMessageWithTimeout(`Error al inicializar Firebase: ${error.message}`);
    }
  }, []);

  const showMessageWithTimeout = (msg, duration = 3000) => {
    setMessage(msg);
    setShowMessage(true);
    setTimeout(() => {
      setShowMessage(false);
      setMessage('');
    }, duration);
  };

  useEffect(() => {
    if (db && userId && isAuthReady) {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const budgetsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/budgets`);
      const unsubscribeBudgets = onSnapshot(budgetsCollectionRef, (snapshot) => {
        const budgetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBudgets(budgetsData);
      }, (error) => {
        console.error("Error fetching budgets:", error);
        showMessageWithTimeout(`Error al cargar presupuestos: ${error.message}`);
      });
      const personnelCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/personnel`);
      const unsubscribePersonnel = onSnapshot(personnelCollectionRef, (snapshot) => {
        const personnelData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPersonnel(personnelData);
      }, (error) => {
        console.error("Error fetching personnel:", error);
        showMessageWithTimeout(`Error al cargar personal: ${error.message}`);
      });
      return () => {
        unsubscribeBudgets();
        unsubscribePersonnel();
      };
    }
  }, [db, userId, isAuthReady]);

  const handleAddLaborType = useCallback(() => {
    setNewBudgetLaborBreakdown([...newBudgetLaborBreakdown, { type: '', hours: '' }]);
  }, [newBudgetLaborBreakdown]);

  const handleLaborBreakdownChange = useCallback((index, field, value) => {
    const updatedBreakdown = newBudgetLaborBreakdown.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setNewBudgetLaborBreakdown(updatedBreakdown);
  }, [newBudgetLaborBreakdown]);

  const handleRemoveLaborType = useCallback((index) => {
    const updatedBreakdown = newBudgetLaborBreakdown.filter((_, i) => i !== index);
    setNewBudgetLaborBreakdown(updatedBreakdown);
  }, [newBudgetLaborBreakdown]);

  const handleAddOrUpdateBudget = useCallback(async () => {
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
      userId: userId,
    };
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      if (editingBudget) {
        await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/budgets`, editingBudget.id), budgetData);
        showMessageWithTimeout("Presupuesto actualizado con éxito.");
      } else {
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/budgets`), budgetData);
        showMessageWithTimeout("Presupuesto añadido con éxito.");
      }
      resetBudgetForm();
    } catch (e) {
      console.error("Error adding/updating budget: ", e);
      showMessageWithTimeout(`Error al guardar presupuesto: ${e.message}`);
    }
  }, [db, userId, newBudgetName, newBudgetTotalHours, newBudgetLaborBreakdown, assignedPersonnelIds, newBudgetStartDate, newBudgetEndDate, newBudgetStatus, newBudgetCategory, editingBudget, showMessageWithTimeout, resetBudgetForm]);

  const handleEditBudget = useCallback((budget) => {
    setEditingBudget(budget);
    setNewBudgetName(budget.name);
    setNewBudgetTotalHours(budget.totalHours);
    setNewBudgetLaborBreakdown(budget.laborBreakdown);
    setNewBudgetStartDate(budget.startDate);
    setNewBudgetEndDate(budget.endDate);
    setNewBudgetStatus(budget.status);
    setNewBudgetCategory(budget.category || '');
    setAssignedPersonnelIds(budget.assignedPersonnel || []);
  }, []);

  const handleUseBudgetAsTemplate = useCallback((budget) => {
    setEditingBudget(null);
    setNewBudgetName(`${budget.name} (copia)`);
    setNewBudgetTotalHours(budget.totalHours);
    setNewBudgetLaborBreakdown(budget.laborBreakdown);
    setNewBudgetStatus(budget.status);
    setNewBudgetCategory(budget.category || '');
    setAssignedPersonnelIds(budget.assignedPersonnel || []);
    const originalStart = new Date(budget.startDate);
    const originalEnd = new Date(budget.endDate);
    const durationInDays = Math.ceil((originalEnd - originalStart) / (1000 * 60 * 60 * 24));
    const today = new Date();
    const newStart = today.toISOString().split("T")[0];
    const newEndDate = new Date(today);
    newEndDate.setDate(today.getDate() + durationInDays);
    const newEnd = newEndDate.toISOString().split("T")[0];
    setNewBudgetStartDate(newStart);
    setNewBudgetEndDate(newEnd);
  }, []);

  const handleDeleteBudget = useCallback(async (id) => {
    if (!db || !userId) {
      showMessageWithTimeout("Firebase no está inicializado o el usuario no está autenticado.");
      return;
    }
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/budgets`, id));
      showMessageWithTimeout("Presupuesto eliminado con éxito.");
    } catch (e) {
      console.error("Error deleting budget: ", e);
      showMessageWithTimeout(`Error al eliminar presupuesto: ${e.message}`);
    }
  }, [db, userId, showMessageWithTimeout]);

  const handleAddOrUpdatePersonnel = useCallback(async () => {
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
      userId: userId,
    };
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      if (editingPersonnel) {
        await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/personnel`, editingPersonnel.id), personnelData);
        showMessageWithTimeout("Personal actualizado con éxito.");
      } else {
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/personnel`), personnelData);
        showMessageWithTimeout("Personal añadido con éxito.");
      }
      resetPersonnelForm();
    } catch (e) {
      console.error("Error adding/updating personnel: ", e);
      showMessageWithTimeout(`Error al guardar personal: ${e.message}`);
    }
  }, [db, userId, newPersonnelName, newPersonnelLaborType, newPersonnelHoursPerDay, newPersonnelDaysPerWeek, editingPersonnel, showMessageWithTimeout, resetPersonnelForm]);

  const handleEditPersonnel = useCallback((person) => {
    setEditingPersonnel(person);
    setNewPersonnelName(person.name);
    setNewPersonnelLaborType(person.laborType);
    setNewPersonnelHoursPerDay(person.hoursPerDay);
    setNewPersonnelDaysPerWeek(person.daysPerWeek);
  }, []);

  const handleDeletePersonnel = useCallback(async (id) => {
    if (!db || !userId) {
      showMessageWithTimeout("Firebase no está inicializado o el usuario no está autenticado.");
      return;
    }
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/personnel`, id));
      showMessageWithTimeout("Personal eliminado con éxito.");
    } catch (e) {
      console.error("Error deleting personnel: ", e);
      showMessageWithTimeout(`Error al eliminar personal: ${e.message}`);
    }
  }, [db, userId, showMessageWithTimeout]);

  const calculateWorkloadPerPerson = useCallback(() => {
    const workload = {};
    personnel.forEach((person) => {
      const availableHours = monthlyCapacityForPerson(person.hoursPerDay, person.daysPerWeek);
      workload[person.id] = {
        id: person.id,
        name: person.name,
        laborType: person.laborType,
        assignedHours: 0,
        availableHours: availableHours,
      };
    });
    budgets.forEach((budget) => {
      if (!budget.assignedPersonnel || !(budget.laborBreakdown && budget.startDate && budget.endDate)) return;
      budget.assignedPersonnel.forEach((personId) => {
        if (!workload[personId]) return;
        const personRole = workload[personId].laborType;
        const lb = (budget.laborBreakdown || []).find(x => x.type === personRole);
        if (!lb) return;
        const months = monthsBetween(budget.startDate, budget.endDate);
        const hoursPerMonth = months.length > 0 ? Number(lb.hours || 0) / months.length : 0;
        workload[personId].assignedHours += hoursPerMonth;
      });
    });
    return Object.values(workload).map(w => ({
      ...w,
      assignedHours: Math.round(w.assignedHours),
      availableHours: Math.round(w.availableHours),
    }));
  }, [budgets, personnel]);

  const monthlyOccupationData = useMemo(() => {
    return personnel.map(person => {
      const perMonth = {};
      budgets
        .filter(b => (b.assignedPersonnel || []).includes(person.id))
        .forEach(b => {
          const lb = (b.laborBreakdown || []).find(x => x.type === person.laborType);
          if (!lb) return;
          const dist = distributeHoursPerMonth(b.startDate, b.endDate, Number(lb.hours) || 0);
          Object.entries(dist).forEach(([month, hrs]) => {
            perMonth[month] = (perMonth[month] || 0) + hrs;
          });
        });
      if (Object.keys(perMonth).length === 0) return null;
      return { name: person.name, ...perMonth };
    }).filter(Boolean);
  }, [personnel, budgets]);

  const allMonthKeys = useMemo(() => {
    const s = new Set();
    monthlyOccupationData.forEach(row => {
      Object.keys(row).forEach(k => {
        if (k !== 'name') s.add(k);
      });
    });
    return Array.from(s).sort();
  }, [monthlyOccupationData]);

  const personnelAssignments = useMemo(() => {
    return personnel.map(person => {
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
  }, [personnel, budgets]);

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

  const exportBudgetsToCSV = useCallback(() => {
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
  }, [budgets, personnel, showMessageWithTimeout]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-inter text-gray-800">
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
        {userId && (
          <div className="bg-white p-4 rounded-lg shadow-md mb-6 text-center text-sm text-gray-600 border border-blue-200">
            Tu ID de Usuario (para datos privados): <span className="font-mono text-blue-700 break-all">{userId}</span>
          </div>
        )}

        {/* MENÚ DE NAVEGACIÓN */}
        <nav className="flex justify-center mb-8 gap-4">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-6 py-3 rounded-full text-lg font-semibold transition-colors duration-300 ${
                isActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`
            }
          >
            Panel de Presupuestos
          </NavLink>
          <NavLink
            to="/personal"
            className={({ isActive }) =>
              `px-6 py-3 rounded-full text-lg font-semibold transition-colors duration-300 ${
                isActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`
            }
          >
            Gestión de Personal
          </NavLink>
        </nav>

        {/* CONTENIDO CONDICIONAL BASADO EN LA RUTA */}
        <Routes>
          <Route path="/" element={
            <BudgetDashboard
              budgets={budgets}
              personnel={personnel}
              newBudgetName={newBudgetName}
              setNewBudgetName={setNewBudgetName}
              newBudgetTotalHours={newBudgetTotalHours}
              setNewBudgetTotalHours={setNewBudgetTotalHours}
              newBudgetLaborBreakdown={newBudgetLaborBreakdown}
              setNewBudgetLaborBreakdown={setNewBudgetLaborBreakdown}
              newBudgetStartDate={newBudgetStartDate}
              setNewBudgetStartDate={setNewBudgetStartDate}
              newBudgetEndDate={newBudgetEndDate}
              setNewBudgetEndDate={setNewBudgetEndDate}
              newBudgetStatus={newBudgetStatus}
              setNewBudgetStatus={setNewBudgetStatus}
              newBudgetCategory={newBudgetCategory}
              setNewBudgetCategory={setNewBudgetCategory}
              assignedPersonnelIds={assignedPersonnelIds}
              setAssignedPersonnelIds={setAssignedPersonnelIds}
              editingBudget={editingBudget}
              handleAddOrUpdateBudget={handleAddOrUpdateBudget}
              handleEditBudget={handleEditBudget}
              handleUseBudgetAsTemplate={handleUseBudgetAsTemplate}
              handleDeleteBudget={handleDeleteBudget}
              handleAddLaborType={handleAddLaborType}
              handleLaborBreakdownChange={handleLaborBreakdownChange}
              handleRemoveLaborType={handleRemoveLaborType}
              calculateWorkloadPerPerson={calculateWorkloadPerPerson}
              monthlyOccupationData={monthlyOccupationData}
              allMonthKeys={allMonthKeys}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              exportBudgetsToCSV={exportBudgetsToCSV}
              computeProjectedFinishDate={computeProjectedFinishDate}
              projectedFromForm={projectedFromForm}
              personnelAssignments={personnelAssignments}
            />
          } />
          <Route path="/personal" element={
            <PersonnelManager
              personnel={personnel}
              newPersonnelName={newPersonnelName}
              setNewPersonnelName={setNewPersonnelName}
              newPersonnelLaborType={newPersonnelLaborType}
              setNewPersonnelLaborType={setNewPersonnelLaborType}
              newPersonnelHoursPerDay={newPersonnelHoursPerDay}
              setNewPersonnelHoursPerDay={setNewPersonnelHoursPerDay}
              newPersonnelDaysPerWeek={newPersonnelDaysPerWeek}
              setNewPersonnelDaysPerWeek={setNewPersonnelDaysPerWeek}
              editingPersonnel={editingPersonnel}
              handleAddOrUpdatePersonnel={handleAddOrUpdatePersonnel}
              handleEditPersonnel={handleEditPersonnel}
              handleDeletePersonnel={handleDeletePersonnel}
              personnelAssignments={personnelAssignments}
            />
          } />
        </Routes>

      </div>
    </BrowserRouter>
  );
}

export default App;
