export type PropertyType = "apartment" | "villa" | "office" | "retail" | "hotel" | "warehouse";
export type PropertyCity = { name: string; country: string; priceIndex: number; rentIndex: number; demand: number };

export type RealEstateProperty = {
  id: string;
  listingId: string;
  name: string;
  type: PropertyType;
  city: string;
  country: string;
  level: number;
  value: number;
  monthlyRent: number;
  occupancy: number;
  maintenanceRate: number;
  appreciationRate: number;
  totalRentalIncome: number;
  totalExpenses: number;
};

export type PropertyListing = {
  id: string;
  name: string;
  type: PropertyType;
  basePrice: number;
  baseMonthlyRent: number;
  maintenanceRate: number;
  appreciationRate: number;
  description: string;
};

export type PropertyActionResult<T> = { ok: true; property: T; cash?: number } | { ok: false; reason: string; cash?: number };

export const PROPERTY_CITIES: PropertyCity[] = [
  { name: "Bengaluru", country: "India", priceIndex: 1, rentIndex: 1, demand: 1.04 },
  { name: "Mumbai", country: "India", priceIndex: 1.28, rentIndex: 1.2, demand: 1.06 },
  { name: "Delhi", country: "India", priceIndex: 1.12, rentIndex: 1.08, demand: 1 },
  { name: "Dubai", country: "UAE", priceIndex: 1.65, rentIndex: 1.55, demand: 1.08 },
  { name: "London", country: "United Kingdom", priceIndex: 2.3, rentIndex: 2.05, demand: 1.03 },
  { name: "New York", country: "United States", priceIndex: 2.55, rentIndex: 2.25, demand: 1.02 },
  { name: "Singapore", country: "Singapore", priceIndex: 2.15, rentIndex: 1.95, demand: 1.05 },
  { name: "Tokyo", country: "Japan", priceIndex: 1.85, rentIndex: 1.65, demand: 1.01 },
  { name: "Paris", country: "France", priceIndex: 1.95, rentIndex: 1.8, demand: 1 },
];

export const PROPERTY_CATALOG: PropertyListing[] = [
  { id: "studio-apartment", name: "Studio Apartment", type: "apartment", basePrice: 15000, baseMonthlyRent: 240, maintenanceRate: 0.008, appreciationRate: 0.035, description: "A compact rental unit for first-time landlords." },
  { id: "family-apartment", name: "Family Apartment", type: "apartment", basePrice: 42000, baseMonthlyRent: 650, maintenanceRate: 0.009, appreciationRate: 0.04, description: "A larger home with steady residential demand." },
  { id: "city-villa", name: "City Villa", type: "villa", basePrice: 125000, baseMonthlyRent: 1750, maintenanceRate: 0.014, appreciationRate: 0.045, description: "A premium residence with higher upkeep." },
  { id: "retail-unit", name: "Retail Unit", type: "retail", basePrice: 65000, baseMonthlyRent: 1050, maintenanceRate: 0.011, appreciationRate: 0.04, description: "Street-level commercial space for tenants." },
  { id: "office-floor", name: "Office Floor", type: "office", basePrice: 185000, baseMonthlyRent: 3100, maintenanceRate: 0.013, appreciationRate: 0.042, description: "A commercial office investment." },
  { id: "boutique-hotel", name: "Boutique Hotel", type: "hotel", basePrice: 480000, baseMonthlyRent: 8200, maintenanceRate: 0.022, appreciationRate: 0.05, description: "A hospitality asset with higher operating costs." },
  { id: "logistics-warehouse", name: "Logistics Warehouse", type: "warehouse", basePrice: 105000, baseMonthlyRent: 1650, maintenanceRate: 0.01, appreciationRate: 0.038, description: "Industrial space for storage and distribution." },
];

export function purchaseProperty(cash: number, listingId: string, cityName: string, id: string): PropertyActionResult<RealEstateProperty> {
  const listing = PROPERTY_CATALOG.find(item => item.id === listingId);
  const city = PROPERTY_CITIES.find(item => item.name.toLowerCase() === cityName.trim().toLowerCase());
  if (!listing) return { ok: false, reason: "Property listing not found.", cash };
  if (!city) return { ok: false, reason: "Choose a supported property market.", cash };
  const cost = Math.round(listing.basePrice * city.priceIndex);
  if (!Number.isFinite(cash) || cash < cost) return { ok: false, reason: "Not enough cash to purchase this property.", cash };
  if (!id.trim()) return { ok: false, reason: "Invalid property identity.", cash };
  return {
    ok: true,
    cash: cash - cost,
    property: {
      id,
      listingId,
      name: listing.name,
      type: listing.type,
      city: city.name,
      country: city.country,
      level: 1,
      value: cost,
      monthlyRent: Math.round(listing.baseMonthlyRent * city.rentIndex),
      occupancy: 0.88,
      maintenanceRate: listing.maintenanceRate,
      appreciationRate: listing.appreciationRate,
      totalRentalIncome: 0,
      totalExpenses: 0,
    },
  };
}

export function calculatePropertyEconomics(property: RealEstateProperty, demandFactor = 1) {
  const city = PROPERTY_CITIES.find(item => item.name === property.city);
  const demand = Math.max(0.2, Math.min(1.5, (city?.demand ?? 1) * demandFactor));
  const occupancy = Math.max(0, Math.min(1, property.occupancy));
  const monthlyGrossRent = property.monthlyRent * occupancy * demand;
  const monthlyMaintenance = property.value * property.maintenanceRate / 12;
  return { monthlyGrossRent, monthlyMaintenance, monthlyNetRent: monthlyGrossRent - monthlyMaintenance, demand, occupancy };
}

export function upgradeProperty(property: RealEstateProperty, cash: number): PropertyActionResult<RealEstateProperty> {
  const cost = Math.round(property.value * 0.15 * property.level);
  if (!Number.isFinite(cash) || cash < cost) return { ok: false, reason: "Not enough cash to renovate this property.", cash };
  return {
    ok: true,
    cash: cash - cost,
    property: { ...property, level: property.level + 1, value: property.value * 1.2, monthlyRent: property.monthlyRent * 1.18, occupancy: Math.min(1, property.occupancy + 0.03) },
  };
}

export function sellProperty(property: RealEstateProperty) {
  return { property, proceeds: property.value * 0.92 };
}

export function simulatePropertyMinutes(property: RealEstateProperty, minutes: number, demandFactor = 1) {
  const elapsed = Number.isFinite(minutes) ? Math.max(0, Math.min(10080, minutes)) : 0;
  const economics = calculatePropertyEconomics(property, demandFactor);
  const grossRent = economics.monthlyGrossRent / 30 * elapsed / 390;
  const maintenance = economics.monthlyMaintenance / 30 * elapsed / 390;
  const netIncome = grossRent - maintenance;
  const appreciation = property.value * property.appreciationRate / 365 * elapsed / 390;
  return {
    property: {
      ...property,
      value: Math.max(0, property.value + appreciation),
      totalRentalIncome: property.totalRentalIncome + grossRent,
      totalExpenses: property.totalExpenses + maintenance,
    },
    grossRent,
    maintenance,
    netIncome,
    appreciation,
    economics,
  };
}
