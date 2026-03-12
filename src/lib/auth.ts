import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile,
  User
} from 'firebase/auth';
import {
  doc,
  collection,
  query,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';

// User profile stored in Firestore
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  avatarId?: number;        // Local avatar file ID (1–95)
  role: 'admin' | 'employee';
  position: string;
  type: 'internal' | 'external' | 'unassigned';
  pairedEmployeeId?: string; // ID of the paired employee record
  isOnline: boolean;
  lastSeen: Timestamp | null;
  theme: 'light' | 'dark';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

// Register with email and password
export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string
) => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Update Firebase Auth profile
  await updateProfile(credential.user, { displayName });
  
  // Create Firestore user profile
  await createUserProfile(credential.user.uid, {
    email,
    displayName,
    photoURL: null
  });

  // Notify admins
  const { createBroadcastNotification } = await import('./notifications');
  createBroadcastNotification({
    type: 'new_user',
    title: `Nový uživatel: ${displayName}`,
    message: email,
    senderName: displayName,
    link: '/admin/employees'
  });
  
  return credential;
};

// Sign in with Google
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  
  // Create/update Firestore user profile
  const profileExists = await getUserProfile(credential.user.uid);
  if (!profileExists) {
    await createUserProfile(credential.user.uid, {
      email: credential.user.email || '',
      displayName: credential.user.displayName || '',
      photoURL: credential.user.photoURL
    });
    const { createBroadcastNotification } = await import('./notifications');
    createBroadcastNotification({
      type: 'new_user',
      title: `Nový uživatel: ${credential.user.displayName || 'Google User'}`,
      message: credential.user.email || '',
      senderName: credential.user.displayName || 'Google User',
      link: '/admin/employees'
    });
  }
  
  return credential;
};

// Sign in with Apple
export const signInWithApple = async () => {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  const credential = await signInWithPopup(auth, provider);
  
  // Create/update Firestore user profile
  const profileExists = await getUserProfile(credential.user.uid);
  if (!profileExists) {
    const displayName = credential.user.displayName || 'Apple User';
    await createUserProfile(credential.user.uid, {
      email: credential.user.email || '',
      displayName,
      photoURL: credential.user.photoURL
    });
    const { createBroadcastNotification } = await import('./notifications');
    createBroadcastNotification({
      type: 'new_user',
      title: `Nový uživatel: ${displayName}`,
      message: credential.user.email || '',
      senderName: displayName,
      link: '/admin/employees'
    });
  }
  
  return credential;
};

// Sign out
export const signOut = async () => {
  const user = auth.currentUser;
  if (user) {
    await updatePresence(user.uid, false);
  }
  return firebaseSignOut(auth);
};

// Auth state listener
export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return firebaseOnAuthStateChanged(auth, callback);
};

// Create user profile in Firestore
export const createUserProfile = async (
  uid: string,
  data: { email: string; displayName: string; photoURL: string | null }
) => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    uid,
    email: data.email,
    displayName: data.displayName,
    photoURL: data.photoURL,
    role: 'employee', // default role
    position: '',
    type: 'unassigned',
    isOnline: true,
    lastSeen: serverTimestamp(),
    theme: 'light',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

// Get user profile from Firestore
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userRef = doc(db, 'users', uid);
  const docSnap = await getDoc(userRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
};

// Subscribe to user profile changes
export const subscribeToUserProfile = (
  uid: string,
  callback: (profile: UserProfile | null) => void
) => {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as UserProfile);
    } else {
      callback(null);
    }
  });
};

// Update online presence
export const updatePresence = async (uid: string, isOnline: boolean) => {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, {
      isOnline,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating presence:', error);
  }
};

// Update user profile
export const updateUserProfile = async (
  uid: string,
  data: Partial<Pick<UserProfile, 'displayName' | 'position' | 'type' | 'theme' | 'photoURL' | 'avatarId'>>
) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

// Update user role (admin only)
export const updateUserRole = async (uid: string, role: 'admin' | 'employee') => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    role,
    updatedAt: serverTimestamp()
  });
};

// Pair user account with an employee
export const pairUserToEmployee = async (
  uid: string,
  employeeId: string,
  employeeName: string,
  employeePosition: string,
  employeeType: 'internal' | 'external' | 'unassigned'
) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    displayName: employeeName,
    position: employeePosition,
    type: employeeType,
    pairedEmployeeId: employeeId,
    updatedAt: serverTimestamp()
  });
  
  // Also update Firebase Auth displayName
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: employeeName });
  }
};

// Mark user as "not pairing" (volny clovek)
export const markUserAsUnpaired = async (uid: string) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    pairedEmployeeId: '__none__',
    updatedAt: serverTimestamp()
  });
};

// Subscribe to all user profiles (for admin)
export const subscribeToAllUsers = (
  callback: (users: UserProfile[]) => void
) => {
  const usersRef = collection(db, 'users');
  return onSnapshot(query(usersRef), (snapshot) => {
    const users: UserProfile[] = [];
    snapshot.forEach((docSnap) => {
      users.push(docSnap.data() as UserProfile);
    });
    callback(users);
  });
};

// Ensure an employee record exists for a user (called on registration)
export const ensureEmployeeRecord = async (
  displayName: string,
  position: string = '',
  type: 'internal' | 'external' | 'unassigned' = 'unassigned'
) => {
  const { saveEmployee } = await import('./employees');
  const { getCollectionName } = await import('./environment');

  const COLLECTION_NAME = getCollectionName('employees');
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME)));

  // Check if employee already exists by name
  const exists = snapshot.docs.some(d => d.data().name === displayName);
  if (exists) return;

  // Create new employee record with highest order + 1
  let maxOrder = -1;
  snapshot.forEach((d) => {
    const order = d.data().order;
    if (typeof order === 'number' && order > maxOrder) maxOrder = order;
  });

  const id = displayName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  await saveEmployee({
    id,
    name: displayName,
    position,
    type,
    order: maxOrder + 1,
  });
};
