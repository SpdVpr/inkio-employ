import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

export interface Company {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const COLLECTION = 'companies';

// Subscribe to companies
export const subscribeToCompanies = (
  callback: (companies: Company[]) => void
) => {
  const q = query(collection(db, COLLECTION), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const companies: Company[] = [];
    snapshot.forEach((doc) => {
      companies.push({ id: doc.id, ...doc.data() } as Company);
    });
    callback(companies);
  }, (error) => {
    console.error('Error subscribing to companies:', error);
    callback([]);
  });
};

// Create company
export const createCompany = async (data: {
  name: string;
  color: string;
  icon: string;
}) => {
  return addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

// Update company
export const updateCompany = async (id: string, data: Partial<Pick<Company, 'name' | 'color' | 'icon'>>) => {
  const ref = doc(db, COLLECTION, id);
  return updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

// Delete company
export const deleteCompany = async (id: string) => {
  const ref = doc(db, COLLECTION, id);
  return deleteDoc(ref);
};

// Default colors for company picker
export const COMPANY_COLORS = [
  '#1765F2', '#1765F2', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#64748b', '#78716c'
];

// Default icons for companies
export const COMPANY_ICONS = [
  '🏢', '🏗️', '🏭', '🏠', '🏪', '💼',
  '⚡', '🔧', '🎨', '📱', '💻', '🚀'
];
