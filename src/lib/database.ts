import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

export type TaskStatus = 'pending' | 'in-progress' | 'completed';

export interface ScheduleTask {
  id: string;
  employeeName: string;
  taskDate: string; // YYYY-MM-DD format
  taskContent: string;
  status: TaskStatus;
  updatedAt: Timestamp;
}

// Collection reference
const COLLECTION_NAME = 'schedule_tasks';

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
      tasks.push(doc.data() as ScheduleTask);
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
