import type { ProductionOrder, Workstation, OrderProductStep } from '../types';

/**
 * Exports all active production steps to CSV file format (compatible with Excel in Spanish).
 */
export const exportToCSV = (orders: ProductionOrder[], workstations: Workstation[]) => {
  const workstationMap = workstations.reduce((map, ws) => {
    map[ws.id] = ws.name;
    return map;
  }, {} as { [id: string]: string });

  const headers = [
    'ID de OP',
    'Cliente',
    'Producto',
    'Cantidad',
    'Operación / Puesto de Trabajo',
    'Horas Estimadas',
    'Fecha Límite OP',
    'Estado Operación',
    'Fecha Programada',
    'Hora Inicio Programada',
    'Operario Asignado'
  ];

  const statusLabels = {
    pending: 'PENDIENTE',
    scheduled: 'PROGRAMADO',
    in_production: 'EN PRODUCCIÓN',
    paused: 'PAUSADO',
    completed: 'COMPLETADO',
    delayed: 'RETRASADO'
  };

  // Flatten all steps
  const allSteps: OrderProductStep[] = orders.flatMap(o => 
    o.products.flatMap(p => p.steps)
  );

  const rows = allSteps.map(step => [
    step.orderId,
    step.clientName,
    step.productName,
    step.quantity,
    workstationMap[step.workstationId] || step.workstationId,
    step.estimatedHours,
    step.dueDate,
    statusLabels[step.status] || step.status.toUpperCase(),
    step.scheduledDate || 'No Programado',
    step.scheduledStartHour !== undefined ? `${step.scheduledStartHour}:00` : 'No Asignada',
    step.assignedOperatorId || 'Sin Asignar'
  ]);

  const csvContent = [
    headers.join(';'),
    ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
  ].join('\n');

  // Excel UTF-8 BOM (Byte Order Mark)
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Reporte_Planificacion_Manufactura_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Creates an elegant HTML print preview window for multi-product routes and triggers PDF printing.
 */
export const printSchedule = (orders: ProductionOrder[], workstations: Workstation[]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const todayStr = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  
  const workstationMap = workstations.reduce((map, ws) => {
    map[ws.id] = ws.name;
    return map;
  }, {} as { [id: string]: string });

  const priorityLabels = {
    critical: 'CRÍTICA',
    high: 'ALTA',
    medium: 'MEDIA',
    low: 'BAJA'
  };

  const statusLabels = {
    pending: 'PENDIENTE',
    scheduled: 'PROGRAMADO',
    in_production: 'EN PRODUCCIÓN',
    paused: 'PAUSADO',
    completed: 'COMPLETADO',
    delayed: 'RETRASADO'
  };

  // Flatten active steps (not completed)
  const activeSteps: OrderProductStep[] = orders
    .filter(o => o.products.some(p => p.steps.some(s => s.status !== 'completed')))
    .flatMap(o => o.products.flatMap(p => p.steps.filter(s => s.status !== 'completed')));

  const stepsHtml = activeSteps.map(s => `
    <tr>
      <td><strong>${s.orderId}</strong></td>
      <td>${s.clientName}</td>
      <td><strong>${s.productName}</strong> (x${s.quantity})</td>
      <td>${workstationMap[s.workstationId] || s.workstationId}</td>
      <td style="text-align: center;">${s.estimatedHours}h</td>
      <td style="text-align: center;"><span class="priority priority-${s.priority}">${priorityLabels[s.priority]}</span></td>
      <td>${s.dueDate}</td>
      <td>${s.scheduledDate ? `${s.scheduledDate} a las ${s.scheduledStartHour ?? 8}:00` : '<em style="color:#94a3b8">No Programado</em>'}</td>
      <td><span class="status status-${s.status}">${statusLabels[s.status]}</span></td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <html>
      <head>
        <title>Reporte de Hojas de Ruta Operativas - MES</title>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; color: #1e293b; margin: 40px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155; padding-bottom: 20px; margin-bottom: 30px; }
          .logo-text { font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
          .sub-logo { font-size: 12px; color: #64748b; font-weight: 550; margin-top: 3px; }
          .meta { font-size: 12px; color: #475569; text-align: right; }
          h2 { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 30px; margin-bottom: 15px; border-left: 4px solid #334155; padding-left: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #f8fafc; text-align: left; padding: 10px 12px; font-size: 10px; font-weight: 700; color: #475569; border-bottom: 2px solid #cbd5e1; text-transform: uppercase; }
          td { padding: 10px 12px; font-size: 11px; border-bottom: 1px solid #e2e8f0; }
          .priority { font-size: 9px; font-weight: 850; padding: 2px 6px; border-radius: 4px; display: inline-block; }
          .priority-critical { background: #fee2e2; color: #991b1b; }
          .priority-high { background: #ffedd5; color: #9a3412; }
          .priority-medium { background: #fef9c3; color: #854d0e; }
          .priority-low { background: #f0fdf4; color: #166534; }
          .status { font-size: 9px; font-weight: 850; padding: 2px 6px; border-radius: 4px; display: inline-block; }
          .status-pending { background: #f1f5f9; color: #475569; }
          .status-scheduled { background: #e0f2fe; color: #0369a1; }
          .status-in_production { background: #dcfce7; color: #166534; }
          .status-paused { background: #fef9c3; color: #854d0e; }
          .status-delayed { background: #fee2e2; color: #991b1b; }
          .footer { margin-top: 60px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          @media print {
            body { margin: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo-text">MES - SISTEMA DE PROGRAMACIÓN DE MANUFACTURA</div>
            <div class="sub-logo">Reporte de Hojas de Ruta Operativas y Planificación de Celdas</div>
          </div>
          <div class="meta">
            <div>Fecha de Emisión: <strong>${todayStr}</strong></div>
            <div>Operaciones Activas en Cola: <strong>${activeSteps.length}</strong></div>
          </div>
        </div>

        <h2>Desglose Operativo por Productos</h2>
        <table>
          <thead>
            <tr>
              <th>OP</th>
              <th>Cliente</th>
              <th>Producto (Cantidad)</th>
              <th>Puesto / Operación</th>
              <th style="text-align: center;">Horas</th>
              <th style="text-align: center;">Prioridad</th>
              <th>Vence OP</th>
              <th>Fecha Programada</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${stepsHtml.length > 0 ? stepsHtml : '<tr><td colspan="9" style="text-align: center; color: #94a3b8;">No hay operaciones activas programadas en este momento.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          MES - Software de Manufactura Local y Control Operativo • Impreso Oficial
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
