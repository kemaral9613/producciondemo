import React from 'react';
import { useApp } from '../../context/AppContext';
import type { ProductionOrder, OrderProductStep } from '../../types';
import { CapacityGauge, WorkloadBarChart } from '../../components/charts/DynamicSVGCharts';
import { ClipboardList, AlertCircle, Play, CheckCircle2, TrendingUp, Calendar, Zap, AlertTriangle } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

export const Dashboard: React.FC = () => {
  const { 
    orders, 
    workstations, 
    conflicts, 
    triggerAutoScheduling, 
    setActiveView 
  } = useApp();

  // Helper to determine order completion
  const getOrderCompletion = (order: ProductionOrder) => {
    const steps = order.products.flatMap(p => p.steps);
    if (steps.length === 0) return false;
    return steps.every(s => s.status === 'completed');
  };

  // Helper to determine if an order has delayed steps or is overdue
  const isOrderDelayed = (order: ProductionOrder) => {
    const steps = order.products.flatMap(p => p.steps);
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr + 'T00:00:00');
    
    return steps.some(s => 
      s.status === 'delayed' || 
      (s.status !== 'completed' && s.dueDate && new Date(s.dueDate + 'T00:00:00') < today)
    );
  };

  // Helper to determine if an order is in production
  const isOrderInProgress = (order: ProductionOrder) => {
    return order.products.flatMap(p => p.steps).some(s => s.status === 'in_production');
  };

  // Helper to compute overall dynamic order status
  const getOrderStatus = (order: ProductionOrder): string => {
    const steps = order.products.flatMap(p => p.steps);
    if (steps.length === 0) return 'pending';
    
    if (steps.every(s => s.status === 'completed')) return 'completed';
    if (isOrderDelayed(order)) return 'delayed';
    if (steps.some(s => s.status === 'in_production')) return 'in_production';
    if (steps.some(s => s.status === 'paused')) return 'paused';
    if (steps.some(s => s.status === 'scheduled')) return 'scheduled';
    return 'pending';
  };

  // Metric calculations
  const totalActive = orders.filter((o) => !getOrderCompletion(o)).length;
  const delayed = orders.filter((o) => !getOrderCompletion(o) && isOrderDelayed(o)).length;
  const inProgress = orders.filter((o) => isOrderInProgress(o)).length;
  const completed = orders.filter((o) => getOrderCompletion(o)).length;

  // Calculate dynamic weekly capacity usage based on active scheduled steps
  const allActiveSteps = orders.flatMap(o => o.products.flatMap(p => p.steps)).filter(s => s.status !== 'completed');
  const scheduledSteps = allActiveSteps.filter(s => s.workstationId && s.scheduledDate);
  const totalBookedHours = scheduledSteps.reduce((sum, s) => sum + s.estimatedHours, 0);
  const totalWorkstationCapacity = workstations.reduce((sum, w) => sum + w.dailyCapacityHours * 5, 0);
  const capacityPercentage = totalWorkstationCapacity > 0 
    ? (totalBookedHours / totalWorkstationCapacity) * 100 
    : 0;

  // Next upcoming deliveries (sorted by due date, incomplete only)
  const upcomingDeliveries = [...orders]
    .filter((o) => !getOrderCompletion(o) && o.dueDate)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Top Welcome Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-industrial-900 text-white rounded-2xl shadow-lg dark:border dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-black font-sans tracking-tight">Panel de Control Operativo</h2>
          <p className="text-xs text-slate-300 mt-1 font-medium">
            Planificación y Monitoreo del Taller de Manufactura en Tiempo Real (APS/MES)
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={triggerAutoScheduling}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20"
          >
            <Zap className="w-4 h-4 fill-current" />
            Auto-Programar Pasos
          </button>
          <button
            onClick={() => setActiveView('scheduling')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 active:scale-95 transition-all text-xs font-bold rounded-xl border border-slate-600"
          >
            <Calendar className="w-4 h-4" />
            Ver Línea de Tiempo
          </button>
        </div>
      </div>

      {/* Conflicts and Alerts Bar */}
      {conflicts.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-800 dark:text-rose-300 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider">Alertas de Conflicto Activas ({conflicts.length})</h4>
            <p className="text-xs mt-1 leading-relaxed">
              Se han detectado sobrecargas o superposiciones en la programación de puestos de trabajo. Visita el planificador para resolverlos manualmente o ejecuta la Auto-Programación.
            </p>
          </div>
        </div>
      )}

      {/* Grid de KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Activas */}
        <div 
          onClick={() => setActiveView('orders')}
          className="p-5 bg-white dark:bg-[#111723] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Órdenes Activas</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-sans">{totalActive}</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Pedidos incompletos en planta</p>
          </div>
        </div>

        {/* KPI: Retrasadas */}
        <div 
          onClick={() => setActiveView('orders')}
          className="p-5 bg-white dark:bg-[#111723] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Demoradas</span>
            <div className={`p-2 rounded-xl group-hover:scale-110 transition-transform ${delayed > 0 ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500' : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400'}`}>
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className={`text-2xl font-black font-sans ${delayed > 0 ? 'text-rose-500 dark:text-rose-450' : 'text-slate-800 dark:text-slate-100'}`}>{delayed}</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Órdenes con fechas vencidas</p>
          </div>
        </div>

        {/* KPI: En Producción */}
        <div 
          onClick={() => setActiveView('orders')}
          className="p-5 bg-white dark:bg-[#111723] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">En Proceso</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 fill-current" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-sans">{inProgress}</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Operaciones en ejecución</p>
          </div>
        </div>

        {/* KPI: Completadas */}
        <div 
          onClick={() => setActiveView('orders')}
          className="p-5 bg-white dark:bg-[#111723] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Completadas</span>
            <div className="p-2 bg-teal-50 dark:bg-teal-950/40 rounded-xl text-teal-500 dark:text-teal-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-sans">{completed}</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Lotes de productos finalizados</p>
          </div>
        </div>
      </div>

      {/* Sección Gráficos y Capacidad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carga por Puesto (Bar Chart) */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-[#111723] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Carga Semanal de Puestos</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Horas programadas vs. capacidad semanal</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-semibold bg-slate-50 dark:bg-slate-900/50 px-2 py-1 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5" />
              Lunes - Viernes
            </div>
          </div>
          <div className="flex-grow flex items-end">
            <WorkloadBarChart workstations={workstations} orders={orders} />
          </div>
        </div>

        {/* Uso de Capacidad Global (Gauge) */}
        <div className="p-6 bg-white dark:bg-[#111723] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col items-center justify-between">
          <div className="w-full text-left">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Carga Global Semana</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Utilización consolidada del taller</p>
          </div>
          <CapacityGauge percentage={capacityPercentage} />
          <div className="text-center w-full mt-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-350">
              {totalBookedHours}h programadas de {totalWorkstationCapacity}h
            </p>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">Cálculo basado en 5 días de planta</span>
          </div>
        </div>
      </div>

      {/* Próximas Entregas */}
      <div className="p-6 bg-white dark:bg-[#111723] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Próximos Vencimientos de OP</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Pedidos activos ordenados por fecha de entrega</p>
          </div>
          <button 
            onClick={() => setActiveView('orders')}
            className="text-[10px] font-bold text-indigo-500 hover:text-indigo-650 hover:underline"
          >
            Ver todas las órdenes &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/40 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="py-2.5">OP</th>
                <th className="py-2.5">Cliente</th>
                <th className="py-2.5">Productos Integrados</th>
                <th className="py-2.5 text-center">Cant. Total</th>
                <th className="py-2.5 text-center">Prioridad</th>
                <th className="py-2.5 text-center">Carga Estimada</th>
                <th className="py-2.5">Vence el</th>
                <th className="py-2.5">Estado General</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
              {upcomingDeliveries.length > 0 ? (
                upcomingDeliveries.map((order) => {
                  const productNames = order.products.map(p => p.name).join(', ');
                  const totalQuantity = order.products.reduce((sum, p) => sum + p.quantity, 0);
                  const totalHours = order.products.flatMap(p => p.steps).reduce((sum, s) => sum + s.estimatedHours, 0);
                  const overallStatus = getOrderStatus(order);

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{order.id}</td>
                      <td className="py-3 font-semibold text-slate-700 dark:text-slate-350">{order.clientName}</td>
                      <td className="py-3 text-slate-650 dark:text-slate-400 truncate max-w-xs" title={productNames}>
                        {productNames}
                      </td>
                      <td className="py-3 text-center text-slate-800 dark:text-slate-100 font-extrabold">{totalQuantity}</td>
                      <td className="py-3 text-center">
                        <Badge type="priority" value={order.priority} />
                      </td>
                      <td className="py-3 text-center font-semibold text-slate-700 dark:text-slate-350">{totalHours}h</td>
                      <td className="py-3 font-bold text-slate-700 dark:text-slate-300">{order.dueDate}</td>
                      <td className="py-3">
                        <Badge type="status" value={overallStatus} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400 dark:text-slate-500 font-medium">
                    No hay órdenes activas pendientes por entregar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
