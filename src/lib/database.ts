import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

export interface ScheduleTask {
  id: string;
  employeeName: string;
  taskDate: string; // YYYY-MM-DD format
  taskContent: string;
  updatedAt: Timestamp;
}

// Collection reference
const COLLECTION_NAME = 'schedule_tasks';

// Save or update a task
export const saveTask = async (
  employeeName: string, 
  taskDate: string, 
  taskContent: string
): Promise<void> => {
  const taskId = `${employeeName.toLowerCase()}_${taskDate}`;
  const taskRef = doc(db, COLLECTION_NAME, taskId);
  
  await setDoc(taskRef, {
    id: taskId,
    employeeName,
    taskDate,
    taskContent,
    updatedAt: Timestamp.now()
  });
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
