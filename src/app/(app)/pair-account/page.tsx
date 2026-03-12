'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { pairUserToEmployee, markUserAsUnpaired } from '@/lib/auth';
import { subscribeToEmployees, EmployeeDocument, pairEmployeeToUser } from '@/lib/employees';
import { UserCheck, Users, Building2, Globe, Check, X, Search } from 'lucide-react';

export default function PairAccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromUnpair = searchParams.get('from') === 'unpair';
  const { user, userProfile, loading: authLoading } = useAuth();
  const [employees, setEmployees] = useState<EmployeeDocument[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDocument | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'choose' | 'confirm'>('choose');
  // Track if we should skip the auto-redirect (when coming from unpair)
  const skipRedirect = useRef(fromUnpair);

  useEffect(() => {
    const unsubscribe = subscribeToEmployees(setEmployees);
    return () => unsubscribe();
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // If already paired or chose "nepárovat", redirect to dashboard
  // But skip if we just came from the unpair action
  useEffect(() => {
    if (!authLoading && userProfile) {
      const pid = userProfile.pairedEmployeeId;
      // Once the profile updates to empty/undefined, we can stop skipping
      if (!pid || pid === '') {
        skipRedirect.current = false;
        return;
      }
      // If we have a valid pairing and we're NOT skipping, redirect
      if (!skipRedirect.current) {
        router.push('/dashboard');
      }
    }
  }, [userProfile, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0a0f]">
        <div className="w-10 h-10 border-3 border-blue-200 rounded-full animate-spin" style={{ borderTopColor: '#1765F2' }} />
      </div>
    );
  }

  // Filter employees available for pairing:
  // - No linkedUid (truly unpaired)
  // - OR linkedUid matches current user (orphaned state from incomplete unpair)
  const unpairedEmployees = employees.filter(e => !e.linkedUid || e.linkedUid === user.uid);
  const internalUnpaired = unpairedEmployees.filter(e => e.type === 'internal');
  const externalUnpaired = unpairedEmployees.filter(e => e.type === 'external');

  // Search filter
  const filterBySearch = (emps: EmployeeDocument[]) => {
    if (!search.trim()) return emps;
    const q = search.toLowerCase();
    return emps.filter(e =>
      e.name.toLowerCase().includes(q) || (e.position || '').toLowerCase().includes(q)
    );
  };

  const filteredInternal = filterBySearch(internalUnpaired);
  const filteredExternal = filterBySearch(externalUnpaired);

  const handlePair = async () => {
    if (!selectedEmployee || !user) return;
    setSaving(true);
    try {
      // 1. Update user profile with employee data
      await pairUserToEmployee(
        user.uid,
        selectedEmployee.id,
        selectedEmployee.name,
        selectedEmployee.position || '',
        selectedEmployee.type
      );

      // 2. Mark employee as linked to this user
      await pairEmployeeToUser(selectedEmployee.id, user.uid);

      router.push('/dashboard');
    } catch (error) {
      console.error('Error pairing:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await markUserAsUnpaired(user.uid);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error skipping:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderEmployeeCard = (emp: EmployeeDocument) => {
    const isSelected = selectedEmployee?.id === emp.id;
    return (
      <button
        key={emp.id}
        type="button"
        onClick={() => { setSelectedEmployee(emp); setStep('confirm'); }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
          isSelected
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200'
            : 'border-transparent hover:border-slate-200 bg-white dark:bg-slate-800 hover:shadow-sm'
        }`}
      >
        <div className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-sm font-bold ${
          emp.type === 'internal'
            ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
            : 'bg-gradient-to-br from-blue-400 to-blue-600'
        }`}>
          {emp.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">{emp.name}</div>
          {emp.position && (
            <div className="text-xs text-slate-400 truncate">{emp.position}</div>
          )}
        </div>
        {isSelected && (
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Check size={14} className="text-white" />
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 login-bg">
      <div className="login-bg-shapes">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="text-center mb-6 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200 mb-4">
            <UserCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Spárujte svůj účet
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {userProfile?.email || user.email}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
            Vyberte se ze seznamu zaměstnanců. Vaše data se automaticky propojí s vaším účtem.
          </p>
        </div>

        {/* Card */}
        <div className="login-card animate-slide-up">
          {step === 'choose' ? (
            <>
              {/* Search */}
              {unpairedEmployees.length > 5 && (
                <div className="relative mb-4">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="form-input pl-10 w-full"
                    placeholder="Hledat zaměstnance..."
                  />
                </div>
              )}

              <div className="max-h-[400px] overflow-auto space-y-3 pr-1">
                {/* Internal team */}
                {filteredInternal.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 px-1 mb-2">
                      <Building2 size={14} className="text-emerald-500" />
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Interní tým</span>
                      <span className="text-[10px] text-emerald-400 font-medium">{filteredInternal.length}</span>
                    </div>
                    <div className="space-y-1">
                      {filteredInternal.map(renderEmployeeCard)}
                    </div>
                  </div>
                )}

                {/* External team */}
                {filteredExternal.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 px-1 mb-2 mt-3">
                      <Globe size={14} className="text-blue-500" />
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Externí tým</span>
                      <span className="text-[10px] text-blue-400 font-medium">{filteredExternal.length}</span>
                    </div>
                    <div className="space-y-1">
                      {filteredExternal.map(renderEmployeeCard)}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {filteredInternal.length === 0 && filteredExternal.length === 0 && (
                  <div className="py-8 text-center">
                    <Users size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm text-slate-400 font-medium">
                      {search ? 'Žádní zaměstnanci nenalezeni' : 'Žádní nepřiřazení zaměstnanci'}
                    </p>
                  </div>
                )}
              </div>

              {/* Don't pair button */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={handleSkip}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all"
                >
                  <X size={16} />
                  Nejsem nikdo z nich — nepárovat
                </button>
                <p className="text-[11px] text-slate-400 text-center mt-2">
                  Zobrazíte se v adminu jako volný člověk k přiřazení
                </p>
              </div>
            </>
          ) : (
            /* Confirm step */
            <div className="animate-fade-in">
              <div className="text-center mb-6">
                <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white text-xl font-bold mb-3 ${
                  selectedEmployee?.type === 'internal'
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                    : 'bg-gradient-to-br from-blue-400 to-blue-600'
                }`}>
                  {selectedEmployee?.name.charAt(0)}
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedEmployee?.name}
                </h2>
                {selectedEmployee?.position && (
                  <p className="text-sm text-slate-400 mt-0.5">{selectedEmployee.position}</p>
                )}
                <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                  selectedEmployee?.type === 'internal'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {selectedEmployee?.type === 'internal' ? <Building2 size={12} /> : <Globe size={12} />}
                  {selectedEmployee?.type === 'internal' ? 'Interní tým' : 'Externí tým'}
                </div>
              </div>

              <p className="text-sm text-slate-500 text-center mb-6">
                Opravdu jste <strong>{selectedEmployee?.name}</strong>? Váš účet bude propojen s tímto zaměstnancem.
              </p>

              <div className="space-y-2">
                <button
                  onClick={handlePair}
                  disabled={saving}
                  className="primary-btn w-full"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={16} />
                      Ano, to jsem já — spárovat
                    </>
                  )}
                </button>
                <button
                  onClick={() => { setSelectedEmployee(null); setStep('choose'); }}
                  disabled={saving}
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  Zpět na výběr
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
