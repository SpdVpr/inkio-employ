import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { getCollectionName } from './environment';

export type TaskStatus = 'pending' | 'in-progress' | 'completed';

export interface SubTask {
  id: string;
  content: string;
  status: TaskStatus;
  order: number;
}

export interface ScheduleTask {
  id: string;
  employeeName: string;
  taskDate: string; // YYYY-MM-DD format
  taskContent: string; // Zachováno pro zpětnou kompatibilitu
  status: TaskStatus;
  subTasks?: SubTask[]; // Nové pole pro sub-úkoly
  isAbsent?: boolean; // Označení, že zaměstnanec není v práci
  updatedAt: Timestamp;
}

// Collection reference - automaticky přidá _dev suffix v development
const COLLECTION_NAME = getCollectionName('schedule_tasks');

// Utility funkce pro sub-úkoly
export const generateSubTaskId = (): string => {
  return `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const calculateOverallStatus = (subTasks: SubTask[]): TaskStatus => {
  if (!subTasks || subTasks.length === 0) return 'pending';

  const completed = subTasks.filter(t => t.status === 'completed').length;
  const inProgress = subTasks.filter(t => t.status === 'in-progress').length;

  if (completed === subTasks.length) return 'completed';
  if (completed > 0 || inProgress > 0) return 'in-progress';
  return 'pending';
};

export const calculateProgress = (subTasks: SubTask[]): number => {
  if (!subTasks || subTasks.length === 0) return 0;
  const completed = subTasks.filter(t => t.status === 'completed').length;
  return Math.round((completed / subTasks.length) * 100);
};

// Migrace existujících dat na sub-úkoly
export const migrateTaskToSubTasks = (task: ScheduleTask): ScheduleTask => {
  // Pokud už má sub-úkoly, vrať beze změny
  if (task.subTasks && task.subTasks.length > 0) {
    return task;
  }

  // Pokud má taskContent ale nemá sub-úkoly, vytvoř sub-úkol
  if (task.taskContent && task.taskContent.trim()) {
    const subTask: SubTask = {
      id: generateSubTaskId(),
      content: task.taskContent,
      status: task.status,
      order: 0
    };

    return {
      ...task,
      subTasks: [subTask],
      status: calculateOverallStatus([subTask])
    };
  }

  return task;
};

// Save or update a task (zachovává existující status)
export const saveTask = async (
  employeeName: string,
  taskDate: string,
  taskContent: string,
  status?: TaskStatus
): Promise<void> => {
  const taskId = `${employeeName.toLowerCase()}_${taskDate}`;
  const taskRef = doc(db, COLLECTION_NAME, taskId);

  try {
    // Pokus se aktualizovat pouze obsah (zachová existující status)
    await updateDoc(taskRef, {
      taskContent,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    // Pokud dokument neexistuje, vytvoř ho s výchozím statusem
    await setDoc(taskRef, {
      id: taskId,
      employeeName,
      taskDate,
      taskContent,
      status: status || 'pending',
      updatedAt: Timestamp.now()
    });
  }
};

// Update only task status
export const updateTaskStatus = async (
  employeeName: string,
  taskDate: string,
  status: TaskStatus
): Promise<void> => {
  const taskId = `${employeeName.toLowerCase()}_${taskDate}`;
  const taskRef = doc(db, COLLECTION_NAME, taskId);

  try {
    // Pokus se aktualizovat pouze status (zachová existující obsah)
    await updateDoc(taskRef, {
      status,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    // Pokud dokument neexistuje, vytvoř ho s prázdným obsahem
    await setDoc(taskRef, {
      id: taskId,
      employeeName,
      taskDate,
      taskContent: '',
      status,
      updatedAt: Timestamp.now()
    });
  }
};

// Sanitizace sub-úkolu - odstraní undefined hodnoty
const sanitizeSubTask = (subTask: SubTask): SubTask => {
  return {
    id: subTask.id || generateSubTaskId(),
    content: subTask.content || '',
    status: subTask.status || 'pending',
    order: typeof subTask.order === 'number' ? subTask.order : 0
  };
};

// Uložení sub-úkolů
export const saveSubTasks = async (
  employeeName: string,
  taskDate: string,
  subTasks: SubTask[]
): Promise<void> => {
  const taskId = `${employeeName.toLowerCase()}_${taskDate}`;
  const taskRef = doc(db, COLLECTION_NAME, taskId);

  // Sanitizuj a seřaď sub-úkoly podle order
  const sanitizedSubTasks = subTasks
    .filter(st => st && typeof st === 'object') // Odfiltruj neplatné objekty
    .map(sanitizeSubTask)
    .sort((a, b) => a.order - b.order);

  // Vypočítej celkový status
  const overallStatus = calculateOverallStatus(sanitizedSubTasks);

  // Vytvoř taskContent pro zpětnou kompatibilitu
  const taskContent = sanitizedSubTasks
    .map(st => st.content)
    .filter(content => content && content.trim()) // Odfiltruj prázdné obsahy
    .join('\n');

  // Připrav data pro uložení - bez undefined hodnot
  const dataToSave = {
    id: taskId,
    employeeName: employeeName || '',
    taskDate: taskDate || '',
    taskContent: taskContent || '',
    status: overallStatus || 'pending',
    subTasks: sanitizedSubTasks,
    updatedAt: Timestamp.now()
  };

  // Debug logging pro produkci
  console.log('Saving to collection:', COLLECTION_NAME);
  console.log('Task ID:', taskId);
  console.log('Data to save:', JSON.stringify(dataToSave, null, 2));

  try {
    // Zkus nejdříve update
    console.log('Attempting updateDoc...');
    await updateDoc(taskRef, {
      subTasks: dataToSave.subTasks,
      status: dataToSave.status,
      taskContent: dataToSave.taskContent,
      updatedAt: dataToSave.updatedAt
    });
    console.log('UpdateDoc successful');
  } catch (error) {
    console.log('Update failed, creating new document:', error);
    console.log('Attempting setDoc...');
    // Pokud dokument neexistuje, vytvoř ho
    await setDoc(taskRef, dataToSave);
    console.log('SetDoc successful');
  }
};

// Aktualizace statusu konkrétního sub-úkolu
export const updateSubTaskStatus = async (
  employeeName: string,
  taskDate: string,
  subTaskId: string,
  newStatus: TaskStatus
): Promise<void> => {
  const taskId = `${employeeName.toLowerCase()}_${taskDate}`;
  const taskRef = doc(db, COLLECTION_NAME, taskId);

  try {
    // Nejdříve získej aktuální data
    const docSnap = await getDoc(taskRef);

    if (docSnap.exists()) {
      const currentTask = docSnap.data() as ScheduleTask;
      const migratedTask = migrateTaskToSubTasks(currentTask);

      if (migratedTask.subTasks) {
        // Aktualizuj status konkrétního sub-úkolu
        const updatedSubTasks = migratedTask.subTasks.map(st =>
          st.id === subTaskId ? { ...st, status: newStatus } : st
        );

        // Uložit aktualizované sub-úkoly
        await saveSubTasks(employeeName, taskDate, updatedSubTasks);
      }
    }
  } catch (error) {
    console.error('Error updating sub-task status:', error);
    throw error;
  }
};

// Toggle absence status for a specific employee and date
export const toggleAbsent = async (
  employeeName: string,
  taskDate: string,
  isAbsent: boolean
): Promise<void> => {
  const taskId = `${employeeName.toLowerCase()}_${taskDate}`;
  const taskRef = doc(db, COLLECTION_NAME, taskId);

  try {
    // Pokus se aktualizovat pouze isAbsent
    await updateDoc(taskRef, {
      isAbsent,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    // Pokud dokument neexistuje, vytvoř ho
    await setDoc(taskRef, {
      id: taskId,
      employeeName,
      taskDate,
      taskContent: '',
      status: 'pending',
      isAbsent,
      updatedAt: Timestamp.now()
    });
  }
};

// Move a single sub-task from one date to another for the same employee
export const moveSubTask = async (
  employeeName: string,
  fromDate: string,
  toDate: string,
  subTaskId: string
): Promise<void> => {
  const fromTaskId = `${employeeName.toLowerCase()}_${fromDate}`;
  const toTaskId = `${employeeName.toLowerCase()}_${toDate}`;
  
  const fromTaskRef = doc(db, COLLECTION_NAME, fromTaskId);
  const toTaskRef = doc(db, COLLECTION_NAME, toTaskId);

  try {
    // Získej data ze zdrojového úkolu
    const fromDocSnap = await getDoc(fromTaskRef);
    
    if (!fromDocSnap.exists()) {
      console.log('Source task does not exist');
      return;
    }

    const sourceTask = fromDocSnap.data() as ScheduleTask;
    const migratedTask = migrateTaskToSubTasks(sourceTask);
    const sourceSubTasks = migratedTask.subTasks || [];

    // Najdi sub-úkol, který chceme přesunout
    const subTaskToMove = sourceSubTasks.find(st => st.id === subTaskId);
    
    if (!subTaskToMove) {
      console.log('Sub-task not found');
      return;
    }

    // Odstraň sub-úkol ze zdrojového úkolu
    const remainingSubTasks = sourceSubTasks.filter(st => st.id !== subTaskId);
    
    // Přečísluj zbývající sub-úkoly
    const reorderedRemainingSubTasks = remainingSubTasks.map((st, index) => ({
      ...st,
      order: index
    }));

    // Zkontroluj, zda cílový úkol existuje
    const toDocSnap = await getDoc(toTaskRef);
    
    if (toDocSnap.exists()) {
      // Cílový úkol existuje - přidej sub-úkol
      const targetTask = toDocSnap.data() as ScheduleTask;
      const migratedTargetTask = migrateTaskToSubTasks(targetTask);
      
      const existingSubTasks = migratedTargetTask.subTasks || [];
      
      // Najdi nejvyšší order v cílovém úkolu
      const maxOrder = existingSubTasks.length > 0 
        ? Math.max(...existingSubTasks.map(st => st.order))
        : -1;
      
      // Přidej přesunutý sub-úkol na konec
      const movedSubTask = {
        ...subTaskToMove,
        order: maxOrder + 1
      };
      
      // Slouč sub-úkoly
      const mergedSubTasks = [...existingSubTasks, movedSubTask];
      
      // Ulož sloučené sub-úkoly do cílového úkolu
      await saveSubTasks(employeeName, toDate, mergedSubTasks);
    } else {
      // Cílový úkol neexistuje - vytvoř nový s přesunutým sub-úkolem
      const movedSubTask = {
        ...subTaskToMove,
        order: 0
      };
      await saveSubTasks(employeeName, toDate, [movedSubTask]);
    }

    // Ulož aktualizovaný zdrojový úkol
    await saveSubTasks(employeeName, fromDate, reorderedRemainingSubTasks);

    console.log(`Sub-task ${subTaskId} moved from ${fromDate} to ${toDate} for ${employeeName}`);
  } catch (error) {
    console.error('Error moving sub-task:', error);
    throw error;
  }
};

// Subscribe to tasks for a specific date range
export const subscribeToTasks = (
  startDate: string,
  endDate: string,
  callback: (tasks: ScheduleTask[]) => void
) => {
  // Zjednodušený dotaz bez složeného indexu
  const q = query(
    collection(db, COLLECTION_NAME),
    where('taskDate', '>=', startDate),
    where('taskDate', '<=', endDate)
  );

  return onSnapshot(q, (snapshot) => {
    const tasks: ScheduleTask[] = [];
    snapshot.forEach((doc) => {
      const rawTask = doc.data() as ScheduleTask;
      // Automatická migrace na sub-úkoly
      const migratedTask = migrateTaskToSubTasks(rawTask);
      tasks.push(migratedTask);
    });

    // Řazení na klientovi místo v databázi
    tasks.sort((a, b) => {
      if (a.taskDate !== b.taskDate) {
        return a.taskDate.localeCompare(b.taskDate);
      }
      return a.employeeName.localeCompare(b.employeeName);
    });

    callback(tasks);
  });
};

// Add a sub-task to a specific employee and date
export const addSubTaskToEmployee = async (
  employeeName: string,
  taskDate: string,
  subTask: SubTask
): Promise<void> => {
  const taskId = `${employeeName.toLowerCase()}_${taskDate}`;
  const taskRef = doc(db, COLLECTION_NAME, taskId);

  try {
    const docSnap = await getDoc(taskRef);
    let newSubTasks: SubTask[] = [];

    if (docSnap.exists()) {
      const currentTask = docSnap.data() as ScheduleTask;
      const migratedTask = migrateTaskToSubTasks(currentTask);
      const existingSubTasks = migratedTask.subTasks || [];
      
      // Find max order
      const maxOrder = existingSubTasks.length > 0 
        ? Math.max(...existingSubTasks.map(st => st.order))
        : -1;

      // Add new sub-task with incremented order
      newSubTasks = [...existingSubTasks, { ...subTask, order: maxOrder + 1 }];
    } else {
      // Create new document with single sub-task
      newSubTasks = [{ ...subTask, order: 0 }];
    }

    // Save updated sub-tasks
    await saveSubTasks(employeeName, taskDate, newSubTasks);
  } catch (error) {
    console.error('Error adding sub-task to employee:', error);
    throw error;
  }
};
