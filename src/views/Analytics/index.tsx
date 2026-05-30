import React from 'react';
import { useApp } from '../../context/AppContext';
import { ThroughputLineChart, PriorityDonutChart } from '../../components/charts/DynamicSVGCharts';
import { 
  TrendingUp, Award, Clock, AlertTriangle, Layers, Percent, BarChart3, Activity 
} from 'lucide-react';
import Table, { TableHeader, TableRow } from '../../components/ui/Table';

export const Analytics: React.FC = () => {
  const { orders, workstations } = useApp();

  // Basic math calculation
  const totalOrders = orders.length;
  const completed = orders.filter((o) => o.status === 'completed').length;
  const delayed = orders.filter(
    (o) => o.status === 'delayed' || (o.status !== 'completed' && o.dueDate && new Date(o.dueDate + 'T00:00:00') < new Date(new Date().toISOString().split('T')[0] + 'T00:00:00'))
  ).length;

  // On-time delivery rate
  // Completed on-time vs delayed
  const onTimeRate = completed + delayed > 0 
    ? Math.round((completed / (completed + delayed)) * 100) 
    : 100;

  // Mean duration of production - sum all step hours across all orders
  const totalHours = orders.reduce((sum, o) => {
    const orderHours = o.products.reduce((pSum, p) => {
      const productHours = p.steps.reduce((sSum, s) => sSum + s.estimatedHours, 0);
      return pSum + productHours;
    }, 0);
    return sum + orderHours;
  }, 0);
  const averageHours = totalOrders > 0 ? Math.round(totalHours / totalOrders) : 0;

  // Identify Bottlenecks: Puestos con mayor número de horas programadas y con retrasos
  const bottleneckAnalysis = workstations.map((ws) => {
    // Get all steps assigned to this workstation that aren't completed
    const wsSteps = orders
      .flatMap(o => o.products.flatMap(p => p.steps))
      .filter(s => s.workstationId === ws.id && s.status !== 'completed');
    const bookedHours = wsSteps.reduce((sum, s) => sum + s.estimatedHours, 0);
    const delayedCount = wsSteps.filter((s) => s.status === 'delayed').length;
    
    let saturationLevel = 'bajo';
    let saturationPercent = ws.dailyCapacityHours > 0 ? (bookedHours / (ws.dailyCapacityHours * 5)) * 100 : 0; // weekly
    if (saturationPercent > 80) saturationLevel = 'crítico';
    else if (saturationPercent > 50) saturationLevel = 'medio';

    return {
      id: ws.id,
      name: ws.name,
      bookedHours,
      delayedCount,
      saturationPercent: Math.round(saturationPercent),
      saturationLevel
    };
  }).sort((a, b) => b.bookedHours - a.bookedHours);

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Title */}
      <div>
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight font-sans">
          Analíticas de Productividad
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          Métricas de desempeño, cuellos de botella de planta e informes de throughput
        </p>
      </div>

      {/* Ratios Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* On Time Rate */}
        <div className="p-5 bg-white dark:bg-[#111723] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Entregas a Tiempo</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-500">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-sans">{onTimeRate}%</h3>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
              <Percent className="w-3 h-3" />
              Tasa de cumplimiento operativa
            </div>
          </div>
        </div>

        {/* Avg duration */}
        <div className="p-5 bg-white dark:bg-[#111723] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Duración Promedio</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-500">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-sans">{averageHours}h</h3>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
              <Activity className="w-3 h-3" />
              Por orden de manufactura
            </div>
          </div>
        </div>

        {/* Total Hours Booked */}
        <div className="p-5 bg-white dark:bg-[#111723] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Horas Planificadas</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-500">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-sans">{totalHours}h</h3>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
              <TrendingUp className="w-3 h-3" />
              Carga total histórica del taller
            </div>
          </div>
        </div>

        {/* Bottlenecks Indicator */}
        <div className="p-5 bg-white dark:bg-[#111723] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Riesgos Críticos</span>
            <div className={`p-2 rounded-xl ${delayed > 0 ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-sans">{delayed}</h3>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
              <AlertTriangle className="w-3 h-3" />
              Órdenes operativas retrasadas
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Throughput chart */}
        <div className="p-6 bg-white dark:bg-[#111723] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Rendimiento Semanal (Throughput)
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Cantidad de órdenes completadas por día</p>
          </div>
          <div className="mt-4 flex-grow flex items-center justify-center">
            <ThroughputLineChart orders={orders} />
          </div>
        </div>

        {/* Priority distribution */}
        <div className="p-6 bg-white dark:bg-[#111723] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              Composición por Nivel de Prioridad
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Órdenes operativas agrupadas por criticidad</p>
          </div>
          <div className="mt-4 flex-grow flex items-center">
            <PriorityDonutChart orders={orders} />
          </div>
        </div>
      </div>

      {/* Bottleneck analysis list */}
      <div className="p-6 bg-white dark:bg-[#111723] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            Análisis de Saturación y Cuellos de Botella
          </h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
            Diagnóstico preventivo de puestos de trabajo propensos a demoras por sobrecarga
          </p>
        </div>

        <div className="mt-4">
          <Table>
            <TableHeader>
              <th className="py-2.5">Puesto de Trabajo</th>
              <th className="py-2.5 text-center">Horas en Cola</th>
              <th className="py-2.5 text-center">Uso de Capacidad Semanal</th>
              <th className="py-2.5 text-center">Órdenes Afectadas</th>
              <th className="py-2.5 text-center">Riesgo de Cuello de Botella</th>
            </TableHeader>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
              {bottleneckAnalysis.map((item) => (
                <TableRow key={item.id}>
                  <td className="py-3 font-bold text-slate-700 dark:text-slate-350">{item.name}</td>
                  <td className="py-3 text-center font-bold text-slate-800 dark:text-slate-200">{item.bookedHours} horas</td>
                  <td className="py-3 text-center font-semibold">
                    <span className={item.saturationPercent > 80 ? 'text-rose-500 font-extrabold' : 'text-slate-650 dark:text-slate-300'}>
                      {item.saturationPercent}%
                    </span>
                  </td>
                  <td className="py-3 text-center font-bold text-slate-700 dark:text-slate-300">{item.delayedCount} retrasadas</td>
                  <td className="py-3 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                      item.saturationLevel === 'crítico' 
                        ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-350 dark:border-rose-900/40 animate-pulse-subtle' 
                        : item.saturationLevel === 'medio'
                        ? 'bg-amber-105 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40'
                    }`}>
                      {item.saturationLevel}
                    </span>
                  </td>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
};
