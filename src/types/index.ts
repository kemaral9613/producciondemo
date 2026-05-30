export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';

export type OrderStatus = 'pending' | 'scheduled' | 'in_production' | 'paused' | 'completed' | 'delayed';

export type WorkstationStatus = 'available' | 'busy' | 'maintenance' | 'offline';

export interface Operator {
  id: string;
  name: string;
  role: string;
  status: 'available' | 'busy' | 'absent';
}

export interface Workstation {
  id: string;
  name: string;
  dailyCapacityHours: number;
  assignedOperators: string[]; // Nombres de los operarios
  status: WorkstationStatus;
}

export interface OrderProductStep {
  id: string; // Formato: STEP-[OP-ID]-[PRODUCT-INDEX]-[STEP-INDEX]
  orderId: string; // OP madre asociada (ej. OP-1001)
  clientName: string; // Copiado de la OP para accesibilidad rápida
  priority: PriorityLevel; // Copiado de la OP
  dueDate: string; // Copiado de la OP (YYYY-MM-DD)
  productId: string; // Producto madre asociado
  productName: string; // Nombre del producto (ej. "Tornillos 5/8")
  quantity: number; // Cantidad a fabricar del producto
  
  // Datos específicos de la operación en taller
  workstationId: string; // Puesto de trabajo asociado
  estimatedHours: number; // Duración en horas
  
  // Programación operativa (opcional en la creación, configurable después)
  scheduledDate?: string; // YYYY-MM-DD
  scheduledStartHour?: number; // 0 a 23
  assignedOperatorId?: string; // Operario asignado (ID)
  status: OrderStatus;
  updatedAt?: string;
}

export interface OrderProduct {
  id: string; // Formato: PROD-[OP-ID]-[INDEX]
  name: string; // Nombre/Descripción del producto
  quantity: number; // Cantidad a fabricar
  steps: OrderProductStep[]; // Operaciones requeridas (Ruta de producción)
}

export interface ProductionOrder {
  id: string; // Formato: OP-XXXX
  clientName: string;
  dueDate: string; // YYYY-MM-DD
  priority: PriorityLevel;
  notes?: string;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
  products: OrderProduct[]; // Múltiples productos independientes
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  read: boolean;
  orderId?: string;
}

export interface DashboardMetrics {
  totalActiveOrders: number;
  delayedOrders: number;
  inProductionOrders: number;
  completedOrders: number;
  workstationUtilization: { [workstationId: string]: number };
  weeklyCapacityUsage: number;
}
