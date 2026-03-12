'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToEmployees, EmployeeDocument } from '@/lib/employees';
import { subscribeToCompanies, Company } from '@/lib/companies';
import { saveSubTasks, SubTask } from '@/lib/database';
import { formatDate } from '@/lib/utils';
import {
  ClipboardList, Plus, Check, User, Users,
  Calendar, Building2, Send, Layers
} from 'lucide-react';

export default function AdminTasksPage() {
  const { userProfile } = useAuth();
  const [employees, setEmployees] = useState<EmployeeDocument[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  // Form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDate, setTaskDate] = useState(() => formatDate(new Date()));
  const [assignMode, setAssignMode] = useState<'specific' | 'pool'>('specific');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const unsub1 = subscribeToEmployees(setEmployees);
    const unsub2 = subscribeToCompanies(setCompanies);
    return () => { unsub1(); unsub2(); };
  }, []);

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) return;
    if (assignMode === 'specific' && !selectedEmployee) return;

    setSaving(true);
    try {
      const newSubTask: SubTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        content: taskTitle.trim(),
        status: 'pending',
        timeMinutes: 0,
        order: 0
      };

      if (assignMode === 'specific') {
        // Assign to specific employee
        await saveSubTasks(selectedEmployee, taskDate, [newSubTask]);
        setSuccess(`Úkol přiřazen: ${selectedEmployee}`);
      } else {
        // Pool task — assign to all employees so everyone can see it
        const promises = employees.map(emp =>
          saveSubTasks(emp.name, taskDate, [{ ...newSubTask, id: `pool_${Date.now()}_${emp.name}_${Math.random().toString(36).substring(2, 5)}` }])
        );
        await Promise.all(promises);
        setSuccess(`Pool úkol vytvořen pro ${employees.length} zaměstnanců`);
      }

      // Reset form
      setTaskTitle('');
      setTaskDescription('');
      setEstimatedHours('');

      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Chyba při vytváření úkolu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Plánování úkolů</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Vytvářejte a přiřazujte úkoly zaměstnancům
        </p>
      </div>

      {/* Success message */}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-xl animate-fade-in flex items-center gap-2"
          style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
          <Check size={16} />
          <span className="text-sm font-medium">{success}</span>
        </div>
      )}

      {/* Create task form */}
      <div className="dashboard-card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={18} style={{ color: 'var(--primary)' }} />
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Nový úkol</h3>
        </div>

        <div className="space-y-4">
          {/* Task title */}
          <div>
            <label className="form-label">Název úkolu *</label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="form-input"
              placeholder="Co je potřeba udělat?"
            />
          </div>

          {/* Date */}
          <div>
            <label className="form-label">Datum</label>
            <div className="relative">
              <Calendar size={16} className="input-icon" />
              <input
                type="date"
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>

          {/* Estimated hours */}
          <div>
            <label className="form-label">Odhadovaný čas (hodiny)</label>
            <input
              type="number"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              className="form-input"
              placeholder="Např. 2.5"
              step="0.5"
              min="0"
            />
          </div>

          {/* Assignment mode */}
          <div>
            <label className="form-label">Přiřazení</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAssignMode('specific')}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: assignMode === 'specific' ? 'var(--primary-bg)' : 'var(--surface-hover)',
                  color: assignMode === 'specific' ? 'var(--primary)' : 'var(--text-muted)',
                  border: assignMode === 'specific' ? '2px solid var(--primary)' : '2px solid transparent',
                }}
              >
                <User size={16} />
                Konkrétní osoba
              </button>
              <button
                onClick={() => setAssignMode('pool')}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: assignMode === 'pool' ? 'var(--warning-bg)' : 'var(--surface-hover)',
                  color: assignMode === 'pool' ? '#b45309' : 'var(--text-muted)',
                  border: assignMode === 'pool' ? '2px solid var(--warning)' : '2px solid transparent',
                }}
              >
                <Layers size={16} />
                Pool (všichni)
              </button>
            </div>
          </div>

          {/* Employee selector (specific mode) */}
          {assignMode === 'specific' && (
            <div className="animate-fade-in">
              <label className="form-label">Zaměstnanec *</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="form-input"
              >
                <option value="">Vyberte zaměstnance...</option>
                <optgroup label="Interní tým">
                  {employees.filter(e => e.type === 'internal').map(emp => (
                    <option key={emp.id} value={emp.name}>{emp.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Externí tým">
                  {employees.filter(e => e.type === 'external').map(emp => (
                    <option key={emp.id} value={emp.name}>{emp.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}

          {assignMode === 'pool' && (
            <div className="px-4 py-3 rounded-xl animate-fade-in"
              style={{ background: 'var(--warning-bg)' }}>
              <p className="text-xs font-medium" style={{ color: '#92400e' }}>
                ⚡ Pool úkol se zobrazí všem {employees.length} zaměstnancům v jejich kalendáři
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleCreateTask}
            disabled={saving || !taskTitle.trim() || (assignMode === 'specific' && !selectedEmployee)}
            className="primary-btn w-full"
          >
            {saving ? (
              <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            ) : (
              <>
                <Send size={16} />
                {assignMode === 'specific' ? 'Přiřadit úkol' : 'Vytvořit pool úkol'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="dashboard-card">
        <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Rychlý přehled</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface-hover)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Zaměstnanci</p>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{employees.length}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface-hover)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Firmy</p>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{companies.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
