import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// HOOKS PERSONALIZADOS
import { useBudgets, usePersonnel } from './hooks';

// FUNCIONES AUXILIARES
import { distributeHoursPerMonth, monthsBetween, calcularSemanasOcupacion, monthlyCapacityForPerson, computeProjectedFinishDate } from './utils';

/**
 * Componente BudgetDashboard refactorizado
 * 
 * ¿Qué conseguimos?
 * - Sin props masivas (de 40+ props a 0)
 * - Usa hooks internamente
 * - Más fácil de mantener y testear
 * - Lógica encapsulada
 */
function BudgetDashboard() {
  // Hooks personalizados que encapsulan toda la lógica
  const budgetHook = useBudgets();
  const personnelHook = usePersonnel();

  // Extraer datos y funciones de los hooks
  const {
    budgets,
    acceptedBudgets,
    budgetForm,
    acceptedBudgetForm,
    selectedCategory,
    updateBudgetForm,
    updateAcceptedBudgetForm,
    resetAcceptedBudgetForm,
    editBudget,
    useBudgetAsTemplate,
    saveBudget,
    saveAcceptedBudget,
    deleteBudget,
    editAcceptedBudget,
    moveAcceptedToPlanning,
    deleteAcceptedBudget,
    moveBudgetToAcceptedBag,
    addLaborType,
    updateLaborBreakdown,
    removeLaborType,
    setSelectedCategory,
    totalHoursByType,
    exportToCSV
  } = budgetHook;

  const { personnel } = personnelHook;

  const [acceptedBudgetSearch, setAcceptedBudgetSearch] = useState('');

  const filteredAcceptedBudgets = useMemo(() => {
    const query = acceptedBudgetSearch.trim().toLowerCase();
    if (!query) return acceptedBudgets;
    return acceptedBudgets.filter((item) => (item.budgetNumber || '').toLowerCase().includes(query));
  }, [acceptedBudgets, acceptedBudgetSearch]);

  // Cálculos memoizados para optimizar rendimiento
  const filteredBudgets = useMemo(() => {
    return selectedCategory === 'Todas'
      ? budgets
      : budgets.filter(b => b.category === selectedCategory);
  }, [budgets, selectedCategory]);

  const workloadSummary = useMemo(() => {
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

  const projectedFromForm = useMemo(() => {
    if (!budgetForm.startDate) return null;
    const cleanedBreakdown = budgetForm.laborBreakdown.filter(i => i.type && i.hours);
    const tempBudget = {
      startDate: budgetForm.startDate,
      laborBreakdown: cleanedBreakdown,
      assignedPersonnel: budgetForm.assignedPersonnel
    };
    return computeProjectedFinishDate(tempBudget, personnel);
  }, [budgetForm, personnel]);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Columna Izquierda: Gestión y Lista de Presupuestos */}
      <div className="flex-1 space-y-8">
        <div className="bg-gray-100 p-6 rounded-xl shadow-lg border border-gray-300">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-3 border-gray-400">
            Bolsa de Presupuestos Aceptados
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Alta rápida sin planificación completa. Luego puedes pasarlos a la mesa de planificación.
          </p>
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="acceptedBudgetName" className="block text-sm font-medium text-gray-700">Nombre</label>
              <input
                type="text"
                id="acceptedBudgetName"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={acceptedBudgetForm.name}
                onChange={(e) => updateAcceptedBudgetForm('name', e.target.value)}
                placeholder="Ej. Reforma Nave Industrial"
              />
            </div>
            <div>
              <label htmlFor="acceptedBudgetNumber" className="block text-sm font-medium text-gray-700">Numero de presupuesto</label>
              <input
                type="text"
                id="acceptedBudgetNumber"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={acceptedBudgetForm.budgetNumber}
                onChange={(e) => updateAcceptedBudgetForm('budgetNumber', e.target.value)}
                placeholder="Ej. P-2026-014"
              />
            </div>
            <div>
              <label htmlFor="acceptedBudgetDate" className="block text-sm font-medium text-gray-700">Fecha de aceptacion</label>
              <input
                type="date"
                id="acceptedBudgetDate"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={acceptedBudgetForm.acceptanceDate}
                onChange={(e) => updateAcceptedBudgetForm('acceptanceDate', e.target.value)}
              />
            </div>
            <button
              onClick={saveAcceptedBudget}
              className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 transition duration-300 ease-in-out shadow-md"
            >
              {acceptedBudgetForm.id ? 'Actualizar presupuesto en bolsa' : 'Guardar en bolsa de aceptados'}
            </button>
            {acceptedBudgetForm.id && (
              <button
                onClick={resetAcceptedBudgetForm}
                className="w-full bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 transition duration-300 ease-in-out shadow-md"
              >
                Cancelar edición
              </button>
            )}
          </div>
          <div className="mb-4">
            <label htmlFor="acceptedBudgetSearch" className="block text-sm font-medium text-gray-700">
              Buscar por número de presupuesto
            </label>
            <input
              id="acceptedBudgetSearch"
              type="text"
              value={acceptedBudgetSearch}
              onChange={(e) => setAcceptedBudgetSearch(e.target.value)}
              placeholder="Ej. 2026-001"
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {filteredAcceptedBudgets.length === 0 ? (
            <p className="text-gray-500">
              {acceptedBudgets.length === 0 ? 'No hay presupuestos en la bolsa.' : 'No hay coincidencias con esa búsqueda.'}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredAcceptedBudgets.map((accepted) => (
                <div key={accepted.id} className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                  <p className="text-base font-semibold text-emerald-800">{accepted.name || 'Sin nombre'}</p>
                  <p className="text-sm text-gray-700">Numero: {accepted.budgetNumber || '-'}</p>
                  <p className="text-sm text-gray-700">Aceptacion: {accepted.acceptanceDate || '-'}</p>
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => editAcceptedBudget(accepted)}
                      className="flex-1 bg-yellow-500 text-white py-1 px-3 rounded-md hover:bg-yellow-600 transition duration-300 ease-in-out text-sm shadow-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => moveAcceptedToPlanning(accepted.id)}
                      className="flex-1 bg-indigo-600 text-white py-1 px-3 rounded-md hover:bg-indigo-700 transition duration-300 ease-in-out text-sm shadow-sm"
                    >
                      Pasar a mesa de planificacion
                    </button>
                    <button
                      onClick={() => deleteAcceptedBudget(accepted.id)}
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

        <div className="bg-gray-100 p-6 rounded-xl shadow-lg border border-gray-300">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3 border-gray-400">
            Mesa de Planificacion
          </h2>
          {/* FORMULARIO DE PRESUPUESTOS */}
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="budgetName" className="block text-sm font-medium text-gray-700">Nombre del Presupuesto</label>
              <input
                type="text"
                id="budgetName"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={budgetForm.name}
                onChange={(e) => updateBudgetForm('name', e.target.value)}
                placeholder="Ej. Proyecto Alpha"
              />
            </div>
            <div>
              <label htmlFor="budgetTotalHours" className="block text-sm font-medium text-gray-700">Horas Totales Estimadas</label>
              <input
                type="number"
                id="budgetTotalHours"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={budgetForm.totalHours}
                onChange={(e) => updateBudgetForm('totalHours', e.target.value)}
                placeholder="Ej. 500"
              />
            </div>
            <div>
              <label htmlFor="assignedPersonnel" className="block text-sm font-medium text-gray-700">Asignar Personal</label>
                <select
                  multiple
                  id="assignedPersonnel"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  value={budgetForm.assignedPersonnel}
                  onChange={(e) => {
                    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                    updateBudgetForm('assignedPersonnel', selectedOptions);
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
            {budgetForm.laborBreakdown.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-2 items-end">
                <div className="flex-1 w-full">
                  <label htmlFor={`laborType-${index}`} className="block text-sm font-medium text-gray-700">Tipo</label>
                  <input
                    type="text"
                    id={`laborType-${index}`}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={item.type}
                    onChange={(e) => updateLaborBreakdown(index, 'type', e.target.value)}
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
                    onChange={(e) => updateLaborBreakdown(index, 'hours', e.target.value)}
                    placeholder="Ej. 200"
                  />
                </div>
                {budgetForm.laborBreakdown.length > 1 && (
                  <button
                    onClick={() => removeLaborType(index)}
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
              onClick={addLaborType}
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
                value={budgetForm.startDate}
                onChange={(e) => updateBudgetForm('startDate', e.target.value)}
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
                value={budgetForm.endDate}
                onChange={(e) => updateBudgetForm('endDate', e.target.value)}
              />
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
                value={budgetForm.status}
                onChange={(e) => updateBudgetForm('status', e.target.value)}
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
                value={budgetForm.category}
                onChange={(e) => updateBudgetForm('category', e.target.value)}
              >
                <option value="">Seleccione una categoría</option>
                <option value="Obra">Obra</option>
                <option value="Mantenimiento">Mantenimiento</option>
              </select>
            </div>
            <button
              onClick={saveBudget}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 ease-in-out shadow-md flex items-center justify-center gap-2"
            >
              {budgetForm.id ? (
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
        </div>

        {/* Carga de Trabajo por Personal (MOVIDO) */}
        <div className="bg-gray-100 p-6 rounded-xl shadow-lg border border-gray-300">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3 border-gray-400">
            📋 Carga de Trabajo por Persona
          </h2>
          {workloadSummary.length === 0 ? (
            <p className="text-gray-500">No hay datos suficientes para calcular la carga.</p>
          ) : (
            <div className="space-y-4">
              {workloadSummary.map((person, index) => {
                const assigned = Number(person.assignedHours) || 0;
                const available = Number(person.availableHours) || 0;
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
                    {/* Ocupación detallada por semana */}
                    <div className="mt-4 text-sm text-gray-800">
                        <span className="font-semibold">Asignaciones detalladas:</span>
                        <ul className="list-disc list-inside mt-1 space-y-2">
                            {(() => {
                                // Encuentra a la persona actual en el array de personal completo
                                const persona = personnel.find(p => p.id === person.id);
                                if (!persona) return null;

                                // Recorre los presupuestos asignados a esta persona
                                return budgets
                                    .filter(b => (b.assignedPersonnel || []).includes(persona.id))
                                    .flatMap(b => {
                                        const lb = (b.laborBreakdown || []).find(x => x.type === persona.laborType);
                                        if (!lb) return [];

                                        // Calcula la ocupación semanal para este presupuesto
                                        const semanasOcupacion = calcularSemanasOcupacion(b.startDate, Number(lb.hours) || 0, (persona.hoursPerDay || 0) * (persona.daysPerWeek || 0));

                                        return semanasOcupacion.map((sem, idx) => {
                                            const capacidadSemanal = (persona.hoursPerDay || 0) * (persona.daysPerWeek || 0);
                                            const ocupacionPct = capacidadSemanal > 0 ? (sem.horas / capacidadSemanal) * 100 : 0;

                                            return (
                                                <li key={`${b.id}-${idx}`} className="bg-gray-100 p-2 rounded-md border border-gray-200">
                                                    <strong>{b.name}</strong> - semana del {sem.semanaInicio}: {Math.round(sem.horas)}h ({Math.round(ocupacionPct)}% ocupado)
                                                </li>
                                            );
                                        });
                                    });
                            })()}
                        </ul>
                    </div>
                    {/* Sección original de meses ocupados, si la quieres mantener */}
                    <div className="mt-3 text-sm text-gray-800">
                        <span className="font-semibold">Meses ocupados:</span>
                        <ul className="list-disc list-inside mt-1">
                            {(() => {
                                const persona = personnel.find(p => p.id === person.id);
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

        {/* NUEVO: Resumen de Horas Totales por Tipo */}
        <div className="bg-gray-100 p-6 rounded-xl shadow-lg border border-gray-300">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3 border-gray-400">
                📊 Resumen de Horas por Tipo
            </h2>
            {totalHoursByType.length === 0 ? (
                <p className="text-gray-500">No hay datos de desglose de mano de obra.</p>
            ) : (
                <div className="space-y-4">
                    {totalHoursByType.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                            <span className="text-lg font-semibold text-gray-700">{item.type}</span>
                            <span className="text-xl font-bold text-indigo-600">{Math.round(item.hours)}h</span>
                        </div>
                    ))}
                </div>
            )}
        </div>

      </div>
      {/* Columna Derecha: Lista de Presupuestos y Gráfico de Ocupación */}
      <div className="flex-1 space-y-8">
        <div className="bg-gray-100 p-6 rounded-xl shadow-lg border border-gray-300">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2 border-gray-400">
            Lista de Presupuestos en Planificacion
          </h2>
          <button
            onClick={() => exportToCSV(personnel)}
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
                  <p className="text-sm text-gray-600">Numero: {budget.budgetNumber || '-'}</p>
                  <p className="text-sm text-gray-600">Fecha de aceptacion: {budget.acceptanceDate || '-'}</p>
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
                      onClick={() => editBudget(budget)}
                      className="flex-1 bg-yellow-500 text-white py-1 px-3 rounded-md hover:bg-yellow-600 transition duration-300 ease-in-out text-sm shadow-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        const ok = window.confirm('Devolverá el presupuesto a la bolsa conservando horas/desglose (se perderán fechas) y lo eliminará de la mesa de planificación. ¿Continuar?');
                        if (ok) moveBudgetToAcceptedBag(budget.id);
                      }}
                      className="flex-1 bg-emerald-600 text-white py-1 px-3 rounded-md hover:bg-emerald-700 transition duration-300 ease-in-out text-sm shadow-sm"
                    >
                      Devolver a bolsa
                    </button>
                    <button
                      onClick={() => deleteBudget(budget.id)}
                      className="flex-1 bg-red-500 text-white py-1 px-3 rounded-md hover:bg-red-600 transition duration-300 ease-in-out text-sm shadow-sm"
                    >
                      Eliminar
                    </button>
                    <button
                      onClick={() => useBudgetAsTemplate(budget)}
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
        
        {/* Gráfico de Ocupación Mensual (MOVIDO) */}
        <div className="bg-gray-100 p-6 rounded-xl shadow-lg border border-gray-300">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3 border-gray-400">
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
    </div>
  );
}

export default BudgetDashboard;
