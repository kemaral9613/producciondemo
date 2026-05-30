import type { ProductionOrder, OrderProduct } from '../types';

export const calcProductsTotalHours = (products: OrderProduct[]): number => {
  return products.reduce((sum, p) => {
    const stepsHours = p.steps.reduce((sSum, s) => sSum + (s.estimatedHours || 0), 0);
    return sum + stepsHours;
  }, 0);
};

export const calcProductsTotalQuantity = (products: OrderProduct[]): number => {
  return products.reduce((sum, p) => sum + (p.quantity || 0), 0);
};

export const buildProductsSummary = (products: OrderProduct[]): string => {
  const names = products.map((p) => p.name).filter(Boolean);
  if (names.length === 0) return 'Productos';
  const first = names[0];
  if (names.length === 1) return first;
  return `${first} + ${names.length - 1} más`;
};
