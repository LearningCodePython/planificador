import React, { useMemo } from 'react';
import { useBudgets, usePersonnel } from './hooks';

/**
 * Componente PersonnelManager refactorizado
 * 
 * ¿Qué conseguimos?
 * - Sin props masivas (de 17 props a 0)
 * - Usa hooks internamente
 * - Más fácil de mantener y testear
 * - Lógica encapsulada
 */
function PersonnelManager() {
  // Hooks personalizados
  const personnelHook = usePersonnel();
  const { budgets } = useBudgets();

  // Extraer datos y funciones del hook
  const {
    personnel,
    personnelForm,
    updatePersonnelForm,
    editPersonnel,
    savePersonnel,
    deletePersonnel
  } = personnelHook;

  // Cálculo de asignaciones de personal (memoizado)
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
  return (
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
            value={personnelForm.name}
            onChange={(e) => updatePersonnelForm('name', e.target.value)}
            placeholder="Ej. Juan Pérez"
          />
        </div>
        <div>
          <label htmlFor="personnelLaborType" className="block text-sm font-medium text-gray-700">Tipo de Mano de Obra / Rol</label>
          <input
            type="text"
            id="personnelLaborType"
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            value={personnelForm.laborType}
            onChange={(e) => updatePersonnelForm('laborType', e.target.value)}
            placeholder="Ej. Diseñador"
          />
        </div>
        <div>
          <label htmlFor="personnelHoursPerDay" className="block text-sm font-medium text-gray-700">Horas Disponibles por Día</label>
          <input
            type="number"
            id="personnelHoursPerDay"
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            value={personnelForm.hoursPerDay}
            onChange={(e) => updatePersonnelForm('hoursPerDay', e.target.value)}
            placeholder="Ej. 8"
          />
        </div>
        <div>
          <label htmlFor="personnelDaysPerWeek" className="block text-sm font-medium text-gray-700">Días Disponibles por Semana</label>
          <input
            type="number"
            id="personnelDaysPerWeek"
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            value={personnelForm.daysPerWeek}
            onChange={(e) => updatePersonnelForm('daysPerWeek', e.target.value)}
            placeholder="Ej. 5"
          />
        </div>
        <button
          onClick={savePersonnel}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-300 ease-in-out shadow-md flex items-center justify-center gap-2"
        >
          {personnelForm.id ? (
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
                  onClick={() => editPersonnel(person)}
                  className="flex-1 bg-yellow-500 text-white py-1 px-3 rounded-md hover:bg-yellow-600 transition duration-300 ease-in-out text-sm shadow-sm"
                >
                  Editar
                </button>
                <button
                  onClick={() => deletePersonnel(person.id)}
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
  );
}

export default PersonnelManager;