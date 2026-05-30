import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ProductionOrder, Workstation, Operator, Notification, WorkstationStatus, OrderStatus, OrderProductStep } from '../types';
import { storageService } from '../services/storageService';
import { detectConflicts, autoScheduleAll, adjustScheduleToAvoidOverlaps } from '../utils/schedulingEngine';

interface AppContextProps {
  orders: ProductionOrder[];
  workstations: Workstation[];
  operators: Operator[];
  notifications: Notification[];
  activeView: 'dashboard' | 'orders' | 'scheduling' | 'workstations' | 'analytics';
  setActiveView: (view: 'dashboard' | 'orders' | 'scheduling' | 'workstations' | 'analytics') => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isFullscreen: boolean;
  setIsFullscreen: (val: boolean) => void;
  
  // Search & Filtering
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterPriority: string;
  setFilterPriority: (priority: string) => void;
  filterWorkstation: string;
  setFilterWorkstation: (wsId: string) => void;
  
  // Order CRUD
  addOrder: (order: Omit<ProductionOrder, 'id' | 'createdAt' | 'updatedAt'>) => ProductionOrder;
  updateOrder: (id: string, updates: Partial<ProductionOrder>) => void;
  deleteOrder: (id: string) => void;
  duplicateOrder: (id: string) => void;
  
  // Workstation Actions
  updateWorkstationStatus: (id: string, status: WorkstationStatus) => void;
  updateWorkstationCapacity: (id: string, capacity: number) => void;
  addWorkstation: (workstation: Omit<Workstation, 'id'>) => void;
  deleteWorkstation: (id: string) => void;
  updateWorkstation: (id: string, updates: Partial<Workstation>) => void;
  
  // Notification center
  addNotification: (title: string, message: string, type: 'info' | 'warning' | 'error' | 'success', orderId?: string) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  
  // Engine actions
  triggerAutoScheduling: () => void;
  conflicts: any[];
  
