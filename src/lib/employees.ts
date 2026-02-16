import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { getCollectionName } from './environment';
import { Employee } from './utils';

export interface EmployeeDocument extends Employee {
  id: string;
  order: number; // Pro řazení zaměstnanců
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const COLLECTION_NAME = getCollectionName('employees');

// Získat všechny zaměstnance (one-time read)
export const getEmployees = async (): Promise<EmployeeDocument[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    
    const employees: EmployeeDocument[] = [];
    snapshot.forEach((doc) => {
      employees.push(doc.data() as EmployeeDocument);
    });
    
    return employees;
  } catch (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
};

// Přihlásit se k odběru zaměstnanců (real-time)
export const subscribeToEmployees = (
  callback: (employees: EmployeeDocument[]) => void
) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('order', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const employees: EmployeeDocument[] = [];
    snapshot.forEach((doc) => {
      employees.push(doc.data() as EmployeeDocument);
    });
    callback(employees);
  }, (error) => {
    console.error('Error subscribing to employees:', error);
    callback([]);
  });
};

// Přidat nebo upravit zaměstnance
export const saveEmployee = async (
  employee: Omit<EmployeeDocument, 'createdAt' | 'updatedAt'>
): Promise<void> => {
  try {
    const employeeRef = doc(db, COLLECTION_NAME, employee.id);
    
    // Kontrola, zda dokument již existuje
    const snapshot = await getDocs(query(collection(db, COLLECTION_NAME)));
    const existingEmployee = snapshot.docs.find(doc => doc.id === employee.id);
    
    if (existingEmployee) {
      // Update
      await setDoc(employeeRef, {
        ...employee,
        updatedAt: Timestamp.now()
      }, { merge: true });
    } else {
      // Create
      await setDoc(employeeRef, {
        ...employee,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }
    
    console.log(`Employee ${employee.name} saved successfully`);
  } catch (error) {
    console.error('Error saving employee:', error);
    throw error;
  }
};

// Smazat zaměstnance
export const deleteEmployee = async (employeeId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, employeeId));
    console.log(`Employee ${employeeId} deleted successfully`);
  } catch (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
};

// Migrovat stávající zaměstnance do Firebase (jednorázová akce)
export const migrateEmployeesToFirebase = async (
  employees: Employee[]
): Promise<void> => {
  try {
    const promises = employees.map((employee, index) => {
      const id = employee.name.toLowerCase().replace(/\s+/g, '_');
      const employeeDoc: Omit<EmployeeDocument, 'createdAt' | 'updatedAt'> = {
        id,
        name: employee.name,
        position: employee.position,
        type: employee.type,
        order: index
      };
      return saveEmployee(employeeDoc);
    });
    
    await Promise.all(promises);
    console.log('All employees migrated successfully');
  } catch (error) {
    console.error('Error migrating employees:', error);
    throw error;
  }
};

// Přeuspořádat zaměstnance
export const reorderEmployees = async (
  employeeIds: string[]
): Promise<void> => {
  try {
    const promises = employeeIds.map((id, index) => {
      const employeeRef = doc(db, COLLECTION_NAME, id);
      return setDoc(employeeRef, {
        order: index,
        updatedAt: Timestamp.now()
      }, { merge: true });
    });
    
    await Promise.all(promises);
    console.log('Employees reordered successfully');
  } catch (error) {
    console.error('Error reordering employees:', error);
    throw error;
  }
};