import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// HOOKS PERSONALIZADOS
import { useBudgets, usePersonnel } from './hooks';

// FUNCIONES AUXILIARES
import { distributeHoursPerMonth, monthsBetween, calcularSemanasOcupacion, monthlyCapacityForPerson } from './utils';

import CollapsibleCard from './components/CollapsibleCard';

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
    totalHoursByType,
  } = budgetHook;

  const { personnel } = personnelHook;

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

  const availableHoursByType = useMemo(() => {
    const totals = {};
    personnel.forEach((person) => {
      const type = person.laborType || 'Sin tipo';
      const availableHours = monthlyCapacityForPerson(person.hoursPerDay, person.daysPerWeek);
      totals[type] = (totals[type] || 0) + (Number.isFinite(availableHours) ? availableHours : 0);
    });
    return totals;
  }, [personnel]);

  const hoursSummaryByType = useMemo(() => {
    const usedMap = new Map(totalHoursByType.map((item) => [item.type, Number(item.hours) || 0]));
    const allTypes = new Set([...Object.keys(availableHoursByType), ...usedMap.keys()]);
    return Array.from(allTypes)
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map((type) => ({
        type,
        usedHours: usedMap.get(type) || 0,
        availableMonthlyHours: availableHoursByType[type] || 0,
      }));
  }, [totalHoursByType, availableHoursByType]);

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

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Columna Izquierda: Resúmenes */}
      <div className="flex-1 space-y-8">
        {/* Carga de Trabajo por Personal (MOVIDO) */}
        <CollapsibleCard storageKey="workload" title="📋 Carga de Trabajo por Persona" headerClassName="mb-6 border-b pb-3 border-gray-400">
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
        </CollapsibleCard>

        {/* NUEVO: Resumen de Horas Totales por Tipo */}
        <CollapsibleCard storageKey="hours_by_type" title="📊 Resumen de Horas por Tipo" headerClassName="mb-6 border-b pb-3 border-gray-400">
            {hoursSummaryByType.length === 0 ? (
                <p className="text-gray-500">No hay datos de personal ni de desglose de mano de obra.</p>
            ) : (
                <div className="space-y-4">
                    {hoursSummaryByType.map((item) => (
                        <div
                          key={item.type}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
                        >
                            <span className="text-lg font-semibold text-gray-700">{item.type}</span>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                              <div className="text-sm text-gray-700">
                                <span className="font-semibold">Disponibles (mes): </span>
                                <span className="tabular-nums">{Math.round(item.availableMonthlyHours)}h</span>
                              </div>
                              <div className="text-sm text-gray-700">
                                <span className="font-semibold">Usadas (total): </span>
                                <span className="tabular-nums text-indigo-700 font-bold">{Math.round(item.usedHours)}h</span>
                              </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CollapsibleCard>

      </div>
      {/* Columna Derecha: Gráfico */}
      <div className="flex-1 space-y-8">
        {/* Gráfico de Ocupación Mensual (MOVIDO) */}
        <CollapsibleCard storageKey="monthly_chart" title="📅 Ocupación Mensual del Personal (Gráfico)" headerClassName="mb-6 border-b pb-3 border-gray-400">
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
        </CollapsibleCard>
      </div>
    </div>
  );
}

export default BudgetDashboard;
