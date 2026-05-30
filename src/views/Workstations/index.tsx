import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { WorkstationStatus } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { 
  Cpu, CheckCircle2, AlertTriangle, Hammer, Edit, Clock, 
  Users, TrendingUp, Plus, Trash2, Settings, X 
} from 'lucide-react';

export const Workstations: React.FC = () => {
  const {
    workstations,
    orders,
    operators,
    addWorkstation,
    deleteWorkstation,
    updateWorkstation,
    updateWorkstationStatus,
    toast
  } = useApp();

  // Modal CRUD state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWs, setEditingWs] = useState<any | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [dailyCapacityHours, setDailyCapacityHours] = useState<number>(8);
  const [status, setStatus] = useState<WorkstationStatus>('available');
  const [assignedOperators, setAssignedOperators] = useState<string[]>([]);

  const openCreateModal = () => {
    setEditingWs(null);
    setName('');
    setDailyCapacityHours(8);
    setStatus('available');
    setAssignedOperators([]);
    setIsModalOpen(true);
  };

  const openEditModal = (ws: any) => {
    setEditingWs(ws);
    setName(ws.name);
    setDailyCapacityHours(ws.dailyCapacityHours);
    setStatus(ws.status);
    setAssignedOperators(ws.assignedOperators || []);
    setIsModalOpen(true);
  };

  const handleOperatorToggle = (operatorName: string) => {
    setAssignedOperators(prev => 
      prev.includes(operatorName)
        ? prev.filter(name => name !== operatorName)
        : [...prev, operatorName]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || dailyCapacityHours < 1 || dailyCapacityHours > 24) {
      toast.show('Por favor ingresa un nombre y una capacidad diaria entre 1 y 24 horas', 'error');
      return;
    }

    const wsData = {
      name,
      dailyCapacityHours,
      status,
      assignedOperators
    };

    if (editingWs) {
      updateWorkstation(editingWs.id, wsData);
    } else {
      addWorkstation(wsData);
    }
    setIsModalOpen(false);
  };

  // Helper to calculate workstation utilization based on steps scheduled for this workstation
  const calculateUtilization = (wsId: string, dailyCapacity: number) => {
    // Flatten all steps from all orders and filter by this workstation
    const allSteps = orders.flatMap(o => o.products.flatMap(p => p.steps));
    const wsSteps = allSteps.filter(
      (s) => s.workstationId === wsId && s.status !== 'completed' && s.scheduledDate
    );
    const totalScheduledHours = wsSteps.reduce((sum, s) => sum + s.estimatedHours, 0);
    const weeklyCapacity = dailyCapacity * 5; // 5 días laborales
    const pct = weeklyCapacity > 0 ? (totalScheduledHours / weeklyCapacity) * 100 : 0;
    return {
      percentage: Math.min(100, Math.round(pct)),
      hours: totalScheduledHours,
      capacity: weeklyCapacity
    };
  };

  const getStatusIcon = (status: WorkstationStatus) => {
    switch (status) {
      case 'available':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'busy':
        return <Cpu className="w-5 h-5 text-indigo-500 animate-pulse" />;
      case 'maintenance':
        return <Hammer className="w-5 h-5 text-amber-500" />;
      case 'offline':
      default:
        return <AlertTriangle className="w-5 h-5 text-rose-500" />;
    }
  };

  const getProgressBarColor = (pct: number) => {
    if (pct > 90) return 'bg-rose-500';
    if (pct > 70) return 'bg-amber-500';
    return 'bg-indigo-500 dark:bg-indigo-400';
  };

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight font-sans">
            Puestos de Trabajo y Líneas
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Control de estado físico de maquinaria, operarios asignados y capacidad de planta
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all text-xs font-bold text-white rounded-xl shadow-md shadow-indigo-500/10 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nuevo Puesto
        </button>
      </div>

      {/* Grid of Workstations Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {workstations.map((ws) => {
          const metrics = calculateUtilization(ws.id, ws.dailyCapacityHours);

          // Find operators assigned to this workstation
          const assignedOperatorsList = operators.filter((op) => 
            ws.assignedOperators.includes(op.name)
          );

          return (
            <div
              key={ws.id}
              className="bg-white dark:bg-[#111723] border border-indigo-200/90 dark:border-indigo-800/60 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative group/card"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-indigo-200/80 dark:border-indigo-800/50 bg-slate-50/30 dark:bg-slate-900/10 flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-350">
                    {getStatusIcon(ws.status)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-150 leading-snug">
                      {ws.name}
                    </h3>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block mt-0.5">
                      Puesto ID: {ws.id}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Badge type="workstationStatus" value={ws.status} />
                  
                  {/* Small Action edit/delete bar visible at top */}
                  <div className="inline-flex gap-1.5 opacity-60 group-hover/card:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(ws)}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 transition-colors"
                      title="Editar puesto de trabajo"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Estás seguro de que deseas eliminar el puesto "${ws.name}"?`)) {
                          deleteWorkstation(ws.id);
                        }
                      }}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Eliminar puesto de trabajo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-grow space-y-4">
                {/* Status Switcher Selector */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                    Modificar Estado Operativo
                  </label>
                  <select
                    value={ws.status}
                    onChange={(e) => updateWorkstationStatus(ws.id, e.target.value as WorkstationStatus)}
                    className="w-full px-2.5 py-1.5 border border-indigo-200 dark:border-indigo-800/60 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl text-xs text-slate-650 dark:text-slate-200 font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="available">Disponible</option>
                    <option value="busy">Ocupado (En Producción)</option>
                    <option value="maintenance">Mantenimiento Preventivo</option>
                    <option value="offline">Fuera de Línea (Detenido)</option>
                  </select>
                </div>

                {/* Utilization Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    <span className="uppercase tracking-widest flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                      Carga de Trabajo ({metrics.percentage}%)
                    </span>
                    <span className="text-slate-700 dark:text-slate-350">
                      {metrics.hours}h / {metrics.capacity}h sem.
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressBarColor(metrics.percentage)} rounded-full transition-all duration-700`}
                      style={{ width: `${metrics.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Capacity Display */}
                <div className="border-t border-indigo-200/70 dark:border-indigo-800/40 pt-3">
                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    Capacidad Disponible Diaria
                  </label>
                  <div className="flex items-center justify-between text-xs mt-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {ws.dailyCapacityHours} horas por día
                    </span>
                    <button
                      onClick={() => openEditModal(ws)}
                      className="text-indigo-500 hover:text-indigo-650 text-[10px] font-bold flex items-center gap-0.5"
                    >
                      <Edit className="w-3 h-3" />
                      Ajustar
                    </button>
                  </div>
                </div>

                {/* Operators Section */}
                <div className="border-t border-indigo-200/70 dark:border-indigo-800/40 pt-3">
                  <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                    Personal Asignado
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {assignedOperatorsList.length > 0 ? (
                      assignedOperatorsList.map((op) => (
                        <div
                          key={op.id}
                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-350"
                        >
                          <Users className="w-3 h-3 text-slate-400" />
                          {op.name}
                        </div>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400 dark:text-slate-550 italic">
                        Sin personal de planta asignado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Creation and modification Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingWs ? `Editar Puesto de Trabajo - ${editingWs.name}` : 'Crear Puesto de Trabajo'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4 font-sans text-xs">
          <div className="space-y-3">
            {/* Nombre Puesto */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Nombre del Puesto / Máquina *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Torno CNC Paralelo, Área de Pulido"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs dark:text-slate-100"
              />
            </div>

            {/* Capacidad Diaria */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Capacidad de Trabajo Diaria (Horas) *
              </label>
              <input
                type="number"
                required
                min="1"
                max="24"
                value={dailyCapacityHours}
                onChange={(e) => setDailyCapacityHours(parseInt(e.target.value, 10) || 8)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs dark:text-slate-100"
              />
            </div>

            {/* Estado */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Estado Físico Inicial *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as WorkstationStatus)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs dark:text-slate-100"
              >
                <option value="available">Disponible</option>
                <option value="busy">Ocupado (En Producción)</option>
                <option value="maintenance">En Mantenimiento</option>
                <option value="offline">Fuera de Línea</option>
              </select>
            </div>

            {/* Operadores Asignados */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Seleccionar Operarios Asignados
              </label>
              <div className="grid grid-cols-2 gap-2 border border-slate-150 dark:border-slate-800 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 max-h-40 overflow-y-auto">
                {operators.map((op) => {
                  const isChecked = assignedOperators.includes(op.name);
                  return (
                    <label 
                      key={op.id} 
                      className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                        isChecked ? 'bg-slate-150/60 dark:bg-slate-850/50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleOperatorToggle(op.name)}
                        className="rounded text-indigo-500 accent-indigo-500"
                      />
                      <div>
                        <p className="font-bold text-[10px] text-slate-700 dark:text-slate-200">{op.name}</p>
                        <p className="text-[8px] text-slate-400 dark:text-slate-500">{op.role}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-250 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-500/10"
            >
              {editingWs ? 'Guardar Cambios' : 'Crear Puesto'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
