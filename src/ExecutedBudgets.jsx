import React, { useMemo, useState } from 'react';
import { useBudgets, usePersonnel } from './hooks';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-ES');
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-ES');
}

function ExecutedBudgets() {
  const { executedBudgets, deleteExecutedBudget } = useBudgets();
  const { personnel } = usePersonnel();
  const [search, setSearch] = useState('');

  const personnelById = useMemo(() => {
    const map = new Map();
    for (const person of personnel) map.set(person.id, person);
    return map;
  }, [personnel]);

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
          <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold [&>th]:whitespace-nowrap">
                  <th>Nombre</th>
                  <th>Nº</th>
                  <th>#Ticket</th>
                  <th>Aceptación</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th className="text-right">Horas</th>
                  <th>Personal</th>
                  <th>PDF</th>
                  <th>Ejecutado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((budget) => {
                  const assigned = (budget.assignedPersonnel || [])
                    .map((id) => personnelById.get(id))
                    .filter(Boolean);
                  const assignedText = assigned.length
                    ? assigned.map((p) => `${p.name} (${p.laborType})`).join(', ')
                    : '-';

                  return (
                    <tr
                      key={budget.id}
                      className="hover:bg-emerald-50/40 [&>td]:px-3 [&>td]:py-2 [&>td]:align-top"
                    >
                      <td className="font-medium text-gray-900">{budget.name || '-'}</td>
                      <td className="whitespace-nowrap text-gray-700">{budget.budgetNumber || '-'}</td>
                      <td className="whitespace-nowrap text-gray-700">{budget.ticketRef || '-'}</td>
                      <td className="whitespace-nowrap text-gray-700">{formatDate(budget.acceptanceDate)}</td>
                      <td className="whitespace-nowrap text-gray-700">{formatDate(budget.startDate)}</td>
                      <td className="whitespace-nowrap text-gray-700">{formatDate(budget.endDate)}</td>
                      <td className="whitespace-nowrap text-right tabular-nums text-gray-700">
                        {budget.totalHours ?? '-'}
                      </td>
                      <td className="min-w-64 text-gray-700">{assignedText}</td>
                      <td className="whitespace-nowrap">
                        {budget.pdfFilename ? (
                          <a
                            className="text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
                            href={`/api/executed-budgets/${budget.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ver
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-gray-700">{formatDateTime(budget.executedAt)}</td>
                      <td className="whitespace-nowrap">
                        <button
                          onClick={() => {
                            const ok = window.confirm('Eliminará el presupuesto de "Ejecutados". ¿Continuar?');
                            if (ok) deleteExecutedBudget(budget.id);
                          }}
                          className="bg-red-500 text-white py-1 px-3 rounded-md hover:bg-red-600 transition duration-300 ease-in-out text-xs shadow-sm"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExecutedBudgets;
