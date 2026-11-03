import type { Difficulty } from "@/lib/currency";

export type BusinessIndustry = "retail" | "construction" | "banking" | "logistics";
export type EmployeeRole = "worker" | "specialist" | "supervisor" | "manager" | "director";
export type BusinessStrategy = "value" | "balanced" | "premium";

export type BusinessEmployee = {
  id: string;
  name: string;
  role: EmployeeRole;
  skill: number;
  experience: number;
  morale: number;
  salaryPerDay: number;
};

export type Business = {
  id: string;
  definitionId: string;
  name: string;
  industry: BusinessIndustry;
  city: string;
  level: number;
  value: number;
  employees: BusinessEmployee[];
  strategy: BusinessStrategy;
  reputation: number;
  baseCost: number;
  baseRevenuePerDay: number;
  baseOperatingCostsPerDay: number;
  totalRevenue: number;
  totalProfit: number;
};

export type BusinessDefinition = {
  id: string;
  name: string;
  industry: BusinessIndustry;
  baseCost: number;
  baseRevenuePerDay: number;
  baseOperatingCostsPerDay: number;
  description: string;
};

export type BusinessActionResult<T> = { ok: true; business: T; cash?: number } | { ok: false; reason: string; cash?: number };

export const BUSINESS_CATALOG: BusinessDefinition[] = [
  { id: "retail-shop", name: "Retail Shop", industry: "retail", baseCost: 10000, baseRevenuePerDay: 1200, baseOperatingCostsPerDay: 450, description: "Sell everyday products and build a local customer base." },
  { id: "construction-firm", name: "Construction Firm", industry: "construction", baseCost: 25000, baseRevenuePerDay: 3500, baseOperatingCostsPerDay: 1700, description: "Win construction contracts and deliver projects." },
  { id: "bank-branch", name: "Bank Branch", industry: "banking", baseCost: 50000, baseRevenuePerDay: 5500, baseOperatingCostsPerDay: 2700, description: "Earn fees and interest while managing credit risk." },
  { id: "logistics-depot", name: "Logistics Depot", industry: "logistics", baseCost: 35000, baseRevenuePerDay: 4000, baseOperatingCostsPerDay: 1900, description: "Operate warehouses, fleets and distribution contracts." },
];

export const EMPLOYEE_ROLES: Record<EmployeeRole, { label: string; salaryPerDay: number; skillBonus: number }> = {
  worker: { label: "Worker", salaryPerDay: 85, skillBonus: 0.04 },
  specialist: { label: "Specialist", salaryPerDay: 145, skillBonus: 0.1 },
  supervisor: { label: "Supervisor", salaryPerDay: 220, skillBonus: 0.13 },
  manager: { label: "Manager", salaryPerDay: 320, skillBonus: 0.17 },
  director: { label: "Director", salaryPerDay: 480, skillBonus: 0.2 },
};

const DIFFICULTY_ECONOMY: Record<Difficulty, { income: number; operatingCosts: number; salaries: number }> = {
  easy: { income: 1.2, operatingCosts: 0.85, salaries: 0.9 },
  normal: { income: 1, operatingCosts: 1, salaries: 1 },
  hard: { income: 0.9, operatingCosts: 1.2, salaries: 1.15 },
  expert: { income: 0.8, operatingCosts: 1.45, salaries: 1.35 },
};

export function purchaseBusiness(cash: number, definitionId: string, city: string, id: string): BusinessActionResult<Business> {
  const definition = BUSINESS_CATALOG.find(item => item.id === definitionId);
  if (!definition) return { ok: false, reason: "Business opportunity not found.", cash };
  if (!Number.isFinite(cash) || cash < definition.baseCost) return { ok: false, reason: "Not enough cash to acquire this business.", cash };
  if (!city.trim() || !id.trim()) return { ok: false, reason: "Choose a city and a valid business identity.", cash };
  const business: Business = {
    id,
    definitionId,
    name: definition.name,
    industry: definition.industry,
    city: city.trim(),
    level: 1,
    value: definition.baseCost,
    employees: [],
    strategy: "balanced",
    reputation: 50,
    baseCost: definition.baseCost,
    baseRevenuePerDay: definition.baseRevenuePerDay,
    baseOperatingCostsPerDay: definition.baseOperatingCostsPerDay,
    totalRevenue: 0,
    totalProfit: 0,
  };
  return { ok: true, business, cash: cash - definition.baseCost };
}

export function hireEmployee(business: Business, role: EmployeeRole, id: string, name: string): BusinessActionResult<Business> {
  if (!id.trim() || !name.trim()) return { ok: false, reason: "Enter an employee name." };
  if (business.employees.some(employee => employee.id === id)) return { ok: false, reason: "Employee already exists." };
  if (business.employees.length >= 20) return { ok: false, reason: "This business has reached its staffing limit." };
  const definition = EMPLOYEE_ROLES[role];
  const employee: BusinessEmployee = {
    id,
    name: name.trim(),
    role,
    skill: 0.5 + definition.skillBonus,
    experience: 0,
    morale: 80,
    salaryPerDay: definition.salaryPerDay,
  };
  return { ok: true, business: { ...business, employees: [...business.employees, employee] } };
}

