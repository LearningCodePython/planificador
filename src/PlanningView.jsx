import React, { useMemo, useState } from 'react';

import { useBudgets, usePersonnel } from './hooks';
import { computeProjectedFinishDate } from './utils';
import CollapsibleCard from './components/CollapsibleCard';

function PlanningView() {
  const budgetHook = useBudgets();
  const personnelHook = usePersonnel();

  const {
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
    editBudget,
    useBudgetAsTemplate,
    saveBudget,
    saveAcceptedBudget,
    deleteBudget,
    editAcceptedBudget,
    moveAcceptedToPlanning,
    deleteAcceptedBudget,
    moveBudgetToAcceptedBag,
    moveBudgetToExecuted,
    addLaborType,
    updateLaborBreakdown,
    removeLaborType,
    setSelectedCategory,
    exportToCSV,
  } = budgetHook;

  const { personnel } = personnelHook;

  const [acceptedBudgetSearch, setAcceptedBudgetSearch] = useState('');

  const filteredAcceptedBudgets = useMemo(() => {
    const query = acceptedBudgetSearch.trim().toLowerCase();
    if (!query) return acceptedBudgets;
    return acceptedBudgets.filter((item) => {
      const budgetNumber = (item.budgetNumber || '').toLowerCase();
      const client = (item.client || '').toLowerCase();
      return budgetNumber.includes(query) || client.includes(query);
    });
  }, [acceptedBudgets, acceptedBudgetSearch]);

  const filteredBudgets = useMemo(() => {
    return selectedCategory === 'Todas'
      ? budgets
      : budgets.filter((b) => b.category === selectedCategory);
  }, [budgets, selectedCategory]);

  const projectedFromForm = useMemo(() => {
    if (!budgetForm.startDate) return null;
    const cleanedBreakdown = budgetForm.laborBreakdown.filter((i) => i.type && i.hours);
    const tempBudget = {
      startDate: budgetForm.startDate,
      laborBreakdown: cleanedBreakdown,
      assignedPersonnel: budgetForm.assignedPersonnel,
    };
    return computeProjectedFinishDate(tempBudget, personnel);
  }, [budgetForm, personnel]);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="flex-1 space-y-8">
        <CollapsibleCard storageKey="accepted_bag" title="Bolsa de Presupuestos Aceptados">
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
              <label htmlFor="acceptedBudgetClient" className="block text-sm font-medium text-gray-700">Cliente</label>
              <input
                type="text"
                id="acceptedBudgetClient"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={acceptedBudgetForm.client || ''}
                onChange={(e) => updateAcceptedBudgetForm('client', e.target.value)}
                placeholder="Ej. ACME S.L."
              />
            </div>
            <div>
              <label htmlFor="acceptedBudgetTicket" className="block text-sm font-medium text-gray-700">#Ticket</label>
              <input
                type="text"
                id="acceptedBudgetTicket"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={acceptedBudgetForm.ticketRef || ''}
                onChange={(e) => updateAcceptedBudgetForm('ticketRef', e.target.value)}
                placeholder="Ej. TCK-12345"
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
            <div>
              <label htmlFor="acceptedBudgetPdf" className="block text-sm font-medium text-gray-700">PDF del presupuesto (opcional)</label>
              <input
                type="file"
                id="acceptedBudgetPdf"
                accept="application/pdf,.pdf"
                className="mt-1 block w-full text-sm"
                onChange={(e) => setAcceptedBudgetPdfFile(e.target.files?.[0] || null)}
              />
              {acceptedBudgetPdfFile ? (
                <div className="mt-1 text-xs text-gray-600">Seleccionado: {acceptedBudgetPdfFile.name}</div>
              ) : acceptedBudgetForm.id && acceptedBudgetForm.pdfFilename ? (
                <a
                  className="mt-1 inline-block text-xs text-blue-700 underline"
                  href={`/api/accepted-budgets/${acceptedBudgetForm.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver PDF actual: {acceptedBudgetForm.pdfOriginalName || 'presupuesto.pdf'}
                </a>
              ) : null}
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
              Buscar por número o cliente
            </label>
            <input
              id="acceptedBudgetSearch"
              type="text"
              value={acceptedBudgetSearch}
              onChange={(e) => setAcceptedBudgetSearch(e.target.value)}
              placeholder="Ej. 2026-001 o ACME"
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
                  <p className="text-sm text-gray-700">Cliente: {accepted.client || '-'}</p>
                  <p className="text-sm text-gray-700">Aceptacion: {accepted.acceptanceDate || '-'}</p>
                  {accepted.ticketRef ? (
                    <p className="text-sm text-gray-700">#Ticket: {accepted.ticketRef}</p>
                  ) : null}
                  {accepted.pdfFilename ? (
                    <a
                      className="text-sm text-blue-700 underline"
                      href={`/api/accepted-budgets/${accepted.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      PDF: {accepted.pdfOriginalName || 'presupuesto.pdf'}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-700">PDF: -</p>
                  )}
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
        </CollapsibleCard>

        <CollapsibleCard storageKey="planning_form" title="Mesa de Planificacion" headerClassName="mb-6 border-b pb-3 border-gray-400">
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
              <label htmlFor="budgetTicketRef" className="block text-sm font-medium text-gray-700">#Ticket</label>
              <input
                type="text"
                id="budgetTicketRef"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={budgetForm.ticketRef || ''}
                onChange={(e) => updateBudgetForm('ticketRef', e.target.value)}
                placeholder="Ej. TCK-12345"
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
                  const selectedOptions = Array.from(e.target.selectedOptions, (option) => option.value);
                  updateBudgetForm('assignedPersonnel', selectedOptions);
                }}
              >
                {personnel.map((person) => (
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
        </CollapsibleCard>
      </div>

      <div className="flex-1 space-y-8">
        <CollapsibleCard
          storageKey="planning_list"
          title="Lista de Presupuestos en Planificacion"
          titleClassName="text-xl font-bold text-gray-800"
          headerClassName="mb-4 border-b pb-2 border-gray-400"
        >
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
              {[...new Set(budgets.map((b) => b.category).filter(Boolean))].map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          {filteredBudgets.length === 0 ? (
            <p className="text-gray-500">No hay presupuestos añadidos aún.</p>
          ) : (
            <div className="space-y-4">
              {filteredBudgets.map((budget) => {
                const assignedPeople = personnel.filter((p) => (budget.assignedPersonnel || []).includes(p.id));
                return (
                  <div key={budget.id} className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-100">
                    <p className="text-lg font-semibold text-blue-800">{budget.name} ({budget.status})</p>
                    <p className="text-sm text-gray-600">Numero: {budget.budgetNumber || '-'}</p>
                    <p className="text-sm text-gray-600">Fecha de aceptacion: {budget.acceptanceDate || '-'}</p>
                    {budget.ticketRef ? (
                      <p className="text-sm text-gray-600">#Ticket: {budget.ticketRef}</p>
                    ) : null}
                    {budget.pdfFilename ? (
                      <a
                        className="text-sm text-blue-700 underline"
                        href={`/api/budgets/${budget.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        PDF: {budget.pdfOriginalName || 'presupuesto.pdf'}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-600">PDF: -</p>
                    )}
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
                      <button
                        onClick={() => {
                          const ok = window.confirm('Moverá el presupuesto a "Ejecutados" conservando horas, personal y fechas, y lo eliminará de la mesa de planificación. ¿Continuar?');
                          if (ok) moveBudgetToExecuted(budget.id);
                        }}
                        disabled={budget.status !== 'Completed'}
                        className={`flex-1 py-1 px-3 rounded-md transition duration-300 ease-in-out text-sm shadow-sm ${
                          budget.status === 'Completed'
                            ? 'bg-gray-800 text-white hover:bg-gray-900'
                            : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        Pasar a ejecutados
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleCard>
      </div>
    </div>
  );
}

export default PlanningView;

