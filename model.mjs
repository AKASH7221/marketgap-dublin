// Coordinates are approximate neighbourhood centres. All analytical inputs are synthetic.
export const areas = [
  { name: "Rathmines", point: [-6.265, 53.322], demand: 88, gap: 82, access: 79, cost: 45000 },
  { name: "Docklands", point: [-6.239, 53.348], demand: 94, gap: 68, access: 87, cost: 70000 },
  { name: "Dundrum", point: [-6.245, 53.289], demand: 81, gap: 77, access: 86, cost: 50000 },
  { name: "City Centre", point: [-6.260, 53.346], demand: 96, gap: 48, access: 97, cost: 85000 },
  { name: "Phibsborough", point: [-6.274, 53.360], demand: 76, gap: 89, access: 72, cost: 35000 },
  { name: "Stoneybatter", point: [-6.285, 53.353], demand: 78, gap: 73, access: 75, cost: 40000 },
  { name: "Portobello", point: [-6.269, 53.330], demand: 84, gap: 65, access: 82, cost: 50000 },
  { name: "Drumcondra", point: [-6.255, 53.369], demand: 72, gap: 84, access: 79, cost: 40000 },
];
const categories = {
  coffee: { cost: 1, gaps: [4, 0, 0, -8, 1, 0, -3, 0] },
  food: { cost: 1.6, gaps: [0, 10, 3, 12, -2, 8, 5, -5] },
  fitness: { cost: 1.35, gaps: [-3, 6, 10, -3, -10, 3, 7, 10] },
  retail: { cost: 0.8, gaps: [0, -10, 12, 10, -5, 6, 0, -8] },
};
export function rank(category, budget, search = "") {
  const settings = categories[category];
  const query = search.trim().toLowerCase();
  return areas.map((area, index) => {
    const gap = area.gap + settings.gaps[index];
    const cost = Math.round(area.cost * settings.cost / 500) * 500;
    const score = Math.round(area.demand * 0.45 + gap * 0.35 + area.access * 0.2);
    return { ...area, cost, gap, score };
  }).filter(area => area.cost <= budget && area.name.toLowerCase().includes(query))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

export function calculate({ investment, customers, spend, days, variable, fixed }) {
  const inputs = [investment, customers, spend, days, variable, fixed];
  if (inputs.some(value => !Number.isFinite(value) || value < 0)
      || !Number.isInteger(days) || days < 1 || days > 31 || variable > 100
      || !Number.isInteger(customers)) return null;
  const revenue = customers * spend * days;
  const contribution = spend * (1 - variable / 100);
  const profit = Math.round((revenue * (1 - variable / 100) - fixed) * 100) / 100;
  return {
    revenue, profit,
    margin: revenue ? profit / revenue : null,
    payback: investment === 0 ? 0 : profit > 0 ? investment / profit : null,
    annualRoi: investment > 0 ? profit * 12 / investment : null,
    breakEven: fixed === 0 ? 0 : contribution > 0 ? Math.ceil(fixed / (contribution * days)) : null,
  };
}