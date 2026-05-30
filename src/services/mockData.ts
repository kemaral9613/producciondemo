import type { Operator, Workstation, ProductionOrder } from '../types';

// Helper to calculate relative dates dynamically
const getRelativeDateStr = (daysOffset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

export const INITIAL_OPERATORS: Operator[] = [
  { id: 'OP-Mendoza', name: 'Carlos Mendoza', role: 'Soldador Especialista', status: 'available' },
  { id: 'OP-Gomez', name: 'Beatriz Gómez', role: 'Operadora de Corte Láser', status: 'available' },
  { id: 'OP-Restrepo', name: 'Juan Carlos Restrepo', role: 'Supervisor de Ensamble', status: 'available' },
  { id: 'OP-Ospina', name: 'Diana Marcela Ospina', role: 'Técnica en Acabados', status: 'available' },
  { id: 'OP-Pena', name: 'Eduardo Peña', role: 'Operario de Empaque y Despacho', status: 'available' },
  { id: 'OP-Ramirez', name: 'Andrés Ramírez', role: 'Ayudante de Metalmecánica', status: 'available' }
];

export const INITIAL_WORKSTATIONS: Workstation[] = [
  { 
    id: 'WS-CUT', 
    name: 'Línea de Corte Láser', 
    dailyCapacityHours: 12, 
    assignedOperators: ['Carlos Mendoza', 'Beatriz Gómez'], 
    status: 'available' 
  },
  { 
    id: 'WS-WELD', 
    name: 'Puesto de Soldadura TIG', 
    dailyCapacityHours: 8, 
    assignedOperators: ['Carlos Mendoza', 'Andrés Ramírez'], 
    status: 'available' 
  },
  { 
    id: 'WS-ASM', 
    name: 'Área de Ensamble Mecánico', 
    dailyCapacityHours: 16, 
    assignedOperators: ['Juan Carlos Restrepo', 'Andrés Ramírez'], 
    status: 'available' 
  },
  { 
    id: 'WS-PAINT', 
    name: 'Cámara de Pintura Electrostática', 
    dailyCapacityHours: 8, 
    assignedOperators: ['Diana Marcela Ospina'], 
    status: 'available' 
  },
  { 
    id: 'WS-PACK', 
    name: 'Puesto de Empaque y Despacho', 
    dailyCapacityHours: 10, 
    assignedOperators: ['Eduardo Peña'], 
    status: 'available' 
  }
];

export const INITIAL_ORDERS: ProductionOrder[] = [];
