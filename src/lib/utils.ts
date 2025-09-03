import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isToday, isWeekend } from 'date-fns';
import { cs } from 'date-fns/locale';
import { TaskStatus } from './database';

export interface Employee {
  name: string;
  position: string;
  type: 'internal' | 'external';
}

// Seznam zaměstnanců podle popisu
export const employees: Employee[] = [
  // Interní zaměstnanci
  { name: 'Radim', position: 'Foto / Retuše / Ad Hoc úkoly', type: 'internal' },
  { name: 'Radek', position: 'Copy', type: 'internal' },
  { name: 'Věrka', position: 'Copy', type: 'internal' },
  { name: 'Tonda', position: 'Grafika / DTP', type: 'internal' },
  { name: 'Lukáš', position: '3D / Motion', type: 'internal' },

  // Externí zaměstnanci
  { name: 'Vlaďka', position: 'Copy', type: 'external' },
  { name: 'Roman', position: 'DTP / Motion', type: 'external' },
  { name: 'Honza Dočkal', position: 'Grafika / DTP', type: 'external' },
  { name: 'Terka', position: 'Foto / Retuše', type: 'external' },
  { name: 'Michal', position: 'Video / 3D / Motion', type: 'external' },
  { name: 'Yume', position: 'Grafika / Foto', type: 'external' },
];

// Získání týdne pro daný datum
export const getWeekDates = (date: Date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Pondělí jako první den
  const end = endOfWeek(date, { weekStartsOn: 1 });
  
  return {
    start,
    end,
    days: eachDayOfInterval({ start, end })
  };
};

// Navigace mezi týdny
export const getNextWeek = (currentDate: Date) => addWeeks(currentDate, 1);
export const getPreviousWeek = (currentDate: Date) => subWeeks(currentDate, 1);

// Formátování datumů
export const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');
export const formatDateDisplay = (date: Date) => format(date, 'd.M.', { locale: cs });
export const formatDayName = (date: Date) => format(date, 'EEEE', { locale: cs });

// Pomocné funkce pro UI
export const isCurrentDay = (date: Date) => isToday(date);
export const isWeekendDay = (date: Date) => isWeekend(date);

// Získání čísla týdne v měsíci
export const getWeekInfo = (date: Date) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  const weekNumber = Math.ceil((weekStart.getDate() + monthStart.getDay()) / 7);
  const totalWeeks = Math.ceil((monthEnd.getDate() + monthStart.getDay()) / 7);
  
  return {
    weekNumber,
    totalWeeks,
    monthName: format(date, 'LLLL yyyy', { locale: cs })
  };
};

// CSS třídy pro různé typy zaměstnanců
export const getEmployeeRowClasses = (employee: Employee) => {
  const baseClasses = 'border-b border-gray-200';
  
  if (employee.type === 'internal') {
    return `${baseClasses} bg-green-50 hover:bg-green-100`;
  } else {
    return `${baseClasses} bg-blue-50 hover:bg-blue-100`;
  }
};

// CSS třídy pro buňky podle dne a statusu
export const getCellClasses = (date: Date, isEditing: boolean = false, status?: TaskStatus) => {
  let classes = 'p-1 sm:p-2 border-r border-gray-200 h-[60px] sm:h-[70px] cursor-text transition-colors w-[120px] sm:w-[150px] max-w-[120px] sm:max-w-[150px] align-top relative';

  // Status barvy mají prioritu
  if (status === 'completed') {
    classes += ' bg-green-100 border-green-300';
  } else if (status === 'in-progress') {
    classes += ' bg-orange-100 border-orange-300';
  } else if (isCurrentDay(date)) {
    classes += ' bg-blue-100 border-blue-300';
  } else if (isWeekendDay(date)) {
    classes += ' bg-gray-100';
  } else {
    classes += ' bg-white hover:bg-gray-50';
  }

  if (isEditing) {
    classes += ' ring-2 ring-blue-500';
  }

  return classes;
};

// Status ikony a barvy
export const getStatusIcon = (status: TaskStatus) => {
  switch (status) {
    case 'completed':
      return '✅';
    case 'in-progress':
      return '⏳';
    case 'pending':
    default:
      return '';
  }
};

export const getStatusLabel = (status: TaskStatus) => {
  switch (status) {
    case 'completed':
      return 'Hotovo';
    case 'in-progress':
      return 'Rozpracováno';
    case 'pending':
    default:
      return 'Čeká';
  }
};

export const getStatusColor = (status: TaskStatus) => {
  switch (status) {
    case 'completed':
      return 'text-green-700 bg-green-100';
    case 'in-progress':
      return 'text-orange-700 bg-orange-100';
    case 'pending':
    default:
      return 'text-gray-700 bg-gray-100';
  }
};
