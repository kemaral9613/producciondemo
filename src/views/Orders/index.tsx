import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { ProductionOrder, OrderProduct, OrderProductStep, PriorityLevel, OrderStatus } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { exportToCSV, printSchedule } from '../../utils/exportUtils';
import { 
  Plus, Search, Edit2, Copy, Trash2, Download, Upload, Filter, Calendar, Users, 
  Settings, RefreshCw, Layers, ChevronDown, ChevronUp, PlusCircle, Trash, X 
} from 'lucide-react';

export const Orders: React.FC = () => {
  const {
    orders,
    workstations,
    operators,
    addOrder,
    updateOrder,
    deleteOrder,
    duplicateOrder,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    filterPriority,
    setFilterPriority,
    filterWorkstation,
    setFilterWorkstation,
    exportDatabase,
    importDatabase,
    resetSystem,
    toast
  } = useApp();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProductionOrder | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [orderToDeleteId, setOrderToDeleteId] = useState<string | null>(null);

  // Form State
  const [clientName, setClientName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [notes, setNotes] = useState('');
  
  // Multi-product form state:
  const [formProducts, setFormProducts] = useState<any[]>([
    { name: '', quantity: 1, steps: [{ workstationId: '', estimatedHours: 8 }] }
  ]);

  const toggleRowExpansion = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  const openCreateModal = () => {
    setEditingOrder(null);
    setClientName('');
    setPriority('medium');
    setDueDate(new Date(Date.now() + 3 * 24 * 3600000).toISOString().split('T')[0]); // 3 days from now
    setNotes('');
    setFormProducts([
      { name: '', quantity: 1, steps: [{ workstationId: workstations[0]?.id || '', estimatedHours: 8 }] }
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (order: ProductionOrder) => {
    setEditingOrder(order);
    setClientName(order.clientName);
    setPriority(order.priority);
    setDueDate(order.dueDate);
    setNotes(order.notes || '');
    
    // Deep clone products and steps for editing
    const clonedProds = order.products.map(p => ({
      name: p.name,
      quantity: p.quantity,
      steps: p.steps.map(s => ({
        workstationId: s.workstationId,
        estimatedHours: s.estimatedHours,
        assignedOperatorId: s.assignedOperatorId || '',
        status: s.status,
        id: s.id
      }))
    }));
    setFormProducts(clonedProds);
    setIsModalOpen(true);
  };

  // Form actions
  const handleAddProduct = () => {
    setFormProducts([
      ...formProducts, 
      { name: '', quantity: 1, steps: [{ workstationId: workstations[0]?.id || '', estimatedHours: 8 }] }
    ]);
  };

  const handleRemoveProduct = (pIdx: number) => {
    if (formProducts.length === 1) {
      toast.show('La OP debe contener al menos un producto', 'warning');
      return;
    }
    setFormProducts(formProducts.filter((_, idx) => idx !== pIdx));
  };

  const handleProductChange = (pIdx: number, field: string, value: any) => {
    const updated = [...formProducts];
    updated[pIdx] = { ...updated[pIdx], [field]: value };
    setFormProducts(updated);
  };

  const handleAddStep = (pIdx: number) => {
    const updated = [...formProducts];
    updated[pIdx].steps = [
      ...updated[pIdx].steps, 
      { workstationId: workstations[0]?.id || '', estimatedHours: 8 }
    ];
    setFormProducts(updated);
  };

  const handleRemoveStep = (pIdx: number, sIdx: number) => {
    const updated = [...formProducts];
    if (updated[pIdx].steps.length === 1) {
      toast.show('El producto debe requerir al menos una operación/puesto de trabajo', 'warning');
      return;
    }
    updated[pIdx].steps = updated[pIdx].steps.filter((_, idx) => idx !== sIdx);
    setFormProducts(updated);
  };

  const handleStepChange = (pIdx: number, sIdx: number, field: string, value: any) => {
    const updated = [...formProducts];
    updated[pIdx].steps[sIdx] = { ...updated[pIdx].steps[sIdx], [field]: value };
    setFormProducts(updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !dueDate) {
      toast.show('Por favor completa los campos requeridos', 'error');
      return;
    }

    // Validate products and steps
    for (let pIdx = 0; pIdx < formProducts.length; pIdx++) {
      const prod = formProducts[pIdx];
      if (!prod.name || prod.quantity <= 0) {
        toast.show('Todos los productos deben tener nombre y cantidad válida', 'error');
        return;
      }
      for (let sIdx = 0; sIdx < prod.steps.length; sIdx++) {
        const step = prod.steps[sIdx];
        if (!step.workstationId || step.estimatedHours <= 0) {
          toast.show('Todas las operaciones requieren asignar máquina y tiempo estimado positivo', 'error');
          return;
        }
      }
    }

    // Prepare structure to save
    const productsData = formProducts.map(p => ({
      name: p.name,
      quantity: p.quantity,
      steps: p.steps.map((s: any) => ({
        workstationId: s.workstationId,
        estimatedHours: Number(s.estimatedHours),
        assignedOperatorId: s.assignedOperatorId || undefined,
        status: s.status || 'pending'
      }))
    }));

    const orderData = {
      clientName,
      dueDate,
      priority,
      notes,
      products: productsData as any
    };

    if (editingOrder) {
      updateOrder(editingOrder.id, orderData);
    } else {
      addOrder(orderData);
    }
    setIsModalOpen(false);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        importDatabase(result);
      }
    };
    reader.readAsText(file);
  };

  // Helper to determine order completion
  const getOrderCompletion = (order: ProductionOrder) => {
    const steps = order.products.flatMap(p => p.steps);
    if (steps.length === 0) return false;
    return steps.every(s => s.status === 'completed');
  };

  // Helper to determine if an order has delayed steps
  const isOrderDelayed = (order: ProductionOrder) => {
    const steps = order.products.flatMap(p => p.steps);
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr + 'T00:00:00');
    
    return steps.some(s => 
      s.status === 'delayed' || 
      (s.status !== 'completed' && s.dueDate && new Date(s.dueDate + 'T00:00:00') < today)
    );
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

  // Filtered orders logic
  const filteredOrders = orders.filter((o) => {
    const allSteps = o.products.flatMap(p => p.steps);
    const productNamesCombined = o.products.map(p => p.name).join(' ').toLowerCase();

    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      productNamesCombined.includes(searchQuery.toLowerCase());

    const overallStatus = getOrderStatus(o);
    const matchesStatus = filterStatus === 'all' || overallStatus === filterStatus;
    const matchesPriority = filterPriority === 'all' || o.priority === filterPriority;
    
    const matchesWorkstation = filterWorkstation === 'all' || 
      allSteps.some(s => s.workstationId === filterWorkstation);

    return matchesSearch && matchesStatus && matchesPriority && matchesWorkstation;
  });

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight font-sans">
            Órdenes de Producción
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Planificación jerárquica de pedidos multi-producto con rutas e hitos de producción
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all text-xs font-bold text-white rounded-xl shadow-md shadow-indigo-500/10"
          >
            <Plus className="w-4 h-4" />
            Nueva OP Jerárquica
          </button>
          
          <button
            onClick={() => exportToCSV(filteredOrders, workstations)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-805 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl shadow-sm"
            title="Exportar a CSV / Excel"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>

          <button
            onClick={() => printSchedule(orders, workstations)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-805 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl shadow-sm"
            title="Imprimir Hoja de Ruta"
          >
            Imprimir Ruta
          </button>

          <label className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-805 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl shadow-sm cursor-pointer">
            <Upload className="w-4 h-4" />
            Importar JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>

          <button
            onClick={exportDatabase}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-805 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl shadow-sm"
            title="Exportar base de datos"
          >
            Respaldo JSON
          </button>

          <button
            onClick={resetSystem}
            className="flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-955/20 dark:hover:bg-rose-900/30 dark:text-rose-350 text-xs font-bold rounded-xl border border-rose-100/50 dark:border-rose-900/30 shadow-sm"
            title="Reiniciar a datos por defecto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reiniciar
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="p-4 bg-white dark:bg-[#111723] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full md:flex-grow">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-550" />
            <input
              type="text"
              placeholder="Buscar por cliente, OP, o descripción de producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:text-slate-100 transition-all outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 w-full md:w-auto md:min-w-[400px]">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-350 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="all">Estado: Todos</option>
              <option value="pending">Pendiente</option>
              <option value="scheduled">Programado</option>
              <option value="in_production">En Producción</option>
              <option value="paused">Pausado</option>
              <option value="completed">Completado</option>
              <option value="delayed">Retrasado</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-2.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-350 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="all">Prioridad: Todas</option>
              <option value="critical">Crítica</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>

            <select
              value={filterWorkstation}
              onChange={(e) => setFilterWorkstation(e.target.value)}
              className="px-2.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-350 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="all">Puesto: Todos</option>
              {workstations.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders Listing */}
      <div className="bg-white dark:bg-[#111723] border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/40 text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider bg-slate-50 dark:bg-slate-900/20">
                <th className="px-5 py-3 w-10"></th>
                <th className="px-5 py-3">OP</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Productos Cargados</th>
                <th className="px-5 py-3 text-center">Cant. Total</th>
                <th className="px-5 py-3 text-center">Prioridad</th>
                <th className="px-5 py-3 text-center">Carga Total</th>
                <th className="px-5 py-3">Fecha Vencimiento</th>
                <th className="px-5 py-3">Estado General</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const productNames = order.products.map(p => p.name).join(', ');
                  const totalQty = order.products.reduce((sum, p) => sum + p.quantity, 0);
                  const totalHrs = order.products.flatMap(p => p.steps).reduce((sum, s) => sum + s.estimatedHours, 0);
                  const overallStatus = getOrderStatus(order);
                  const isExpanded = expandedOrderId === order.id;

                  // Delayed validation
                  const isOverdue = overallStatus !== 'completed' && order.dueDate && 
                                    new Date(order.dueDate + 'T00:00:00') < new Date(new Date().toISOString().split('T')[0] + 'T00:00:00');

                  return (
                    <React.Fragment key={order.id}>
                      <tr 
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/25 transition-colors cursor-pointer ${
                          isOverdue ? 'bg-rose-50/10 dark:bg-rose-950/5' : ''
                        }`}
                        onClick={() => toggleRowExpansion(order.id)}
                      >
                        <td className="px-5 py-4 text-center">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-850 dark:text-slate-100">
                          {order.id}
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300">
                          {order.clientName}
                        </td>
                        <td className="px-5 py-4 text-slate-650 dark:text-slate-400 font-semibold truncate max-w-xs" title={productNames}>
                          {order.products.length} productos ({productNames})
                        </td>
                        <td className="px-5 py-4 text-center text-slate-800 dark:text-slate-100 font-extrabold">
                          {totalQty}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <Badge type="priority" value={order.priority} />
                        </td>
                        <td className="px-5 py-4 text-center font-bold text-slate-750 dark:text-slate-350">
                          {totalHrs}h
                        </td>
                        <td className={`px-5 py-4 font-semibold ${isOverdue ? 'text-rose-500 font-extrabold' : 'text-slate-600 dark:text-slate-300'}`}>
                          {order.dueDate}
                          {isOverdue && <span className="block text-[8px] uppercase tracking-wider font-black text-rose-500">Demorada</span>}
                        </td>
                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <Badge type="status" value={overallStatus} />
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() => openEditModal(order)}
                              className="p-1.5 rounded-lg border border-slate-150 dark:border-slate-800 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all"
                              title="Editar OP"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => duplicateOrder(order.id)}
                              className="p-1.5 rounded-lg border border-slate-150 dark:border-slate-800 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all"
                              title="Duplicar OP"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setOrderToDeleteId(order.id);
                                setIsDeleteConfirmOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-slate-150 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                              title="Eliminar OP"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* COLLAPSIBLE DETAIL SUBTABLE */}
                      {isExpanded && (
                        <tr className="bg-slate-50/40 dark:bg-slate-900/10">
                          <td colSpan={10} className="px-10 py-4">
                            <div className="p-4 bg-slate-50/80 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/60 rounded-xl space-y-3 font-sans">
                              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                Detalle de Ruta por Producto (OP: {order.id})
                              </h4>
                              
                              <div className="space-y-4">
                                {order.products.map((prod, pIdx) => (
                                  <div key={prod.id} className="bg-white dark:bg-[#151c2a] p-3 rounded-lg border border-slate-150 dark:border-slate-800/40">
                                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/50">
                                      <span className="text-xs font-black text-slate-800 dark:text-slate-150">
                                        📦 {prod.name}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-500">
                                        Cantidad: <strong>{prod.quantity} unidades</strong>
                                      </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[10px]">
                                      {prod.steps.map((step, sIdx) => {
                                        const ws = workstations.find(w => w.id === step.workstationId);
                                        const op = operators.find(o => o.id === step.assignedOperatorId);

                                        return (
                                          <div key={step.id} className="p-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-850 rounded-lg flex flex-col justify-between gap-1.5">
                                            <div className="flex justify-between items-center font-bold">
                                              <span className="text-slate-600 dark:text-slate-350">
                                                🛠️ {ws ? ws.name : 'Puesto N/A'}
                                              </span>
                                              <Badge type="status" value={step.status} className="text-[8px] py-0 px-1.5" />
                                            </div>
                                            <div className="text-slate-500 flex justify-between items-center">
                                              <span>Carga: <strong>{step.estimatedHours}h</strong></span>
                                              <span>Fecha: <strong>{step.scheduledDate || 'Sin programar'}</strong></span>
                                            </div>
                                            <div className="text-[9px] text-slate-400 dark:text-slate-550 italic font-medium flex items-center gap-1 border-t border-slate-100 dark:border-slate-800/20 pt-1">
                                              <Users className="w-3 h-3 text-slate-400" />
                                              Operario: {op ? op.name : 'Sin asignar'}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-5 py-10 text-center text-slate-400 dark:text-slate-500 font-medium">
                    No se encontraron órdenes que coincidan con los filtros de búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => { setIsDeleteConfirmOpen(false); setOrderToDeleteId(null); }}
        title="Confirmar eliminación"
        size="sm"
      >
        <div className="space-y-4 text-xs">
          <p>¿Estás seguro de que deseas eliminar la Orden de Producción <strong>{orderToDeleteId}</strong> ? Esta acción no se puede deshacer.</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setIsDeleteConfirmOpen(false); setOrderToDeleteId(null); }}
              className="px-3 py-2 border rounded-xl text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                if (orderToDeleteId) {
                  deleteOrder(orderToDeleteId);
                }
                setIsDeleteConfirmOpen(false);
                setOrderToDeleteId(null);
              }}
              className="px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold"
            >
              Eliminar OP
            </button>
          </div>
        </div>
      </Modal>

      {/* Creation and Modification Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingOrder ? `Editar Orden de Producción ${editingOrder.id}` : 'Crear Orden de Producción'}
        size="xl"
      >
        <form onSubmit={handleSave} className="space-y-4 font-sans text-xs">
          {/* Header metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/40 dark:border-slate-800/50">
            <div>
              <label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1">
                Nombre del Cliente *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Industrias Aceradas SAS"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1">
                Fecha Límite de Entrega OP *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1">
                Prioridad General de OP *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1">
                Comentarios y Observaciones Generales
              </label>
              <textarea
                placeholder="Indique detalles especiales del lote o requerimientos de calidad..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={1.5}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* DYNAMIC PRODUCTS AND OPERATIONS BUILDER */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Desglose de Productos y Rutas de Producción ({formProducts.length})
              </h3>
              
              <button
                type="button"
                onClick={handleAddProduct}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-[10px] font-bold rounded-lg border border-indigo-100/50 dark:border-indigo-850"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Añadir Producto
              </button>
            </div>

            {/* Products cards container */}
            <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
              {formProducts.map((prod, pIdx) => (
                <div 
                  key={pIdx} 
                  className="p-4 bg-white dark:bg-[#151c2a] rounded-xl border border-slate-150 dark:border-slate-850 shadow-sm relative space-y-3"
                >
                  {/* Remove product button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveProduct(pIdx)}
                    className="absolute top-3.5 right-3.5 text-slate-400 hover:text-rose-500 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Remover Producto"
                  >
                    <Trash className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pr-8">
                    {/* Nombre del Producto */}
                    <div className="md:col-span-2">
                      <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        Nombre del Producto *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Bandejas cribadoras de acero"
                        value={prod.name}
                        onChange={(e) => handleProductChange(pIdx, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-xs focus:ring-1 focus:ring-indigo-500 outline-none dark:text-slate-100"
                      />
                    </div>

                    {/* Cantidad a fabricar */}
                    <div>
                      <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        Cantidad *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="1"
                        value={prod.quantity}
                        onChange={(e) => handleProductChange(pIdx, 'quantity', parseInt(e.target.value, 10) || 1)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-xs focus:ring-1 focus:ring-indigo-500 outline-none dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Operations Steps Builder inside this Product */}
                  <div className="pl-4 border-l-2 border-slate-100 dark:border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Ruta Operativa (Pasos / Máquinas)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddStep(pIdx)}
                        className="text-[9px] font-black text-indigo-500 hover:text-indigo-650 hover:underline flex items-center gap-0.5"
                      >
                        + Agregar Puesto / Operación
                      </button>
                    </div>

                    {/* Steps list */}
                    <div className="space-y-1.5">
                      {prod.steps.map((step: any, sIdx: number) => (
                        <div key={sIdx} className="flex items-center gap-3 bg-slate-50/45 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850">
                          
                          <span className="font-bold text-slate-400 text-[10px] w-6">
                            #{sIdx + 1}
                          </span>

                          {/* Workstation Selector */}
                          <div className="flex-grow">
                            <select
                              required
                              value={step.workstationId}
                              onChange={(e) => handleStepChange(pIdx, sIdx, 'workstationId', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 dark:text-slate-200"
                            >
                              <option value="">Selecciona máquina...</option>
                              {workstations.map(w => (
                                <option key={w.id} value={w.id}>
                                  {w.name} ({w.dailyCapacityHours}h/día)
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Duration Hours */}
                          <div className="w-32">
                            <input
                              type="number"
                              required
                              min="1"
                              placeholder="Carga (h)"
                              value={step.estimatedHours}
                              onChange={(e) => handleStepChange(pIdx, sIdx, 'estimatedHours', parseInt(e.target.value, 10) || 1)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 dark:text-slate-100"
                            />
                          </div>

                          {/* Optional Operator assignment */}
                          <div className="w-44">
                            <select
                              value={step.assignedOperatorId || ''}
                              onChange={(e) => handleStepChange(pIdx, sIdx, 'assignedOperatorId', e.target.value || undefined)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 dark:text-slate-200"
                            >
                              <option value="">Operario: No Asignado</option>
                              {operators.map(op => (
                                <option key={op.id} value={op.id}>
                                  {op.name} ({op.role})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Remove Step button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveStep(pIdx, sIdx)}
                            className="text-slate-400 hover:text-rose-500 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Remover Operación"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-250 dark:border-slate-850 rounded-xl text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-500/10"
            >
              {editingOrder ? 'Guardar Cambios' : 'Crear Orden (OP)'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
