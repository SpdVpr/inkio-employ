'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function SetupAdminPage() {
  const [mode, setMode] = useState<'create' | 'promote'>('create');
  const [adminPassword, setAdminPassword] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('Admin');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const checkAdminPassword = () => {
    if (adminPassword !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setError('❌ Špatné autorizační heslo');
      return false;
    }
    return true;
  };

  // Create new admin account
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(''); setError('');
    if (!checkAdminPassword()) return;
    if (!email.trim() || !password.trim()) {
      setError('❌ Vyplňte email a heslo');
      return;
    }
    if (password.length < 6) {
      setError('❌ Heslo musí mít alespoň 6 znaků');
      return;
    }

    setLoading(true);
    try {
      // Create Firebase Auth user
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: displayName.trim() || 'Admin' });

      // Create Firestore user profile with admin role
      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        email: email.trim(),
        displayName: displayName.trim() || 'Admin',
        photoURL: null,
        role: 'admin',
        position: 'Administrátor',
        type: 'internal',
        isOnline: false,
        lastSeen: serverTimestamp(),
        theme: 'light',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setMessage(`✅ Admin účet vytvořen!\n\n📧 Email: ${email}\n🔑 Heslo: ${password}\n\nPřihlaste se na /login`);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('❌ Tento email je již zaregistrován. Použijte "Povýšit stávajícího".');
      } else {
        setError(`❌ Chyba: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Promote existing user to admin
  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(''); setError('');
    if (!checkAdminPassword()) return;
    if (!email.trim()) { setError('❌ Zadejte email'); return; }

    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      let found = false;
      for (const userDoc of snapshot.docs) {
        const data = userDoc.data();
        if (data.email === email.trim()) {
          await updateDoc(doc(db, 'users', userDoc.id), {
            role: 'admin',
            updatedAt: serverTimestamp()
          });
          setMessage(`✅ ${email} je nyní admin!`);
          found = true;
          break;
        }
      }
      if (!found) {
        setError(`❌ Uživatel "${email}" nenalezen. Vytvořte nový účet.`);
      }
    } catch (err: any) {
      setError(`❌ Chyba: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 460, margin: '40px auto' }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>🔑 Admin Setup</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>
        Vytvořte admin účet nebo povyšte stávajícího uživatele
      </p>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
        <button onClick={() => { setMode('create'); setMessage(''); setError(''); }}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            background: mode === 'create' ? '#fff' : 'transparent',
            color: mode === 'create' ? '#1e293b' : '#94a3b8',
            boxShadow: mode === 'create' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}>
          ➕ Vytvořit nový
        </button>
        <button onClick={() => { setMode('promote'); setMessage(''); setError(''); }}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            background: mode === 'promote' ? '#fff' : 'transparent',
            color: mode === 'promote' ? '#1e293b' : '#94a3b8',
            boxShadow: mode === 'promote' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}>
          ⬆️ Povýšit stávajícího
        </button>
      </div>

      <form onSubmit={mode === 'create' ? handleCreate : handlePromote}>
        {/* Autorizační heslo */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#64748b' }}>
            Autorizační heslo (z .env.local)
          </label>
          <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Autorizační heslo" style={inputStyle} />
        </div>

        {/* Email */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#64748b' }}>
            Email {mode === 'create' ? 'nového admin účtu' : 'existujícího uživatele'}
          </label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder={mode === 'create' ? 'admin@inkio.cz' : 'michalvesecky@gmail.com'}
            style={inputStyle} />
        </div>

        {/* Password + Name (create only) */}
        {mode === 'create' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#64748b' }}>
                Heslo pro přihlášení
              </label>
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Heslo (min. 6 znaků)" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#64748b' }}>
                Zobrazované jméno
              </label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Admin" style={inputStyle} />
            </div>
          </>
        )}

        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '12px', background: loading ? '#94a3b8' : '#1765F2',
          color: 'white', border: 'none', borderRadius: 12, cursor: loading ? 'default' : 'pointer',
          fontSize: 14, fontWeight: 600
        }}>
          {loading ? 'Zpracovávám...' : mode === 'create' ? 'Vytvořit admin účet' : 'Nastavit jako admin'}
        </button>
      </form>

      {message && <pre style={{ color: 'green', marginTop: 16, fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{message}</pre>}
      {error && <p style={{ color: 'red', marginTop: 16, fontSize: 13 }}>{error}</p>}

      {message && mode === 'create' && (
        <a href="/login" style={{
          display: 'block', textAlign: 'center', marginTop: 16, padding: '10px',
          background: '#f0f0ff', borderRadius: 10, color: '#1765F2', fontWeight: 600,
          fontSize: 13, textDecoration: 'none'
        }}>
          Přejít na přihlášení →
        </a>
      )}

      <p style={{ marginTop: 32, fontSize: 11, color: '#aaa' }}>
        ⚠️ Po nastavení tuto stránku smažte nebo zabezpečte.
      </p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' as const
};
