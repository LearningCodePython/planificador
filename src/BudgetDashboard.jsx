import React from 'react';
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer} from 'recharts';

// IMPORTACIÓN DE LAS FUNCIONES AUXILIARES
import { distributeHoursPerMonth, monthsBetween } from './utils';

function BudgetDashboard({
  budgets,
  personnel,
  newBudgetName,
  setNewBudgetName,
  newBudgetTotalHours,
  setNewBudgetTotalHours,
  newBudgetLaborBreakdown,
  setNewBudgetLaborBreakdown,
  newBudgetStartDate,
  setNewBudgetStartDate,
  newBudgetEndDate,
  setNewBudgetEndDate,
  newBudgetStatus,
  setNewBudgetStatus,
  newBudgetCategory,
  setNewBudgetCategory,
  assignedPersonnelIds,
  setAssignedPersonnelIds,
  editingBudget,
  handleAddOrUpdateBudget,
  handleEditBudget,
  handleUseBudgetAsTemplate,
  handleDeleteBudget,
  handleAddLaborType,
  handleLaborBreakdownChange,
  handleRemoveLaborType,
  calculateWorkloadPerPerson,
  monthlyOccupationData,
  allMonthKeys,
  selectedCategory,
  setSelectedCategory,
  exportBudgetsToCSV,
  computeProjectedFinishDate,
  projectedFromForm,
}) {

  const filteredBudgets = selectedCategory === 'Todas'
  ? budgets
  : budgets.filter(b => b.category === selectedCategory);
  const workloadSummary = calculateWorkloadPerPerson();

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Panel de Presupuestos */}
      <div className="flex-1 bg-white p-6 rounded-xl shadow-lg border border-blue-200">
        <h2 className="text-2xl font-bold text-indigo-700 mb-6 border-b pb-3 border-indigo-200">
          📝 Gestión de Presupuestos
        </h2>
        {/* FORMULARIO DE PRESUPUESTOS */}
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
        {/* LISTA DE PRESUPUESTOS */}
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

      {/* Gráficos y Resumen de Carga */}
      <div className="flex-1 space-y-8">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-green-200">
          <h2 className="text-2xl font-bold text-green-700 mb-6 border-b pb-3 border-green-200">
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
        <div className="bg-white p-6 rounded-xl shadow-lg border border-purple-200">
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
    </div>
  );
}

export default BudgetDashboard;