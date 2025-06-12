
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import React, { useState, useEffect, useCallback } from 'react';
import './index.css';

// Definir el componente principal de la aplicación
function App() {
  // Variables de estado para Firebase y la autenticación de usuarios
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
    setNewBudgetCategory('')
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

  // Calculate required and available hours for capacity planning
  const calculateCapacity = useCallback(() => {
    const requiredHours = {}; // { 'Engineer': 100, 'Designer': 50 }
    const availableHours = {}; // { 'Engineer': 160, 'Designer': 80 }

    // Calculate required hours from accepted budgets
    budgets.filter(b => b.status === 'Accepted').forEach(budget => {
      budget.laborBreakdown.forEach(item => {
        requiredHours[item.type] = (requiredHours[item.type] || 0) + item.hours;
      });
    });

    // Calculate available hours from personnel
    personnel.forEach(person => {
      const totalWeeklyHours = person.hoursPerDay * person.daysPerWeek;
      availableHours[person.laborType] = (availableHours[person.laborType] || 0) + totalWeeklyHours;
    });

    // Combine all unique labor types
    const allLaborTypes = new Set([
      ...Object.keys(requiredHours),
      ...Object.keys(availableHours)
    ]);

    const capacityData = Array.from(allLaborTypes).map(type => {
      const req = requiredHours[type] || 0;
      const avail = availableHours[type] || 0;
      const deficit = req > avail ? req - avail : 0;
      const surplus = avail > req ? avail - req : 0;
      const utilization = avail > 0 ? (req / avail) * 100 : 0;

      return {
        laborType: type,
        required: req,
        available: avail,
        deficit: deficit,
        surplus: surplus,
        utilization: utilization.toFixed(2) // Percentage
      };
    });

    return capacityData;
  }, [budgets, personnel]);

  const capacitySummary = calculateCapacity();

  // Calcular los presupuestos asignados por persona
  const personnelAssignments = personnel.map(person => {
    const assignedBudgets = budgets
      .filter(budget => (budget.assignedPersonnel || []).includes(person.id))
      .map(budget => ({
        id: budget.id,
        name: budget.name,
        hours: budget.laborBreakdown.reduce((sum, item) => {
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

    personnel.forEach((person) => {
      const availableHours = person.hoursPerDay * person.daysPerWeek;
      workload[person.id] = {
        name: person.name,
        laborType: person.laborType,
        assignedHours: 0,
        availableHours: availableHours,
      };
    });

    budgets.forEach((budget) => {
      if (!budget.assignedPersonnel || !budget.laborBreakdown) return;

      budget.assignedPersonnel.forEach((personId) => {
        const matchingBreakdown = budget.laborBreakdown.find(lb => lb.type === workload[personId]?.laborType);
        if (matchingBreakdown) {
          workload[personId].assignedHours += Number(matchingBreakdown.hours);
        }
      });
    });

    return Object.values(workload);
  }, [budgets, personnel]);

  const workloadSummary = calculateWorkloadPerPerson();

  // Línea para el filtrado de presupuestos
  const filteredBudgets = selectedCategory === 'Todas'
  ? budgets
  : budgets.filter(b => b.category === selectedCategory);

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
              <label htmlFor="budgetEndDate" className="block text-sm font-medium text-gray-700">Fecha de Finalización Deseada</label>
              <input
                type="date"
                id="budgetEndDate"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={newBudgetEndDate}
                onChange={(e) => setNewBudgetEndDate(e.target.value)}
              />
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
                    {budget.laborBreakdown.map((item, idx) => (
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
      </div>

      {/* Capacity Planning Section */}
      <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-blue-200">
        <h2 className="text-2xl font-bold text-indigo-700 mb-6 border-b pb-3 border-indigo-200">
          📈 Planificación de Capacidad (Horas Semanales)
        </h2>
        {capacitySummary.length === 0 ? (
          <p className="text-gray-500">Añada presupuestos y personal para ver la planificación de capacidad.</p>
        ) : (
          <div className="space-y-4">
            {capacitySummary.map((data, index) => (
              <div key={index} className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg shadow-md border border-blue-200">
                <h3 className="text-xl font-semibold text-blue-800">{data.laborType}</h3>
                <p className="text-sm text-gray-700">Horas Requeridas (Presupuestos Aceptados): <span className="font-bold">{data.required}h</span></p>
                <p className="text-sm text-gray-700">Horas Disponibles (Personal Actual): <span className="font-bold">{data.available}h</span></p>
                {data.deficit > 0 ? (
                  <p className="text-red-600 font-bold text-sm">
                    DÉFICIT: Necesitas {data.deficit} horas/semana adicionales.
                  </p>
                ) : (
                  <p className="text-green-600 font-bold text-sm">
                    SOBRANTE: Tienes {data.surplus} horas/semana disponibles.
                  </p>
                )}
                <p className="text-sm text-gray-700">Utilización de Capacidad: <span className="font-bold">{data.utilization}%</span></p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div
                    className={`h-2.5 rounded-full ${data.utilization > 100 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(data.utilization, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-green-200">
        <h2 className="text-2xl font-bold text-green-700 mb-6 border-b pb-3 border-green-200">
          📋 Carga de Trabajo por Persona
        </h2>

        {workloadSummary.length === 0 ? (
          <p className="text-gray-500">No hay datos suficientes para calcular la carga.</p>
        ) : (
          <div className="space-y-4">
            {workloadSummary.map((person, index) => (
              <div key={index} className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg shadow-md border border-green-200">
                <h3 className="text-xl font-semibold text-green-800">{person.name} ({person.laborType})</h3>
                <p className="text-sm text-gray-700">Horas Asignadas: <span className="font-bold">{person.assignedHours}h</span></p>
                <p className="text-sm text-gray-700">Horas Disponibles: <span className="font-bold">{person.availableHours}h</span></p>

                {person.assignedHours > person.availableHours ? (
                  <p className="text-red-600 font-bold text-sm">🔺 Sobrecarga: Excede en {person.assignedHours - person.availableHours}h</p>
                ) : (
                  <p className="text-green-600 font-bold text-sm">✅ OK: Disponible {person.availableHours - person.assignedHours}h</p>
                )}

                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div
                    className={`h-2.5 rounded-full ${person.assignedHours > person.availableHours ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min((person.assignedHours / person.availableHours) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default App;

