'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple } from '@/lib/auth';
import { Mail, Lock, Eye, EyeOff, LogIn, Chrome, Apple, UserPlus, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          setError('Zadejte své jméno');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Heslo musí mít alespoň 6 znaků');
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, name.trim());
      } else {
        await signInWithEmail(email, password);
      }
      router.push('/dashboard');
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (isRegister) {
        if (error.code === 'auth/email-already-in-use') {
          setError('Tento email je už registrován. Přihlaste se.');
        } else if (error.code === 'auth/weak-password') {
          setError('Heslo je příliš slabé. Použijte alespoň 6 znaků.');
        } else if (error.code === 'auth/invalid-email') {
          setError('Neplatný formát emailu');
        } else {
          setError('Registrace se nezdařila. Zkuste to znovu.');
        }
      } else {
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
          setError('Nesprávný email nebo heslo');
        } else if (error.code === 'auth/too-many-requests') {
          setError('Příliš mnoho pokusů. Zkuste to později.');
        } else {
          setError('Přihlášení se nezdařilo. Zkuste to znovu.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      router.push('/dashboard');
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code !== 'auth/popup-closed-by-user') {
        setError('Přihlášení přes Google se nezdařilo');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithApple();
      router.push('/dashboard');
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code !== 'auth/popup-closed-by-user') {
        setError('Přihlášení přes Apple se nezdařilo');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
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
            Inkio CRM
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isRegister ? 'Vytvořte si nový účet' : 'Přihlaste se do svého účtu'}
          </p>
        </div>

        {/* Card */}
        <div className="login-card animate-slide-up">
          {/* Social login buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="social-btn"
            >
              <Chrome size={18} />
              <span>Pokračovat přes Google</span>
            </button>
            <button
              onClick={handleAppleLogin}
              disabled={loading}
              className="social-btn"
            >
              <Apple size={18} />
              <span>Pokračovat přes Apple</span>
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

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field — only for registration */}
            {isRegister && (
              <div>
                <label htmlFor="name" className="form-label">
                  Jméno
                </label>
                <div className="relative">
                  <User size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input pr-10"

                    required
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"

                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Heslo
              </label>
              <div className="relative">
                <Lock size={16} className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pr-16"

                  required
                  minLength={isRegister ? 6 : undefined}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {isRegister && (
                <p className="text-[11px] text-slate-400 mt-1">Minimálně 6 znaků</p>
              )}
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
              ) : isRegister ? (
                <>
                  <UserPlus size={16} />
                  Zaregistrovat se
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Přihlásit se
                </>
              )}
            </button>
          </form>

          {/* Toggle login/register */}
          <div className="mt-6 text-center">
            <button
              onClick={toggleMode}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium transition-colors"
            >
              {isRegister
                ? 'Už máte účet? Přihlaste se'
                : 'Nemáte účet? Zaregistrujte se'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
