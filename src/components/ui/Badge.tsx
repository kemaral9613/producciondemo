import React from 'react';
import type { PriorityLevel, OrderStatus, WorkstationStatus } from '../../types';

interface BadgeProps {
  type: 'priority' | 'status' | 'workstationStatus';
  value: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ type, value, className = '' }) => {
  const getPriorityStyle = (priority: PriorityLevel) => {
    switch (priority) {
      case 'critical':
        return { label: 'CRÍTICA', classes: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800' };
      case 'high':
        return { label: 'ALTA', classes: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
      case 'medium':
        return { label: 'MEDIA', classes: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
      case 'low':
        return { label: 'BAJA', classes: 'bg-slate-100 text-slate-800 dark:bg-slate-800/60 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
    }
  };

  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return { label: 'Pendiente', classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-400 border-slate-200 dark:border-slate-700' };
      case 'scheduled':
        return { label: 'Programado', classes: 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800' };
      case 'in_production':
        return { label: 'En Producción', classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-850 animate-pulse-subtle' };
      case 'paused':
        return { label: 'Pausado', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' };
      case 'completed':
        return { label: 'Completado', classes: 'bg-teal-100 text-teal-800 dark:bg-teal-950/45 dark:text-teal-300 border-teal-200 dark:border-teal-800' };
      case 'delayed':
        return { label: 'Retrasado', classes: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-bold' };
    }
  };

  const getWorkstationStyle = (status: WorkstationStatus) => {
    switch (status) {
      case 'available':
        return { label: 'Disponible', classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
      case 'busy':
        return { label: 'Ocupado', classes: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' };
      case 'maintenance':
        return { label: 'Mantenimiento', classes: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
      case 'offline':
        return { label: 'Fuera de Línea', classes: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800' };
    }
  };

  let info = { label: value, classes: 'bg-slate-100 text-slate-800' };
  if (type === 'priority') info = getPriorityStyle(value as PriorityLevel);
  else if (type === 'status') info = getStatusStyle(value as OrderStatus);
  else if (type === 'workstationStatus') info = getWorkstationStyle(value as WorkstationStatus);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${info.classes} ${className}`}
    >
      {info.label}
    </span>
  );
};
