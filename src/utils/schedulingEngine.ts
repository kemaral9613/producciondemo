import type { ProductionOrder, Workstation, OrderProductStep } from '../types';

export interface ScheduleConflict {
  type: 'overlap' | 'overload' | 'delay';
  severity: 'warning' | 'error';
  message: string;
  orderId?: string;
  workstationId?: string;
  date?: string;
}

/**
 * Detects scheduling conflicts in the active production steps.
 */
export const detectConflicts = (
  orders: ProductionOrder[],
  workstations: Workstation[]
): ScheduleConflict[] => {
  const conflicts: ScheduleConflict[] = [];

  // Extract all steps from all orders
  const allSteps = orders.flatMap(o => o.products.flatMap(p => p.steps));

  // Filter scheduled and active steps (incomplete)
  const activeSteps = allSteps.filter(s => s.status !== 'completed');
  const scheduledSteps = activeSteps.filter(s => s.scheduledDate && s.workstationId);

  // Group steps by Workstation and Date to check for overlap & overload
  const groups: { [key: string]: OrderProductStep[] } = {};

  scheduledSteps.forEach((step) => {
    const key = `${step.workstationId}_${step.scheduledDate}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(step);
  });

  // 1. Overload & Overlap Detection
  Object.keys(groups).forEach((key) => {
    const [workstationId, date] = key.split('_');
    const workstation = workstations.find((w) => w.id === workstationId);
    const daySteps = groups[key];
    const capacity = workstation ? workstation.dailyCapacityHours : 8;

    // Check overload: total hours scheduled for this workstation today exceeds capacity
    const totalHours = daySteps.reduce((sum, s) => sum + s.estimatedHours, 0);
    if (totalHours > capacity) {
      conflicts.push({
        type: 'overload',
        severity: 'warning',
        message: `El puesto "${workstation?.name || workstationId}" tiene una carga de ${totalHours}h para el día ${date}, superando su capacidad diaria de ${capacity}h.`,
        workstationId,
        date
      });
    }

    // Check hourly overlap if steps have start hours specified
    for (let i = 0; i < daySteps.length; i++) {
      const stepA = daySteps[i];
      const startA = stepA.scheduledStartHour ?? 8;
      const endA = startA + stepA.estimatedHours;

      for (let j = i + 1; j < daySteps.length; j++) {
        const stepB = daySteps[j];
        const startB = stepB.scheduledStartHour ?? 8;
        const endB = startB + stepB.estimatedHours;

        // Overlap condition
        if (startA < endB && startB < endA) {
          conflicts.push({
            type: 'overlap',
            severity: 'error',
            message: `Colisión en "${workstation?.name || workstationId}" el ${date}: Las operaciones de "${stepA.productName}" (OP: ${stepA.orderId}) y "${stepB.productName}" (OP: ${stepB.orderId}) se superponen en el horario.`,
            orderId: stepA.orderId,
            workstationId,
            date
          });
        }
      }
    }
  });

  // 2. Delivery Date Delay Detection
  scheduledSteps.forEach((step) => {
    if (step.scheduledDate && step.dueDate) {
      const scheduledDateObj = new Date(step.scheduledDate + 'T00:00:00');
      const dueDateObj = new Date(step.dueDate + 'T00:00:00');

      if (scheduledDateObj > dueDateObj) {
        conflicts.push({
          type: 'delay',
          severity: 'error',
          message: `La operación "${step.productName}" de la orden ${step.orderId} está programada para iniciar el ${step.scheduledDate}, superando su fecha límite de entrega (${step.dueDate}).`,
          orderId: step.orderId
        });
      }
    }
  });

  // 3. Delayed Status Detection (For pending steps past due dates today)
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(todayStr + 'T00:00:00');
  
  activeSteps.forEach((step) => {
    if (step.status !== 'delayed' && step.dueDate) {
      const due = new Date(step.dueDate + 'T00:00:00');
      if (due < today) {
        conflicts.push({
          type: 'delay',
          severity: 'error',
          message: `La operación de "${step.productName}" de la orden ${step.orderId} está demorada ya que superó la fecha límite de la OP (${step.dueDate}).`,
          orderId: step.orderId
        });
      }
    }
  });

  return conflicts;
};

/**
 * Automates sorting of production steps based on criteria.
 */
export const autoSortSteps = (
  steps: OrderProductStep[],
  criteria: 'dueDate' | 'priority' | 'duration'
): OrderProductStep[] => {
  const priorityWeight = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  };

  return [...steps].sort((a, b) => {
    if (criteria === 'dueDate') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    
    if (criteria === 'priority') {
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    
    if (criteria === 'duration') {
      return a.estimatedHours - b.estimatedHours; // Shortest job first
    }

    return 0;
  });
};

/**
 * Automatically plans and schedules order steps by trying to find the earliest slot on workstations.
 */
export const autoScheduleAll = (
  orders: ProductionOrder[],
  workstations: Workstation[],
  startDate: string = new Date().toISOString().split('T')[0]
): ProductionOrder[] => {
  const updatedOrders = JSON.parse(JSON.stringify(orders)) as ProductionOrder[];
  
  // Extract steps to program (only pending or scheduled steps)
  const stepsToPlan: OrderProductStep[] = [];
  updatedOrders.forEach((order) => {
    order.products.forEach((prod) => {
      prod.steps.forEach((step) => {
        if (step.status === 'pending' || step.status === 'scheduled') {
          stepsToPlan.push(step);
        }
      });
    });
  });

  // Sort steps to plan: delayed first, then priority, then due date
  const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(todayStr + 'T00:00:00');
  
  // Helper to check if step is delayed (dueDate < today)
  const isStepDelayed = (step: OrderProductStep): boolean => {
    if (step.status === 'delayed') return true;
    if (step.dueDate) {
      const dueDate = new Date(step.dueDate + 'T00:00:00');
      return dueDate < today;
    }
    return false;
  };
  
  stepsToPlan.sort((a, b) => {
    // 1. Delayed steps have absolute priority
    const aDelayed = isStepDelayed(a) ? 1 : 0;
    const bDelayed = isStepDelayed(b) ? 1 : 0;
    if (aDelayed !== bDelayed) {
      return bDelayed - aDelayed; // Delayed first
    }
    
    // 2. Among non-delayed (or both delayed), sort by priority
    if (priorityWeight[b.priority] !== priorityWeight[a.priority]) {
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    
    // 3. Same priority: sort by due date (earliest first)
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  // Track workstation usage: key is "workstationId_date" -> accumulated hours
  const workstationUsage: { [key: string]: number } = {};

  // Initialize usage with active steps (in production, paused, etc.) that are already scheduled
  updatedOrders.forEach((order) => {
    order.products.forEach((prod) => {
      prod.steps.forEach((step) => {
        if (
          step.status !== 'pending' &&
          step.status !== 'scheduled' &&
          step.scheduledDate &&
          step.workstationId
        ) {
          const key = `${step.workstationId}_${step.scheduledDate}`;
          workstationUsage[key] = (workstationUsage[key] || 0) + step.estimatedHours;
        }
      });
    });
  });

  // Fit each step into available slots (may span multiple days if needed)
  stepsToPlan.forEach((step) => {
    const targetWorkstationId = step.workstationId;
    if (!targetWorkstationId) return;

    const workstation = workstations.find(w => w.id === targetWorkstationId);
    const capacity = workstation ? workstation.dailyCapacityHours : 8;
    const stepHours = step.estimatedHours;

    let dayOffset = 0;
    let scheduledDate = startDate;
    let scheduledStartHour: number | undefined = undefined;
    let fitted = false;

    // Find first day(s) where this step fits (may span multiple days)
    while (!fitted && dayOffset < 30) {
      const d = new Date(startDate + 'T00:00:00');
      d.setDate(d.getDate() + dayOffset);
      const dateStr = d.toISOString().split('T')[0];
      const key = `${targetWorkstationId}_${dateStr}`;
      
      const currentHours = workstationUsage[key] || 0;
      const availableToday = capacity - currentHours;

      // If step fits in current day, schedule it there
      if (availableToday >= stepHours) {
        scheduledDate = dateStr;
        // start at next available hour to avoid overlap
        scheduledStartHour = 8 + currentHours;
        workstationUsage[key] = currentHours + stepHours;
        fitted = true;
      } else if (availableToday > 0) {
        // Step doesn't fit today but there's space; check if it fits across multiple days
        let remainingHours = stepHours - availableToday;
        let futureOffset = dayOffset + 1;
        let canFitAcrossMultipleDays = true;

        // Check next consecutive days for remaining hours
        while (remainingHours > 0 && futureOffset < dayOffset + 30) {
          const futureD = new Date(startDate + 'T00:00:00');
          futureD.setDate(futureD.getDate() + futureOffset);
          const futureDateStr = futureD.toISOString().split('T')[0];
          const futureKey = `${targetWorkstationId}_${futureDateStr}`;

          const futureCurrentHours = workstationUsage[futureKey] || 0;
          const futureAvailable = capacity - futureCurrentHours;

          if (futureAvailable > 0) {
            remainingHours -= futureAvailable;
            futureOffset++;
          } else {
            canFitAcrossMultipleDays = false;
            break;
          }
        }

        // If step can fit across multiple days, schedule it starting today
        if (canFitAcrossMultipleDays && remainingHours <= 0) {
          scheduledDate = dateStr;
          // start at next available hour on first day
          scheduledStartHour = 8 + currentHours;
          let hoursToAllocate = stepHours;
          let allocationOffset = dayOffset;

          // Allocate hours across consecutive days
          while (hoursToAllocate > 0 && allocationOffset < dayOffset + 30) {
            const allocD = new Date(startDate + 'T00:00:00');
            allocD.setDate(allocD.getDate() + allocationOffset);
            const allocDateStr = allocD.toISOString().split('T')[0];
            const allocKey = `${targetWorkstationId}_${allocDateStr}`;

            const allocCurrentHours = workstationUsage[allocKey] || 0;
            const allocAvailable = capacity - allocCurrentHours;
            const allocThisDay = Math.min(allocAvailable, hoursToAllocate);

            workstationUsage[allocKey] = allocCurrentHours + allocThisDay;
            hoursToAllocate -= allocThisDay;
            allocationOffset++;
          }

          fitted = true;
        } else {
          dayOffset++;
        }
      } else {
        dayOffset++;
      }
    }

    // Update step schedule inside updatedOrders
    let found = false;
    for (let oIdx = 0; oIdx < updatedOrders.length; oIdx++) {
      const order = updatedOrders[oIdx];
      for (let pIdx = 0; pIdx < order.products.length; pIdx++) {
        const prod = order.products[pIdx];
        const sIdx = prod.steps.findIndex(s => s.id === step.id);
        if (sIdx !== -1) {
          prod.steps[sIdx] = {
            ...prod.steps[sIdx],
            status: 'scheduled',
            scheduledDate,
            scheduledStartHour: scheduledStartHour ?? 8, // Hora de inicio secuencial para evitar solapamientos
            updatedAt: new Date().toISOString()
          };
          order.updatedAt = new Date().toISOString();
          found = true;
          break;
        }
      }
      if (found) break;
    }
  });

  return updatedOrders;
};

/**
 * Ajusta una programación existente para evitar solapamientos por puesto.
 * Fragmenta pasos que exceden la capacidad diaria en múltiples días secuenciales.
 */
export const adjustScheduleToAvoidOverlaps = (
  orders: ProductionOrder[],
  workstations: Workstation[],
  horizonDays = 60
): ProductionOrder[] => {
  const updatedOrders = JSON.parse(JSON.stringify(orders)) as ProductionOrder[];

  // Helper to get capacity for workstation
  const getCapacity = (wsId: string) => workstations.find(w => w.id === wsId)?.dailyCapacityHours ?? 8;

  // Build list of scheduled steps with references
  type StepRef = { orderId: string; productId: string; stepId: string; estimatedHours: number; scheduledDate: string; };
  const stepsByWs: { [wsId: string]: StepRef[] } = {};

  updatedOrders.forEach((order) => {
    order.products.forEach((prod) => {
      prod.steps.forEach((step: OrderProductStep) => {
        if (step.workstationId && step.scheduledDate) {
          stepsByWs[step.workstationId] = stepsByWs[step.workstationId] || [];
          stepsByWs[step.workstationId].push({
            orderId: order.id,
            productId: prod.id,
            stepId: step.id,
            estimatedHours: step.estimatedHours,
            scheduledDate: step.scheduledDate
          });
        }
      });
    });
  });

  // For each workstation, reassign and fragment steps ensuring sequential hours per day
  Object.keys(stepsByWs).forEach((wsId) => {
    const capacity = getCapacity(wsId);
    // Sort by scheduledDate then keep original order
    const list = stepsByWs[wsId].sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    // Track usage per day for this workstation
    const usage: { [date: string]: number } = {};
    // Track which steps need to create fragments
    const fragmentsToCreate: { orderId: string; productId: string; baseStepId: string; hours: number; date: string }[] = [];

    list.forEach((ref) => {
      let remainingHours = ref.estimatedHours;
      let assigned = false;
      const baseDate = new Date(ref.scheduledDate + 'T00:00:00');
      let isFirstFragment = true;

      for (let offset = 0; offset < horizonDays && remainingHours > 0; offset++) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + offset);
        const dateStr = d.toISOString().split('T')[0];
        const current = usage[dateStr] || 0;
        const availableToday = capacity - current;

        if (availableToday > 0) {
          const hoursToAllocateToday = Math.min(availableToday, remainingHours);
          usage[dateStr] = current + hoursToAllocateToday;

          if (isFirstFragment) {
            // Update the original step
            for (let oIdx = 0; oIdx < updatedOrders.length; oIdx++) {
              const order = updatedOrders[oIdx];
              if (order.id !== ref.orderId) continue;
              for (let pIdx = 0; pIdx < order.products.length; pIdx++) {
                const prod = order.products[pIdx];
                const sIdx = prod.steps.findIndex((s: OrderProductStep) => s.id === ref.stepId);
                if (sIdx !== -1) {
                  prod.steps[sIdx].scheduledDate = dateStr;
                  prod.steps[sIdx].scheduledStartHour = 8 + (current);
                  prod.steps[sIdx].estimatedHours = hoursToAllocateToday; // Update to reflect only this fragment
                  prod.steps[sIdx].updatedAt = new Date().toISOString();
                  order.updatedAt = new Date().toISOString();
                  assigned = true;
                  break;
                }
              }
              if (assigned) break;
            }
            isFirstFragment = false;
          } else {
            // Create fragment for remaining hours
            fragmentsToCreate.push({
              orderId: ref.orderId,
              productId: ref.productId,
              baseStepId: ref.stepId,
              hours: hoursToAllocateToday,
              date: dateStr
            });
          }

          remainingHours -= hoursToAllocateToday;
        }
      }
    });

    // Create all fragments by inserting them into products
    fragmentsToCreate.forEach((frag) => {
      for (let oIdx = 0; oIdx < updatedOrders.length; oIdx++) {
        const order = updatedOrders[oIdx];
        if (order.id !== frag.orderId) continue;
        for (let pIdx = 0; pIdx < order.products.length; pIdx++) {
          const prod = order.products[pIdx];
          if (prod.id !== frag.productId) continue;

          // Find the base step to clone from
          const baseStepIdx = prod.steps.findIndex((s: OrderProductStep) => s.id === frag.baseStepId);
          if (baseStepIdx !== -1) {
            const baseStep = prod.steps[baseStepIdx];
            const fragmentId = `${frag.baseStepId}-FRAG-${frag.date}`;
            const newFragment: OrderProductStep = {
              ...baseStep,
              id: fragmentId,
              scheduledDate: frag.date,
              scheduledStartHour: 8,
              estimatedHours: frag.hours,
              updatedAt: new Date().toISOString()
            };
            prod.steps.push(newFragment);
            order.updatedAt = new Date().toISOString();
          }
          break;
        }
        break;
      }
    });
  });

  return updatedOrders;
};