  // System Tools
  resetSystem: () => void;
  exportDatabase: () => void;
  importDatabase: (jsonString: string) => boolean;
  toast: {
    show: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning' | null;
  };
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'orders' | 'scheduling' | 'workstations' | 'analytics'>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterWorkstation, setFilterWorkstation] = useState('all');

  // Conflict list
  const [conflicts, setConflicts] = useState<any[]>([]);

  // Toast notifications state
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning' | null>(null);

  // Show dynamic toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastType(null);
    }, 4000);
  };

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    const loadedOrders = storageService.getOrders();
    const loadedWorkstations = storageService.getWorkstations();
    const loadedOperators = storageService.getOperators();
    const loadedNotifications = storageService.getNotifications();
    const loadedTheme = storageService.getTheme();

    setOrders(loadedOrders);
    setWorkstations(loadedWorkstations);
    setOperators(loadedOperators);
    setNotifications(loadedNotifications);
    setTheme(loadedTheme);

    // Apply class to body for theme styling
    if (loadedTheme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, []);

  // 2. Conflict Detection Effect
  useEffect(() => {
    if (orders.length > 0 && workstations.length > 0) {
      const activeConflicts = detectConflicts(orders, workstations);
      setConflicts(activeConflicts);

      // Check if there are new critical conflicts and alert via notifications
      activeConflicts.forEach((conflict) => {
        const alreadyNotified = notifications.some(
          (n) => n.title.includes(conflict.type === 'overlap' ? 'Colisión' : 'Carga') && 
                 n.message.includes(conflict.orderId || conflict.date || '')
        );

        if (!alreadyNotified) {
          addNotification(
            conflict.type === 'overlap' ? 'Colisión en Línea de Tiempo' : 'Sobrecarga de Puesto',
            conflict.message,
            conflict.severity === 'error' ? 'error' : 'warning',
            conflict.orderId
          );
        }
      });
    }
  }, [orders, workstations]);

  // Toast theme helper
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    storageService.saveTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.body.classList.add('dark');
      showToast('Modo oscuro activado', 'success');
    } else {
      document.body.classList.remove('dark');
      showToast('Modo claro activado', 'success');
    }
  };

  // CRUD Operators
  const addNotification = (title: string, message: string, type: 'info' | 'warning' | 'error' | 'success', orderId?: string) => {
    const newNotification: Notification = {
      id: `NT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
      orderId
    };

    setNotifications((prev) => {
      const updated = [newNotification, ...prev].slice(0, 50); // Keep max 50
      storageService.saveNotifications(updated);
      return updated;
    });
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      storageService.saveNotifications(updated);
      return updated;
    });
  };

  const clearNotifications = () => {
    setNotifications([]);
    storageService.saveNotifications([]);
    showToast('Notificaciones limpiadas', 'info');
  };

  // Helper to generate IDs like OP-1008
  const generateOrderId = (currentOrders: ProductionOrder[]): string => {
    if (currentOrders.length === 0) return 'OP-1001';
    const nums = currentOrders
      .map((o) => parseInt(o.id.replace('OP-', ''), 10))
      .filter((n) => !isNaN(n));
    const maxNum = nums.length > 0 ? Math.max(...nums) : 1000;
    return `OP-${maxNum + 1}`;
  };

  // Order CRUD operations
  const addOrder = (newOrderData: Omit<ProductionOrder, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newId = generateOrderId(orders);
    
    // Assign consistent hierarchical IDs to products and steps
    const productsWithIds = newOrderData.products.map((prod, pIdx) => {
      const prodId = `PROD-${newId}-${pIdx}`;
      const stepsWithIds = prod.steps.map((step, sIdx) => ({
        ...step,
        id: `STEP-${newId}-${pIdx}-${sIdx}`,
        orderId: newId,
        clientName: newOrderData.clientName,
        priority: newOrderData.priority,
        dueDate: newOrderData.dueDate,
        productId: prodId,
        productName: prod.name,
        quantity: prod.quantity,
        status: step.status || 'pending'
      }));

      return {
        ...prod,
        id: prodId,
        steps: stepsWithIds
      };
    });

    const newOrder: ProductionOrder = {
      ...newOrderData,
      id: newId,
      products: productsWithIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [newOrder, ...orders];
    setOrders(updated);
    storageService.saveOrders(updated);
    showToast(`Orden ${newId} creada exitosamente`, 'success');
    return newOrder;
  };

  const updateOrder = (id: string, updates: Partial<ProductionOrder>) => {
    const updated = orders.map((o) => {
      if (o.id === id) {
        const merged = { 
          ...o, 
          ...updates, 
          updatedAt: new Date().toISOString() 
        };

        // Cascade changes (like clientName, priority, dueDate) down to products and steps!
        if (updates.clientName || updates.priority || updates.dueDate || updates.products) {
          merged.products = merged.products.map((prod, pIdx) => {
            const prodId = prod.id || `PROD-${id}-${pIdx}`;
            const stepsWithIds = prod.steps.map((step, sIdx) => ({
              ...step,
              id: step.id || `STEP-${id}-${pIdx}-${sIdx}`,
              orderId: id,
              clientName: merged.clientName,
              priority: merged.priority,
              dueDate: merged.dueDate,
              productId: prodId,
              productName: prod.name,
              quantity: prod.quantity,
              status: step.status || 'pending'
            }));

            return {
              ...prod,
              id: prodId,
              steps: stepsWithIds
            };
          });
        }
        return merged;
      }
      return o;
    });

    setOrders(updated);
    storageService.saveOrders(updated);
    showToast(`Orden ${id} actualizada`, 'success');
  };

  const deleteOrder = (id: string) => {
    const updated = orders.filter((o) => o.id !== id);
    setOrders(updated);
    storageService.saveOrders(updated);
    showToast(`Orden ${id} eliminada`, 'warning');
  };

  const duplicateOrder = (id: string) => {
    const original = orders.find((o) => o.id === id);
    if (!original) return;

    const newId = generateOrderId(orders);
    
    // Clone products and reset all steps to pending & unscheduled
    const clonedProducts = original.products.map((prod, pIdx) => {
      const prodId = `PROD-${newId}-${pIdx}`;
      const clonedSteps = prod.steps.map((step, sIdx) => ({
        ...step,
        id: `STEP-${newId}-${pIdx}-${sIdx}`,
        orderId: newId,
        clientName: original.clientName,
        priority: original.priority,
        dueDate: original.dueDate,
        productId: prodId,
        productName: prod.name,
        quantity: prod.quantity,
        scheduledDate: undefined,
        scheduledStartHour: undefined,
        assignedOperatorId: undefined,
        status: 'pending' as OrderStatus
      }));

      return {
        ...prod,
        id: prodId,
        steps: clonedSteps
      };
    });

    const duplicated: ProductionOrder = {
      ...original,
      id: newId,
      products: clonedProducts,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [duplicated, ...orders];
    setOrders(updated);
    storageService.saveOrders(updated);
    showToast(`Orden ${original.id} duplicada como ${newId}`, 'success');
  };

  // Workstation Actions
  const updateWorkstationStatus = (id: string, status: WorkstationStatus) => {
    const updated = workstations.map((w) => (w.id === id ? { ...w, status } : w));
    setWorkstations(updated);
    storageService.saveWorkstations(updated);
    showToast(`Estado de puesto de trabajo actualizado`, 'success');
  };

  const updateWorkstationCapacity = (id: string, capacity: number) => {
    const updated = workstations.map((w) => (w.id === id ? { ...w, dailyCapacityHours: capacity } : w));
    setWorkstations(updated);
    storageService.saveWorkstations(updated);
    showToast(`Capacidad de puesto de trabajo ajustada a ${capacity}h`, 'success');
  };

  const addWorkstation = (wsData: Omit<Workstation, 'id'>) => {
    const newId = `WS-${Date.now()}`;
    const newWs: Workstation = {
      ...wsData,
      id: newId
    };
    const updated = [...workstations, newWs];
    setWorkstations(updated);
    storageService.saveWorkstations(updated);
    showToast(`Puesto "${wsData.name}" creado exitosamente`, 'success');
  };

  const deleteWorkstation = (id: string) => {
    // Extract all steps from all orders
    const allSteps = orders.flatMap(o => o.products.flatMap(p => p.steps));
    const activeAssignedOrders = allSteps.filter(
      (s) => s.workstationId === id && s.status !== 'completed'
    );
    if (activeAssignedOrders.length > 0) {
      showToast(`No se puede eliminar: tiene ${activeAssignedOrders.length} operaciones activas asignadas`, 'error');
      return;
    }
    const updated = workstations.filter((w) => w.id !== id);
    setWorkstations(updated);
    storageService.saveWorkstations(updated);
    showToast(`Puesto de trabajo eliminado`, 'warning');
  };

  const updateWorkstation = (id: string, updates: Partial<Workstation>) => {
    const updated = workstations.map((w) => (w.id === id ? { ...w, ...updates } : w));
    setWorkstations(updated);
    storageService.saveWorkstations(updated);
    showToast(`Puesto de trabajo actualizado`, 'success');
  };

  // Trigger Automatic Intelligent Scheduler
  const triggerAutoScheduling = () => {
    // 1) Run auto-scheduler
    const scheduled = autoScheduleAll(orders, workstations);

    // 2) Adjust schedule to avoid any overlapping start hours per workstation/day
    const adjusted = adjustScheduleToAvoidOverlaps(scheduled, workstations);

    // 3) Persist results
    setOrders(adjusted);
    storageService.saveOrders(adjusted);

    // 4) Validate conflicts after adjustment
    const postConflicts = detectConflicts(adjusted, workstations);
    const hasOverlap = postConflicts.some((c) => c.type === 'overlap');

    if (hasOverlap) {
      showToast('Auto-programación completada: se detectaron solapamientos residuales', 'warning');
      addNotification(
        'Auto-programación: Solapamientos detectados',
        'La auto-programación intentó ajustar la carga, pero persisten solapamientos en algunos puestos. Revisa el planificador.',
        'warning'
      );
    } else {
      showToast('Planificación inteligente completada con éxito', 'success');
      addNotification(
        'Planificación Automática Ejecutada',
        'El motor de programación ha optimizado y asignado las operaciones pendientes de acuerdo a su prioridad y capacidad de puestos.',
        'success'
      );
    }
  };

  // System Administration
  const resetSystem = () => {
    storageService.clearAll();
    // Reload defaults
    const loadedOrders = storageService.getOrders();
    const loadedWorkstations = storageService.getWorkstations();
    const loadedOperators = storageService.getOperators();
    const loadedNotifications = storageService.getNotifications();

    setOrders(loadedOrders);
    setWorkstations(loadedWorkstations);
    setOperators(loadedOperators);
    setNotifications(loadedNotifications);
    
    showToast('Sistema reiniciado a datos semilla de demostración', 'info');
  };

  const exportDatabase = () => {
    const backupStr = storageService.exportBackup();
    const blob = new Blob([backupStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_sistema_produccion_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showToast('Base de datos exportada para respaldo', 'success');
  };

  const importDatabase = (jsonString: string): boolean => {
    const success = storageService.importBackup(jsonString);
    if (success) {
      setOrders(storageService.getOrders());
      setWorkstations(storageService.getWorkstations());
      setOperators(storageService.getOperators());
      setNotifications(storageService.getNotifications());
      showToast('Copia de seguridad restaurada exitosamente', 'success');
      return true;
    } else {
      showToast('Error al importar archivo de copia de seguridad', 'error');
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        orders,
        workstations,
        operators,
        notifications,
        activeView,
        setActiveView,
        theme,
        toggleTheme,
        isFullscreen,
        setIsFullscreen,
        
        // Search & Filtering
        searchQuery,
        setSearchQuery,
        filterStatus,
        setFilterStatus,
        filterPriority,
        setFilterPriority,
        filterWorkstation,
        setFilterWorkstation,
        
        // CRUD
        addOrder,
        updateOrder,
        deleteOrder,
        duplicateOrder,
        
        // Workstations
        updateWorkstationStatus,
        updateWorkstationCapacity,
        addWorkstation,
        deleteWorkstation,
        updateWorkstation,
        
        // Alerts & Notification Center
        addNotification,
        markNotificationAsRead,
        clearNotifications,
        
        // Scheduling Engine
        triggerAutoScheduling,
        conflicts,
        
        // System Actions
        resetSystem,
        exportDatabase,
        importDatabase,
        
        toast: {
          show: showToast,
          message: toastMessage,
          type: toastType
        }
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
};
