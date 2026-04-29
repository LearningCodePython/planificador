import React, { useMemo, useState } from 'react';
import { useBudgets, usePersonnel } from './hooks';

function ExecutedBudgets() {
  const { executedBudgets, deleteExecutedBudget } = useBudgets();
  const { personnel } = usePersonnel();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return executedBudgets;
    return executedBudgets.filter((b) => (b.budgetNumber || '').toLowerCase().includes(query));
  }, [executedBudgets, search]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-gray-100 p-6 rounded-xl shadow-lg border border-gray-300">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-3 border-gray-400">
          Presupuestos Ejecutados
        </h2>

        <div className="mb-4">
          <label htmlFor="executedSearch" className="block text-sm font-medium text-gray-700 mb-1">
            Buscar por número de presupuesto
          </label>
          <input
            id="executedSearch"
            type="text"
            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ej. P-2026-014"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-gray-500">No hay presupuestos ejecutados.</p>
        ) : (
          <div className="space-y-4">
            {filtered.map((budget) => {
              const assignedPeople = personnel.filter((p) => (budget.assignedPersonnel || []).includes(p.id));
              return (
                <div key={budget.id} className="bg-emerald-50 p-4 rounded-lg shadow-sm border border-emerald-100">
                  <p className="text-lg font-semibold text-emerald-800">{budget.name}</p>
                  <p className="text-sm text-gray-600">Numero: {budget.budgetNumber || '-'}</p>
                  {budget.ticketRef ? <p className="text-sm text-gray-600">#Ticket: {budget.ticketRef}</p> : null}
                  <p className="text-sm text-gray-600">Fecha de aceptacion: {budget.acceptanceDate || '-'}</p>
                  <p className="text-sm text-gray-600">Horas Totales: {budget.totalHours}</p>
                  <p className="text-sm text-gray-600">Inicio: {budget.startDate} | Fin: {budget.endDate}</p>
                  {budget.executedAt ? <p className="text-xs text-gray-500 mt-1">Ejecutado: {budget.executedAt}</p> : null}

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

                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    {budget.pdfFilename ? (
                      <a
                        className="flex-1 bg-emerald-700 text-white py-1 px-3 rounded-md hover:bg-emerald-800 transition duration-300 ease-in-out text-sm shadow-sm text-center"
                        href={`/api/executed-budgets/${budget.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver PDF
                      </a>
                    ) : null}
                    <button
                      onClick={() => {
                        const ok = window.confirm('Eliminará el presupuesto de "Ejecutados". ¿Continuar?');
                        if (ok) deleteExecutedBudget(budget.id);
                      }}
                      className="flex-1 bg-red-500 text-white py-1 px-3 rounded-md hover:bg-red-600 transition duration-300 ease-in-out text-sm shadow-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExecutedBudgets;

