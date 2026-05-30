const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const moveToNextMonday = (date: Date) => {
  // JS: 0=Dom,1=Lun,...6=Sáb
  const day = date.getDay();
  if (day === 1) return date;
  const delta = (8 - day) % 7;
  return addDays(date, delta);
};

// Meeus/Jones/Butcher algorithm (Gregorian) for Easter Sunday
const easterSunday = (year: number) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=Mar, 4=Abr
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

const holidayCache = new Map<number, Map<string, string>>();

const buildHolidaysForYear = (year: number) => {
  const map = new Map<string, string>();

  const addFixed = (month0: number, day: number, name: string) => {
    map.set(toDateKey(new Date(year, month0, day)), name);
  };

  const addMovedMonday = (month0: number, day: number, name: string) => {
    const moved = moveToNextMonday(new Date(year, month0, day));
    map.set(toDateKey(moved), name);
  };

  // Fijos
  addFixed(0, 1, 'Año Nuevo');
  addFixed(4, 1, 'Día del Trabajo');
  addFixed(6, 20, 'Independencia de Colombia');
  addFixed(7, 7, 'Batalla de Boyacá');
  addFixed(11, 8, 'Inmaculada Concepción');
  addFixed(11, 25, 'Navidad');

  // Ley Emiliani (se trasladan al lunes siguiente si no caen lunes)
  addMovedMonday(0, 6, 'Reyes Magos');
  addMovedMonday(2, 19, 'San José');
  addMovedMonday(5, 29, 'San Pedro y San Pablo');
  addMovedMonday(7, 15, 'Asunción de la Virgen');
  addMovedMonday(9, 12, 'Día de la Raza');
  addMovedMonday(10, 1, 'Todos los Santos');
  addMovedMonday(10, 11, 'Independencia de Cartagena');

  // Semana Santa (no se traslada)
  const easter = easterSunday(year);
  map.set(toDateKey(addDays(easter, -3)), 'Jueves Santo');
  map.set(toDateKey(addDays(easter, -2)), 'Viernes Santo');

  // Trasladables dependientes de Pascua (al lunes siguiente)
  map.set(toDateKey(moveToNextMonday(addDays(easter, 43))), 'Ascensión del Señor');
  map.set(toDateKey(moveToNextMonday(addDays(easter, 64))), 'Corpus Christi');
  map.set(toDateKey(moveToNextMonday(addDays(easter, 71))), 'Sagrado Corazón de Jesús');

  return map;
};

export const getColombiaHolidayName = (date: Date) => {
  const year = date.getFullYear();
  let map = holidayCache.get(year);
  if (!map) {
    map = buildHolidaysForYear(year);
    holidayCache.set(year, map);
  }
  return map.get(toDateKey(date)) ?? null;
};

export const isWeekend = (date: Date) => {
  const d = date.getDay();
  return d === 0 || d === 6;
};

