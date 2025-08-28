// Funciones auxiliares movidas a un archivo de utilidades
export const calcularSemanasOcupacion = (startDateStr, totalHours, hoursPerWeek) => {
  const semanas = [];
  let horasRestantes = totalHours;
  let currentDate = new Date(startDateStr);
  while (currentDate.getDay() !== 1) {
    currentDate.setDate(currentDate.getDate() + 1);
  }
  while (horasRestantes > 0) {
    const horasAsignadas = Math.min(hoursPerWeek, horasRestantes);
    semanas.push({
      semanaInicio: currentDate.toISOString().split("T")[0],
      horas: horasAsignadas,
    });
    horasRestantes -= horasAsignadas;
    currentDate.setDate(currentDate.getDate() + 7);
  }
  return semanas;
};

export const ym = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

export const monthsBetween = (startStr, endStr) => {
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

export const distributeHoursPerMonth = (startStr, endStr, totalHours) => {
  const months = monthsBetween(startStr, endStr);
  if (months.length === 0) return {};
  const perMonth = totalHours / months.length;
  return months.reduce((acc, m) => (acc[m] = (acc[m] || 0) + perMonth, acc), {});
};

export const monthlyCapacityForPerson = (hoursPerDay, daysPerWeek) =>
  (Number(hoursPerDay) || 0) * (Number(daysPerWeek) || 0) * 4.33;

export function computeProjectedFinishDate(budget, allPersonnel = []) {
  const { startDate, laborBreakdown = [], assignedPersonnel = [] } = budget;
  if (!startDate || laborBreakdown.length === 0 || assignedPersonnel.length === 0) {
    return null;
  }
  const weeklyCapacityByRole = {};
  assignedPersonnel.forEach(pid => {
    const p = allPersonnel.find(pp => pp.id === pid);
    if (!p) return;
    const cap = (Number(p.hoursPerDay) || 0) * (Number(p.daysPerWeek) || 0);
    weeklyCapacityByRole[p.laborType] = (weeklyCapacityByRole[p.laborType] || 0) + cap;
  });
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