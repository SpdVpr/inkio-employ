// Temporary script to set admin role
// Run once and delete

import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function setAdminByEmail(email: string) {
  const snapshot = await getDocs(collection(db, 'users'));
  let found = false;
  
  for (const userDoc of snapshot.docs) {
    const data = userDoc.data();
    if (data.email === email) {
      await updateDoc(doc(db, 'users', userDoc.id), { role: 'admin' });
      console.log(`✅ ${email} is now admin (uid: ${userDoc.id})`);
      found = true;
      break;
    }
  }
  
  if (!found) {
    console.log(`❌ User ${email} not found`);
  }
}
