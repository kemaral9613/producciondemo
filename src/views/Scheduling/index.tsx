import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { ProductionOrder, OrderProductStep, OrderStatus } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { 
  Zap, Calendar, AlertTriangle, Play, HelpCircle, ArrowRight, Clock, MapPin, 
  User, CheckCircle, ChevronLeft, ChevronRight, X, AlertCircle, Layers 
} from 'lucide-react';

export const Scheduling: React.FC = () => {
  const {
    orders,
    workstations,
    operators,
    updateOrder,
    triggerAutoScheduling,
    conflicts,
    isFullscreen,
    setIsFullscreen
  } = useApp();

  const [baseDate, setBaseDate] = useState<Date>(() => new Date());
  const [selectedStepToSchedule, setSelectedStepToSchedule] = useState<OrderProductStep | null>(null);

  // Generate 7 consecutive dates YYYY-MM-DD
  const timelineDates = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + idx);
    return d.toISOString().split('T')[0];
  });

  const formatDateLabel = (dateStr: string) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const d = new Date(dateStr + 'T00:00:00');
    return {
      dayName: days[d.getDay()],
      dayNum: d.getDate(),
      monthName: months[d.getMonth()]
    };
  };

  const navigateTimeline = (direction: 'prev' | 'next') => {
    const newBase = new Date(baseDate);
    newBase.setDate(newBase.getDate() + (direction === 'prev' ? -7 : 7));
    setBaseDate(newBase);
  };

  const resetToToday = () => {
    setBaseDate(new Date());
  };

  // Flatten active steps (incomplete)
  const allSteps: OrderProductStep[] = orders.flatMap(o => 
    o.products.flatMap(p => p.steps)
  );

  const unscheduledSteps = allSteps.filter(
    (s) => s.status !== 'completed' && (!s.scheduledDate || !s.workstationId)
  );

  const scheduledSteps = allSteps.filter(
    (s) => s.status !== 'completed' && s.scheduledDate && s.workstationId
  );

  // Group steps by workstation and date
  const getStepsForSlot = (wsId: string, dateStr: string) => {
    return scheduledSteps.filter(
      (s) => s.workstationId === wsId && s.scheduledDate === dateStr
    );
  };

  // Form states for manual scheduling editor
  const [targetWorkstation, setTargetWorkstation] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [targetHour, setTargetHour] = useState(8);
  const [targetOperator, setTargetOperator] = useState('');

  const openSchedulingEditor = (step: OrderProductStep) => {
    setSelectedStepToSchedule(step);
    setTargetWorkstation(step.workstationId || workstations[0]?.id || '');
    setTargetDate(step.scheduledDate || new Date().toISOString().split('T')[0]);
    setTargetHour(step.scheduledStartHour ?? 8);
    setTargetOperator(step.assignedOperatorId || '');
  };

  const handleApplySchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStepToSchedule || !targetWorkstation || !targetDate) return;

    // Find the parent order
    const parentOrder = orders.find(o => o.id === selectedStepToSchedule.orderId);
    if (!parentOrder) return;

    // Update products and step array cascadingly
    const updatedProducts = parentOrder.products.map(prod => {
      if (prod.id === selectedStepToSchedule.productId) {
        const updatedSteps = prod.steps.map(step => {
          if (step.id === selectedStepToSchedule.id) {
            return {
              ...step,
              workstationId: targetWorkstation,
              scheduledDate: targetDate,
              scheduledStartHour: targetHour,
              assignedOperatorId: targetOperator || undefined,
              status: step.status === 'pending' ? 'scheduled' as OrderStatus : step.status
            };
          }
          return step;
        });
        return { ...prod, steps: updatedSteps };
      }
      return prod;
    });

    updateOrder(selectedStepToSchedule.orderId, { products: updatedProducts });
    setSelectedStepToSchedule(null);
  };

  const handleUnschedule = (stepId: string, orderId: string) => {
    const parentOrder = orders.find(o => o.id === orderId);
    if (!parentOrder) return;

    const updatedProducts = parentOrder.products.map(prod => {
      const stepIdx = prod.steps.findIndex(s => s.id === stepId);
      if (stepIdx !== -1) {
        const updatedSteps = prod.steps.map((step, idx) => {
          if (idx === stepIdx) {
            return {
              ...step,
              scheduledDate: undefined,
              scheduledStartHour: undefined,
              assignedOperatorId: undefined,
              status: 'pending' as OrderStatus
            };
          }
          return step;
        });
        return { ...prod, steps: updatedSteps };
      }
      return prod;
    });

    updateOrder(orderId, { products: updatedProducts });
    setSelectedStepToSchedule(null);
  };

  // Helper to get slot capacity warnings
  const getSlotWarnings = (wsId: string, dateStr: string) => {
    return conflicts.filter((c) => c.workstationId === wsId && c.date === dateStr);
  };

  const getPriorityBorder = (prio: string) => {
    switch (prio) {
      case 'critical': return 'border-l-4 border-l-rose-500 bg-rose-50/70 hover:bg-rose-100/80 dark:bg-rose-955/20 dark:hover:bg-rose-900/30';
      case 'high': return 'border-l-4 border-l-amber-500 bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-955/20 dark:hover:bg-amber-900/30';
      case 'medium': return 'border-l-4 border-l-blue-500 bg-blue-50/70 hover:bg-blue-100/80 dark:bg-blue-955/20 dark:hover:bg-blue-900/30';
      case 'low':
      default:
        return 'border-l-4 border-l-slate-400 bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-700/50';
    }
  };

  return (
    <div className={`space-y-5 animate-[fadeIn_0.3s_ease-out] ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-50 dark:bg-[#0c1017] p-6 overflow-y-auto' : ''}`}>
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight font-sans">
            Programador Operativo Gantt
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Línea de tiempo detallada a nivel de productos y sus respectivos puestos de taller
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Timeline Navigation */}
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 overflow-hidden shadow-sm">
            <button
              onClick={() => navigateTimeline('prev')}
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 transition-colors"
              title="Semana Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={resetToToday}
              className="px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors border-x border-slate-100 dark:border-slate-850"
            >
              Hoy
            </button>
            <button
              onClick={() => navigateTimeline('next')}
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 transition-colors"
              title="Semana Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={triggerAutoScheduling}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-md shadow-indigo-500/10"
            title="Auto-programar operaciones pendientes automáticamente"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            Auto-Programación
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl shadow-sm"
          >
            {isFullscreen ? 'Salir Pantalla Completa' : 'Pantalla Completa'}
          </button>
        </div>
      </div>

      {/* Gantt Grid Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Weekly Timeline view */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-white dark:bg-[#111723] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
            {/* Header Dates */}
            <div className="grid grid-cols-8 border-b border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/40 text-center">
              <div className="p-3 border-r border-slate-100 dark:border-slate-800/40 text-left">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">
                  Puesto / Máquina
                </span>
              </div>
              {timelineDates.map((dateStr) => {
                const label = formatDateLabel(dateStr);
                const isToday = dateStr === new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={dateStr}
                    className={`p-2.5 flex flex-col items-center justify-center border-r last:border-r-0 border-slate-100 dark:border-slate-800/40 ${
                      isToday ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    <span className={`text-[10px] font-extrabold uppercase ${isToday ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}>
                      {label.dayName}
                    </span>
                    <span className={`text-sm font-black mt-0.5 tracking-tight ${isToday ? 'text-indigo-500 font-extrabold' : 'text-slate-700 dark:text-slate-200'}`}>
                      {label.dayNum}
                    </span>
                    <span className="text-[8px] text-slate-400 dark:text-slate-650 uppercase font-semibold">
                      {label.monthName}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Grid rows by Workstation */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {workstations.map((ws) => (
                <div key={ws.id} className="grid grid-cols-8 min-h-[120px] hover:bg-slate-50/20 dark:hover:bg-slate-800/5 transition-colors">
                  
                  {/* Left Column: Workstation details */}
                  <div className="p-3.5 border-r border-slate-100 dark:border-slate-800/40 flex flex-col justify-between bg-slate-50/15 dark:bg-slate-900/10">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">
                        {ws.name}
                      </h4>
                      <span className="text-[9px] text-slate-400 dark:text-slate-550 font-bold block mt-1">
                        Carga: {ws.dailyCapacityHours}h/día
                      </span>
                    </div>
                    <Badge type="workstationStatus" value={ws.status} className="mt-2 w-max text-[9px] py-0 px-2" />
                  </div>

                  {/* 7 Calendar cells */}
                  {timelineDates.map((dateStr) => {
                    const slotSteps = getStepsForSlot(ws.id, dateStr);
                    const slotWarnings = getSlotWarnings(ws.id, dateStr);
                    const isToday = dateStr === new Date().toISOString().split('T')[0];

                    return (
                      <div
                        key={dateStr}
                        className={`p-1.5 border-r last:border-r-0 border-slate-100 dark:border-slate-800/40 flex flex-col gap-1.5 min-h-[110px] overflow-y-auto relative ${
                          isToday ? 'bg-indigo-50/10 dark:bg-indigo-950/5' : ''
                        }`}
                      >
                        {/* Overload Saturation Alerts */}
                        {slotWarnings.length > 0 && (
                          <div className="absolute top-1 right-1 z-10 p-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded-full cursor-help shadow-sm animate-pulse-subtle" title={slotWarnings[0].message}>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          </div>
                        )}

                        {/* Operation Step Pills inside Calendar cell */}
                        {slotSteps.map((step) => (
                          <div
                            key={step.id}
                            onClick={() => openSchedulingEditor(step)}
                            className={`p-2 rounded-lg border border-slate-100 dark:border-slate-850/80 cursor-pointer shadow-sm transition-all hover:scale-[1.02] flex flex-col gap-1 ${getPriorityBorder(
                              step.priority
                            )}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-black text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-1 py-0.5 rounded">
                                {step.orderId}
                              </span>
                              <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500">
                                {step.scheduledStartHour ?? 8}:00 ({step.estimatedHours}h)
                              </span>
                            </div>
                            <h5 className="text-[10px] font-bold text-slate-700 dark:text-slate-350 truncate leading-snug" title={step.productName}>
                              {step.productName}
                            </h5>
                            
                            {/* Overdue alert */}
                            {step.dueDate && new Date(step.scheduledDate!) > new Date(step.dueDate) && (
                              <span className="text-[6.5px] font-black uppercase text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1 py-0.5 rounded w-max">
                                Retrasado
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Unscheduled Steps Sidebar (Right Column) */}
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-[#111723] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-500" />
                Operaciones sin Programar ({unscheduledSteps.length})
              </h3>
              <p className="text-[9.5px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                Haz clic en una operación en cola para programarle fecha, hora y operario.
              </p>
            </div>

            {/* List of pending operations */}
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {unscheduledSteps.length > 0 ? (
                unscheduledSteps.map((step) => {
                  const ws = workstations.find(w => w.id === step.workstationId);

                  return (
                    <div
                      key={step.id}
                      onClick={() => openSchedulingEditor(step)}
                      className="p-3 bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/60 rounded-xl cursor-pointer hover:border-indigo-400/50 dark:hover:border-indigo-500/50 transition-all flex flex-col gap-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black text-slate-850 dark:text-slate-200 bg-slate-200/60 dark:bg-slate-800 px-1 py-0.5 rounded">
                            {step.orderId}
                          </span>
                          <span className="text-[8px] font-bold text-slate-450 uppercase">
                            {ws ? ws.name.split(' ').slice(-2).join(' ') : 'Sin máquina'}
                          </span>
                        </div>
                        <Badge type="priority" value={step.priority} className="text-[8px] py-0 px-2" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 leading-tight group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                          {step.productName}
                        </h4>
                        <p className="text-[9px] text-slate-400 dark:text-slate-550 truncate mt-0.5">
                          Cliente: {step.clientName}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500 font-bold border-t border-slate-100 dark:border-slate-800/20 pt-1.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Est: {step.estimatedHours}h
                        </span>
                        <span>
                          Vence: {step.dueDate}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs font-medium border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  Todas las celdas operacionales han sido programadas.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Schedule Dialog */}
      <Modal
        isOpen={selectedStepToSchedule !== null}
        onClose={() => setSelectedStepToSchedule(null)}
        title={selectedStepToSchedule ? `Programar Operación: [${selectedStepToSchedule.orderId}]` : 'Programar Paso'}
        size="md"
      >
        {selectedStepToSchedule && (
          <form onSubmit={handleApplySchedule} className="space-y-4 font-sans text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl space-y-2 border border-slate-200/40 dark:border-slate-800">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-700 dark:text-slate-350">
                  📦 {selectedStepToSchedule.productName} (x{selectedStepToSchedule.quantity})
                </span>
                <Badge type="priority" value={selectedStepToSchedule.priority} />
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                Cliente: <strong>{selectedStepToSchedule.clientName}</strong>
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-450 dark:text-slate-500 font-bold pt-1 border-t border-slate-100 dark:border-slate-800/30">
                <span>Duración: {selectedStepToSchedule.estimatedHours} horas</span>
                <span>Límite de OP: {selectedStepToSchedule.dueDate}</span>
              </div>
            </div>

            <div className="space-y-3">
              {/* Target Workstation */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Puesto de Trabajo para esta Tarea *
                </label>
                <select
                  required
                  value={targetWorkstation}
                  onChange={(e) => setTargetWorkstation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 focus:ring-1 focus:ring-indigo-500 outline-none text-xs dark:text-slate-100"
                >
                  <option value="">Selecciona puesto...</option>
                  {workstations.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.dailyCapacityHours}h/día)
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Date */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Fecha Programada de Ejecución *
                </label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 focus:ring-1 focus:ring-indigo-500 outline-none text-xs dark:text-slate-100"
                />
              </div>

              {/* Start hour slider */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Hora de Inicio Programada (0-23)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="23"
                    step="1"
                    value={targetHour}
                    onChange={(e) => setTargetHour(parseInt(e.target.value, 10))}
                    className="w-full"
                  />
                  <span className="font-bold text-slate-700 dark:text-slate-350 w-12 text-right">
                    {targetHour}:00
                  </span>
                </div>
              </div>

              {/* Target Operator (Post-Assignment optional!) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Asignar Operario Encargado (Opcional)
                </label>
                <select
                  value={targetOperator}
                  onChange={(e) => setTargetOperator(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 focus:ring-1 focus:ring-indigo-500 outline-none text-xs dark:text-slate-200"
                >
                  <option value="">No Asignado</option>
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.name} ({op.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              {/* Unschedule button if step is currently on timeline */}
              {selectedStepToSchedule.scheduledDate && (
                <button
                  type="button"
                  onClick={() => handleUnschedule(selectedStepToSchedule.id, selectedStepToSchedule.orderId)}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-955/20 dark:hover:bg-rose-900/30 dark:text-rose-350 border border-rose-100/50 dark:border-rose-900/30 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Remover del Gantt
                </button>
              )}
              
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setSelectedStepToSchedule(null)}
                  className="px-4 py-2 border border-slate-250 dark:border-slate-850 rounded-xl text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-500/10"
                >
                  Guardar Programación
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