export function fireEmployee(business: Business, employeeId: string): BusinessActionResult<Business> {
  const employees = business.employees.filter(employee => employee.id !== employeeId);
  if (employees.length === business.employees.length) return { ok: false, reason: "Employee not found." };
  return { ok: true, business: { ...business, employees } };
}


const ROLE_PROGRESSION: EmployeeRole[] = ["worker", "specialist", "supervisor", "manager", "director"];

export function promoteEmployee(business: Business, employeeId: string): BusinessActionResult<Business> {
  const index = business.employees.findIndex(employee => employee.id === employeeId);
  if (index < 0) return { ok: false, reason: "Employee not found." };
  const employee = business.employees[index];
  const nextRole = ROLE_PROGRESSION[ROLE_PROGRESSION.indexOf(employee.role) + 1];
  if (!nextRole) return { ok: false, reason: "This employee has reached the highest role." };
  const updated = {
    ...employee,
    role: nextRole,
    salaryPerDay: EMPLOYEE_ROLES[nextRole].salaryPerDay,
    skill: Math.min(1, employee.skill + 0.08),
    experience: employee.experience + 1,
    morale: Math.min(100, employee.morale + 8),
  };
  const employees = [...business.employees];
  employees[index] = updated;
  return { ok: true, business: { ...business, employees } };
}
\nexport function setBusinessStrategy(business: Business, strategy: BusinessStrategy): Business {
  return { ...business, strategy };
}

export function upgradeBusiness(business: Business, cash: number): BusinessActionResult<Business> {
  const cost = Math.round(business.baseCost * business.level * 0.6);
  if (!Number.isFinite(cash) || cash < cost) return { ok: false, reason: "Not enough cash to upgrade this business.", cash };
  return {
    ok: true,
    cash: cash - cost,
    business: { ...business, level: business.level + 1, value: business.value * 1.3 },
  };
}

export function relocateBusiness(business: Business, city: string, cash: number): BusinessActionResult<Business> {
  const cost = Math.round(business.baseCost * 0.15);
  if (!city.trim()) return { ok: false, reason: "Choose a destination city.", cash };
  if (city.trim().toLowerCase() === business.city.toLowerCase()) return { ok: false, reason: "This business is already in that city.", cash };
  if (cash < cost) return { ok: false, reason: "Not enough cash to relocate this business.", cash };
  return { ok: true, cash: cash - cost, business: { ...business, city: city.trim(), reputation: Math.max(0, business.reputation - 2) } };
}

export function calculateBusinessEconomics(business: Business, difficulty: Difficulty, demandFactor = 1) {
  const rules = DIFFICULTY_ECONOMY[difficulty];
  const staff = business.employees;
  const averageSkill = staff.length ? staff.reduce((sum, employee) => sum + employee.skill, 0) / staff.length : 0;
  const averageMorale = staff.length ? staff.reduce((sum, employee) => sum + employee.morale, 0) / staff.length : 0;
  const productivity = Math.max(0.55, Math.min(1.6, 0.65 + Math.min(staff.length, 8) * 0.12 + averageSkill * 0.2 + averageMorale * 0.001));
  const strategy = business.strategy === "value" ? { price: 0.88, demand: 1.2 } : business.strategy === "premium" ? { price: 1.18, demand: 0.82 } : { price: 1, demand: 1 };
  const demand = Math.max(0.2, Math.min(2, Number.isFinite(demandFactor) ? demandFactor : 1));
  const dailyRevenue = business.baseRevenuePerDay * business.level * productivity * strategy.price * strategy.demand * demand * rules.income;
  const dailyOperatingCosts = business.baseOperatingCostsPerDay * business.level * rules.operatingCosts;
  const dailyPayroll = staff.reduce((sum, employee) => sum + employee.salaryPerDay, 0) * rules.salaries;
  return { dailyRevenue, dailyOperatingCosts, dailyPayroll, dailyProfit: dailyRevenue - dailyOperatingCosts - dailyPayroll, productivity, demandFactor: demand };
}

export function simulateBusinessMinutes(business: Business, minutes: number, difficulty: Difficulty, demandFactor = 1) {
  const elapsed = Number.isFinite(minutes) ? Math.max(0, Math.min(10080, minutes)) : 0;
  const economics = calculateBusinessEconomics(business, difficulty, demandFactor);
  const revenue = economics.dailyRevenue * elapsed / 390;
  const profit = economics.dailyProfit * elapsed / 390;
  return {
    business: {
      ...business,
      totalRevenue: business.totalRevenue + revenue,
      totalProfit: business.totalProfit + profit,
      value: business.value,
    },
    revenue,
    profit,
    economics,
  };
}
