'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUpWithEmail, signInWithGoogle, signInWithApple } from '@/lib/auth';
import { Mail, Lock, Eye, EyeOff, UserPlus, Chrome, Apple, ArrowLeft, User } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!displayName.trim()) {
      setError('Zadejte své jméno');
      return;
    }

    if (password.length < 6) {
      setError('Heslo musí mít alespoň 6 znaků');
      return;
    }

    if (password !== confirmPassword) {
      setError('Hesla se neshodují');
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password, displayName.trim());
      // Redirect to pairing page (mandatory after registration)
      router.push('/pair-account');
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === 'auth/email-already-in-use') {
        setError('Účet s tímto emailem již existuje');
      } else if (error.code === 'auth/weak-password') {
        setError('Heslo je příliš slabé. Použijte alespoň 6 znaků.');
      } else {
        setError('Registrace se nezdařila. Zkuste to znovu.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      router.push('/pair-account');
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code !== 'auth/popup-closed-by-user') {
        setError('Registrace přes Google se nezdařila');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleRegister = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithApple();
      router.push('/pair-account');
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code !== 'auth/popup-closed-by-user') {
        setError('Registrace přes Apple se nezdařila');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 login-bg">
      {/* Animated background */}
      <div className="login-bg-shapes">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200 mb-4">
            <span className="text-2xl font-black text-white">I</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Vytvořit účet
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Po registraci si spárujete účet se zaměstnancem
          </p>
        </div>

        {/* Card */}
        <div className="login-card animate-slide-up">
          {/* Social login buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleGoogleRegister}
              disabled={loading}
              className="social-btn"
            >
              <Chrome size={18} />
              <span>Registrovat přes Google</span>
            </button>
            <button
              onClick={handleAppleRegister}
              disabled={loading}
              className="social-btn"
            >
              <Apple size={18} />
              <span>Registrovat přes Apple</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-slate-800 px-4 text-xs text-slate-400 font-medium">
                nebo emailem
              </span>
            </div>
          </div>

          {/* Register form */}
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Display name */}
            <div>
              <label className="form-label">
                Vaše jméno *
              </label>
              <div className="relative">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="form-input pl-10"
                  placeholder="Jméno a příjmení"
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="form-label">
                Email *
              </label>
              <div className="relative">
                <Mail size={16} className="input-icon" />
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input pl-10"
                  placeholder="vas@email.cz"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="form-label">
                Heslo *
              </label>
              <div className="relative">
                <Lock size={16} className="input-icon" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pl-10 pr-10"
                  placeholder="Minimálně 6 znaků"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reg-confirm" className="form-label">
                Potvrzení hesla *
              </label>
              <div className="relative">
                <Lock size={16} className="input-icon" />
                <input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input pl-10"
                  placeholder="Zopakujte heslo"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="primary-btn w-full"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={16} />
                  Vytvořit účet
                </>
              )}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium transition-colors"
            >
              <ArrowLeft size={14} />
              Již máte účet? Přihlaste se
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
