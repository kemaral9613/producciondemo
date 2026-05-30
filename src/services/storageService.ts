import type { ProductionOrder, Workstation, Operator, Notification } from '../types';
import { INITIAL_OPERATORS, INITIAL_WORKSTATIONS, INITIAL_ORDERS } from './mockData';

const KEYS = {
  ORDERS: 'scheduler_orders_v2',
  WORKSTATIONS: 'scheduler_workstations_v1',
  OPERATORS: 'scheduler_operators_v1',
  NOTIFICATIONS: 'scheduler_notifications_v1',
  THEME: 'scheduler_theme_v1'
};

export const storageService = {
  getOrders(): ProductionOrder[] {
    const data = localStorage.getItem(KEYS.ORDERS);
    if (!data) {
      this.saveOrders(INITIAL_ORDERS);
      return INITIAL_ORDERS;
    }
    try {
      const orders = JSON.parse(data) as ProductionOrder[];
      // Ensure all orders have the correct hierarchy structure
      return orders.filter(o => o && o.id && Array.isArray(o.products));
    } catch (e) {
      console.error('Error parsing orders, resetting to defaults:', e);
      this.saveOrders(INITIAL_ORDERS);
      return INITIAL_ORDERS;
    }
  },

  saveOrders(orders: ProductionOrder[]): void {
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  },

  getWorkstations(): Workstation[] {
    const data = localStorage.getItem(KEYS.WORKSTATIONS);
    if (!data) {
      this.saveWorkstations(INITIAL_WORKSTATIONS);
      return INITIAL_WORKSTATIONS;
    }
    try {
      return JSON.parse(data) as Workstation[];
    } catch (e) {
      this.saveWorkstations(INITIAL_WORKSTATIONS);
      return INITIAL_WORKSTATIONS;
    }
  },

  saveWorkstations(workstations: Workstation[]): void {
    localStorage.setItem(KEYS.WORKSTATIONS, JSON.stringify(workstations));
  },

  getOperators(): Operator[] {
    const data = localStorage.getItem(KEYS.OPERATORS);
    if (!data) {
      this.saveOperators(INITIAL_OPERATORS);
      return INITIAL_OPERATORS;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return INITIAL_OPERATORS;
    }
  },

  saveOperators(operators: Operator[]): void {
    localStorage.setItem(KEYS.OPERATORS, JSON.stringify(operators));
  },

  getNotifications(): Notification[] {
    const data = localStorage.getItem(KEYS.NOTIFICATIONS);
    if (!data) {
      this.saveNotifications([]);
      return [];
    }
    try {
      return JSON.parse(data) as Notification[];
    } catch (e) {
      return [];
    }
  },

  saveNotifications(notifications: Notification[]): void {
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  },

  getTheme(): 'light' | 'dark' {
    const theme = localStorage.getItem(KEYS.THEME);
    return theme === 'dark' ? 'dark' : 'light';
  },

  saveTheme(theme: 'light' | 'dark'): void {
    localStorage.setItem(KEYS.THEME, theme);
  },

  exportBackup(): string {
    const backupData = {
      orders: this.getOrders(),
      workstations: this.getWorkstations(),
      operators: this.getOperators(),
      notifications: this.getNotifications(),
      exportedAt: new Date().toISOString(),
      version: '2.0.0'
    };
    return JSON.stringify(backupData, null, 2);
  },

  importBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.orders && data.workstations && data.operators) {
        this.saveOrders(data.orders);
        this.saveWorkstations(data.workstations);
        this.saveOperators(data.operators);
        this.saveNotifications(data.notifications || []);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error importing backup:', e);
      return false;
    }
  },

  clearAll(): void {
    localStorage.removeItem(KEYS.ORDERS);
    localStorage.removeItem(KEYS.WORKSTATIONS);
    localStorage.removeItem(KEYS.OPERATORS);
    localStorage.removeItem(KEYS.NOTIFICATIONS);
  }
};
