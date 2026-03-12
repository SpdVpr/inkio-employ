'use client';

import { useState, useEffect, useCallback } from 'react';
import { subscribeToEmployees, saveEmployee, deleteEmployee, EmployeeDocument, updateEmployeeType, reorderEmployeesInType, pairEmployeeToUser, unpairEmployee } from '@/lib/employees';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, updateUserRole, pairUserToEmployee, markUserAsUnpaired } from '@/lib/auth';
import { Pencil, Trash2, Check, X, Crown, Circle, Users, GripVertical, Building2, Globe, Link2, Link2Off, UserX } from 'lucide-react';

type TeamType = 'internal' | 'external' | 'unassigned';

interface DragState {
  employeeId: string;
  sourceType: TeamType;
  sourceIndex: number;
  freeUserUid?: string; // When dragging a free user (not an existing employee)
}

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeDocument[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [saving, setSaving] = useState(false);

  // Pairing modal
  const [pairingEmployee, setPairingEmployee] = useState<EmployeeDocument | null>(null);

  // Drag state
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ type: TeamType; index: number } | null>(null);

  useEffect(() => {
    const unsub1 = subscribeToEmployees(setEmployees);
    const unsub2 = onSnapshot(query(collection(db, 'users')), (snapshot) => {
      const u: UserProfile[] = [];
      snapshot.forEach((doc) => u.push(doc.data() as UserProfile));
      setUsers(u);
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const resetForm = () => {
    setFormName(''); setFormPosition('');
    setEditingId(null); setShowEditForm(false);
  };

  const handleEdit = (emp: EmployeeDocument) => {
    setFormName(emp.name);
    setFormPosition(emp.position || '');
    setEditingId(emp.id);
    setShowEditForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !editingId) return;
    setSaving(true);
    try {
      const existing = employees.find(e => e.id === editingId);
      if (!existing) return;
      await saveEmployee({
        id: editingId,
        name: formName.trim(),
        position: formPosition.trim(),
        type: existing.type,
        order: existing.order ?? 0,
      });
      resetForm();
    } catch (error) {
      console.error('Error saving employee:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Opravdu smazat zaměstnance "${name}"? Úkoly zůstanou zachovány.`)) return;
    try {
      await deleteEmployee(id);
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  // Handle manual pairing from admin
  const handleManualPair = async (emp: EmployeeDocument, user: UserProfile) => {
    setSaving(true);
    try {
      await pairUserToEmployee(user.uid, emp.id, emp.name, emp.position || '', emp.type);
      await pairEmployeeToUser(emp.id, user.uid);
      setPairingEmployee(null);
    } catch (error) {
      console.error('Error pairing:', error);
    } finally {
      setSaving(false);
    }
  };

  // Handle unpair
  const handleUnpair = async (emp: EmployeeDocument) => {
    if (!confirm(`Odpárovat ${emp.name} od uživatelského účtu?`)) return;
    try {
      // Find the linked user and clear their pairedEmployeeId
      const linkedUser = users.find(u => u.uid === emp.linkedUid);
      if (linkedUser) {
        await markUserAsUnpaired(linkedUser.uid);
      }
      await unpairEmployee(emp.id);
    } catch (error) {
      console.error('Error unpairing:', error);
    }
  };

  // Filtered + sorted by type
  const getEmployeesByType = useCallback((type: TeamType) => {
    return employees
      .filter(e => e.type === type)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [employees]);

  const internalEmployees = getEmployeesByType('internal');
  const externalEmployees = getEmployeesByType('external');

  // "Free people" = users who are not paired with any employee, excluding admins
  // Includes: no pairedEmployeeId, empty pairedEmployeeId, or '__none__' (chose not to pair)
  const freeUsers = users.filter(u => {
    const pid = u.pairedEmployeeId;
    const isUnpaired = !pid || pid === '' || pid === '__none__';
    return isUnpaired && u.role !== 'admin';
  });

  // Users available for manual pairing (not yet paired)
  const unparedUsersForPairing = users.filter(u => {
    const hasPairing = u.pairedEmployeeId && u.pairedEmployeeId !== '';
    return !hasPairing;
  });

  // Find linked user for an employee
  const findLinkedUser = (emp: EmployeeDocument) => {
    if (emp.linkedUid) return users.find(u => u.uid === emp.linkedUid);
    return undefined;
  };

  // ===== DRAG & DROP HANDLERS =====
  const handleDragStart = (e: React.DragEvent, emp: EmployeeDocument, sourceType: TeamType, sourceIndex: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', emp.id);
    setDragState({ employeeId: emp.id, sourceType, sourceIndex });
  };

  // Drag start for free users
  const handleFreeUserDragStart = (e: React.DragEvent, user: UserProfile) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `free_user_${user.uid}`);
    setDragState({ employeeId: '', sourceType: 'unassigned', sourceIndex: 0, freeUserUid: user.uid });
  };

  const handleDragOver = (e: React.DragEvent, targetType: TeamType, targetIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget({ type: targetType, index: targetIndex });
  };

  const handleDragOverColumn = (e: React.DragEvent, targetType: TeamType) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const typeEmps = getEmployeesByType(targetType);
    setDragOverTarget({ type: targetType, index: typeEmps.length });
  };

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, targetType: TeamType, targetIndex: number) => {
    e.preventDefault();
    if (!dragState) return;

    // Handle FREE USER drop → create employee + pair
    if (dragState.freeUserUid) {
      const freeUser = users.find(u => u.uid === dragState.freeUserUid);
      if (!freeUser) return;
      try {
        const typeEmps = getEmployeesByType(targetType);
        const newEmpId = (freeUser.displayName || freeUser.email || 'user')
          .toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now().toString(36);
        
        // Create the employee
        await saveEmployee({
          id: newEmpId,
          name: freeUser.displayName || freeUser.email || 'Bez jména',
          position: '',
          type: targetType as 'internal' | 'external',
          order: typeEmps.length,
        });

        // Pair employee ↔ user
        await pairEmployeeToUser(newEmpId, freeUser.uid);
        await pairUserToEmployee(
          freeUser.uid,
          newEmpId,
          freeUser.displayName || freeUser.email || 'Bez jména',
          '',
          targetType as 'internal' | 'external'
        );
      } catch (error) {
        console.error('Error creating employee from free user:', error);
      } finally {
        setDragState(null);
        setDragOverTarget(null);
      }
      return;
    }

    // Handle normal EMPLOYEE drag
    const { employeeId, sourceType } = dragState;
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;

    try {
      if (sourceType === targetType) {
        const typeEmps = [...getEmployeesByType(targetType)];
        const fromIdx = typeEmps.findIndex(e => e.id === employeeId);
        if (fromIdx === -1) return;
        typeEmps.splice(fromIdx, 1);
        typeEmps.splice(targetIndex > fromIdx ? targetIndex - 1 : targetIndex, 0, emp);
        const updates = typeEmps.map((e, i) => ({ id: e.id, order: i }));
        await reorderEmployeesInType(updates);
      } else {
        await updateEmployeeType(employeeId, targetType, targetIndex);
        const sourceEmps = getEmployeesByType(sourceType).filter(e => e.id !== employeeId);
        const sourceUpdates = sourceEmps.map((e, i) => ({ id: e.id, order: i }));
        if (sourceUpdates.length > 0) await reorderEmployeesInType(sourceUpdates);
        const targetEmps = getEmployeesByType(targetType);
        const newTargetList = [...targetEmps];
        newTargetList.splice(targetIndex, 0, { ...emp, type: targetType, order: targetIndex } as EmployeeDocument);
        const targetUpdates = newTargetList.map((e, i) => ({ id: e.id, order: i }));
        await reorderEmployeesInType(targetUpdates);
      }
    } catch (error) {
      console.error('Error during drag-and-drop:', error);
    } finally {
      setDragState(null);
      setDragOverTarget(null);
    }
  };

  const handleDropOnColumn = async (e: React.DragEvent, targetType: TeamType) => {
    const typeEmps = getEmployeesByType(targetType);
    await handleDrop(e, targetType, typeEmps.length);
  };

  const handleDragEnd = () => {
    setDragState(null);
    setDragOverTarget(null);
  };

  // ===== RENDER EMPLOYEE CARD =====
  const renderDraggableCard = (emp: EmployeeDocument, type: TeamType, index: number) => {
    const linkedUser = findLinkedUser(emp);
    const isDragging = dragState?.employeeId === emp.id;
    const isDropTarget = dragOverTarget?.type === type && dragOverTarget?.index === index;

    return (
      <div key={emp.id}>
        {isDropTarget && (
          <div className="h-1 bg-blue-400 rounded-full mx-2 mb-1 animate-pulse" />
        )}
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, emp, type, index)}
          onDragOver={(e) => handleDragOver(e, type, index)}
          onDragEnd={handleDragEnd}
          className={`group flex items-center gap-3 py-3 px-4 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
            isDragging
              ? 'opacity-40 scale-95 border-blue-300 bg-blue-50'
              : 'border-transparent hover:border-slate-200 bg-white hover:shadow-sm'
          }`}
        >
          <div className="flex-shrink-0 text-slate-300 group-hover:text-slate-400 transition-colors">
            <GripVertical size={16} />
          </div>

          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
            type === 'internal'
              ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
              : 'bg-gradient-to-br from-blue-400 to-blue-600'
          }`}>
            {emp.name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900 truncate">{emp.name}</span>
              {linkedUser && (
                <>
                  {linkedUser.role === 'admin' && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                      <Crown size={10} /> Admin
                    </span>
                  )}
                  {linkedUser.isOnline && (
                    <Circle size={8} className="text-emerald-500 fill-emerald-500" />
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {emp.position && (
                <span className="text-xs text-slate-400 truncate">{emp.position}</span>
              )}
              {linkedUser ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-emerald-50 text-emerald-600">
                  ✓ {linkedUser.email}
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-400">
                  Nepárováno
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {!linkedUser ? (
              <button
                onClick={(e) => { e.stopPropagation(); setPairingEmployee(emp); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                title="Spárovat s účtem"
              >
                <Link2 size={14} />
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); handleUnpair(emp); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
                title="Odpárovat"
              >
                <Link2Off size={14} />
              </button>
            )}
            {linkedUser && linkedUser.role !== 'admin' && (
              <button
                onClick={(e) => { e.stopPropagation(); updateUserRole(linkedUser.uid, 'admin'); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                title="Nastavit jako admin"
              >
                <Crown size={14} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleEdit(emp); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
              title="Upravit"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(emp.id, emp.name); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
              title="Smazat"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ===== RENDER TEAM COLUMN =====
  const renderTeamColumn = (
    title: string,
    type: TeamType,
    emps: EmployeeDocument[],
    icon: React.ReactNode,
    accentColor: string,
    bgColor: string,
    borderColor: string
  ) => {
    const isColumnDropTarget = dragState && dragOverTarget?.type === type && dragOverTarget?.index === emps.length;

    return (
      <div
        className={`rounded-2xl border-2 transition-all ${
          dragState && dragState.sourceType !== type
            ? `${borderColor} shadow-lg`
            : 'border-slate-200/60'
        } ${bgColor} overflow-hidden`}
        onDragOver={(e) => handleDragOverColumn(e, type)}
        onDrop={(e) => handleDropOnColumn(e, type)}
        onDragLeave={handleDragLeave}
      >
        <div className={`px-4 py-3 border-b ${borderColor} bg-white/60 backdrop-blur-sm`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl ${accentColor} flex items-center justify-center text-white shadow-sm`}>
                {icon}
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">{title}</h3>
                <p className="text-[11px] text-slate-400 font-medium">{emps.length} {emps.length === 1 ? 'osoba' : emps.length >= 2 && emps.length <= 4 ? 'osoby' : 'osob'}</p>
              </div>
            </div>
            <div className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
              Pořadí = kalendář
            </div>
          </div>
        </div>

        <div className="p-2 min-h-[120px] space-y-1">
          {emps.map((emp, idx) => renderDraggableCard(emp, type, idx))}

          {emps.length === 0 && !dragState && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <Users size={20} className="text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-400">Žádní zaměstnanci</p>
              <p className="text-xs text-slate-300 mt-1">Přetáhněte sem osoby</p>
            </div>
          )}

          {dragState && (
            <div
              className={`border-2 border-dashed rounded-xl py-4 text-center transition-all ${
                isColumnDropTarget
                  ? 'border-blue-400 bg-blue-50/50'
                  : 'border-slate-200 bg-slate-50/30'
              }`}
              onDragOver={(e) => handleDragOverColumn(e, type)}
              onDrop={(e) => handleDropOnColumn(e, type)}
            >
              <p className={`text-xs font-medium ${isColumnDropTarget ? 'text-blue-500' : 'text-slate-300'}`}>
                {isColumnDropTarget ? '↓ Pustit zde' : 'Přetáhněte sem'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Správa zaměstnanců</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {employees.length} zaměstnanců · {users.length} účtů · {freeUsers.length} volných
        </p>
      </div>

      {/* Edit form */}
      {showEditForm && editingId && (
        <div className="dashboard-card mb-6 animate-fade-in">
          <h3 className="font-semibold mb-4 text-slate-900">Upravit zaměstnance</h3>
          <div className="space-y-4">
            <div>
              <label className="form-label">Jméno *</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                className="form-input" placeholder="Celé jméno" autoFocus />
            </div>
            <div>
              <label className="form-label">Pozice</label>
              <input type="text" value={formPosition} onChange={(e) => setFormPosition(e.target.value)}
                className="form-input" placeholder="Např. Developer, Designer..." />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button onClick={handleSave} disabled={saving || !formName.trim()} className="primary-btn">
                <Check size={16} /> Uložit
              </button>
              <button onClick={resetForm} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">
                Zrušit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Free people section */}
      {freeUsers.length > 0 && (
        <div className="mb-6 rounded-2xl border-2 border-amber-200 bg-amber-50/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-200 bg-white/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-sm">
                <UserX size={16} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Volní lidé</h3>
                <p className="text-[11px] text-amber-600 font-medium">{freeUsers.length} {freeUsers.length === 1 ? 'nespárovaný uživatel' : 'nespárovaných uživatelů'}</p>
              </div>
            </div>
          </div>
          <div className="p-3 space-y-2">
            {freeUsers.map(u => (
              <div
                key={u.uid}
                draggable
                onDragStart={(e) => handleFreeUserDragStart(e, u)}
                onDragEnd={handleDragEnd}
                className={`group flex items-center gap-3 py-2.5 px-3 bg-white rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                  dragState?.freeUserUid === u.uid
                    ? 'opacity-40 scale-95 border-amber-300 bg-amber-50'
                    : 'border-transparent hover:border-amber-200'
                }`}
              >
                <div className="flex-shrink-0 text-slate-300 group-hover:text-amber-400 transition-colors">
                  <GripVertical size={16} />
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {(u.displayName || u.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-900 truncate">
                    {u.displayName || 'Bez jména'}
                  </div>
                  <div className="text-xs text-slate-400 truncate">{u.email}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  {u.isOnline && (
                    <Circle size={8} className="text-emerald-500 fill-emerald-500" />
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                    {u.pairedEmployeeId === '__none__' ? 'Nezařazen' : 'Čeká na spárování'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2 bg-amber-50/50 border-t border-amber-100">
            <p className="text-[11px] text-amber-600">
              💡 Přetáhněte uživatele do interního nebo externího týmu — automaticky se vytvoří zaměstnanec a spáruje s účtem.
            </p>
          </div>
        </div>
      )}

      {/* Two column layout for teams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderTeamColumn(
          'Interní tým',
          'internal',
          internalEmployees,
          <Building2 size={16} />,
          'bg-gradient-to-br from-emerald-400 to-emerald-600',
          'bg-emerald-50/30',
          'border-emerald-300'
        )}

        {renderTeamColumn(
          'Externí tým',
          'external',
          externalEmployees,
          <Globe size={16} />,
          'bg-gradient-to-br from-blue-400 to-blue-600',
          'bg-blue-50/30',
          'border-blue-300'
        )}
      </div>

      {/* Info banner */}
      <div className="mt-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
        <span className="text-lg">💡</span>
        <div className="text-xs text-blue-700 space-y-1">
          <p><strong>Drag & Drop</strong> — Přetahujte zaměstnance mezi interním a externím týmem. Pořadí ovlivňuje pořadí v kalendáři.</p>
          <p><strong>Párování</strong> — Nově registrovaní uživatelé si sami spárují svůj účet se zaměstnancem. Můžete je také spárovat ručně kliknutím na ikonu 🔗.</p>
        </div>
      </div>

      {/* Pairing modal */}
      {pairingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">
              Spárovat: {pairingEmployee.name}
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Vyberte uživatelský účet pro spárování
            </p>

            <div className="max-h-[300px] overflow-auto space-y-2">
              {unparedUsersForPairing.length > 0 ? (
                unparedUsersForPairing.map(u => (
                  <button
                    key={u.uid}
                    onClick={() => handleManualPair(pairingEmployee, u)}
                    disabled={saving}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(u.displayName || u.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{u.displayName || 'Bez jména'}</div>
                      <div className="text-xs text-slate-400 truncate">{u.email}</div>
                    </div>
                    {u.isOnline && (
                      <Circle size={8} className="text-emerald-500 fill-emerald-500 flex-shrink-0" />
                    )}
                  </button>
                ))
              ) : (
                <div className="py-6 text-center text-sm text-slate-400">
                  Žádní nespárovaní uživatelé
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setPairingEmployee(null)}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
              >
                Zrušit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
