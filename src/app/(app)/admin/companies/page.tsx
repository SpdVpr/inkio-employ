'use client';

import { useState, useEffect } from 'react';
import {
  subscribeToCompanies, createCompany, updateCompany,
  deleteCompany, Company, COMPANY_COLORS, COMPANY_ICONS
} from '@/lib/companies';
import { Plus, Pencil, Trash2, X, Check, Building2 } from 'lucide-react';

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(COMPANY_COLORS[0]);
  const [formIcon, setFormIcon] = useState(COMPANY_ICONS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToCompanies(setCompanies);
    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormColor(COMPANY_COLORS[0]);
    setFormIcon(COMPANY_ICONS[0]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (company: Company) => {
    setFormName(company.name);
    setFormColor(company.color);
    setFormIcon(company.icon);
    setEditingId(company.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateCompany(editingId, { name: formName.trim(), color: formColor, icon: formIcon });
      } else {
        await createCompany({ name: formName.trim(), color: formColor, icon: formIcon });
      }
      resetForm();
    } catch (error) {
      console.error('Error saving company:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Opravdu smazat firmu "${name}"?`)) return;
    try {
      await deleteCompany(id);
    } catch (error) {
      console.error('Error deleting company:', error);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Správa firem</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {companies.length} {companies.length === 1 ? 'firma' : companies.length < 5 ? 'firmy' : 'firem'}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="primary-btn"
        >
          <Plus size={16} />
          Přidat firmu
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="dashboard-card mb-6 animate-fade-in">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            {editingId ? 'Upravit firmu' : 'Nová firma'}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="form-label">Název firmy *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="form-input"
                placeholder="Např. Inkio s.r.o."
                autoFocus
              />
            </div>

            <div>
              <label className="form-label">Ikona</label>
              <div className="flex flex-wrap gap-2">
                {COMPANY_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setFormIcon(icon)}
                    className="w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all"
                    style={{
                      background: formIcon === icon ? 'var(--primary-bg)' : 'var(--surface-hover)',
                      border: formIcon === icon ? '2px solid var(--primary)' : '2px solid transparent',
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">Barva</label>
              <div className="flex flex-wrap gap-2">
                {COMPANY_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormColor(color)}
                    className="w-8 h-8 rounded-lg transition-all"
                    style={{
                      background: color,
                      outline: formColor === color ? '3px solid var(--primary)' : 'none',
                      outlineOffset: '2px',
                      transform: formColor === color ? 'scale(1.1)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button onClick={handleSave} disabled={saving || !formName.trim()} className="primary-btn">
                <Check size={16} />
                {editingId ? 'Uložit změny' : 'Vytvořit firmu'}
              </button>
              <button onClick={resetForm} className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ color: 'var(--text-secondary)', background: 'var(--surface-hover)' }}>
                Zrušit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Companies list */}
      {companies.length === 0 && !showForm ? (
        <div className="dashboard-card text-center py-12">
          <Building2 size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Zatím žádné firmy</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Přidejte první firmu pro organizaci úkolů</p>
          <button onClick={() => setShowForm(true)} className="primary-btn">
            <Plus size={16} /> Přidat firmu
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {companies.map((company) => (
            <div key={company.id} className="dashboard-card flex items-center justify-between py-3 px-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: company.color + '20', border: `2px solid ${company.color}` }}
                >
                  {company.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{company.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-3 h-3 rounded" style={{ background: company.color }} />
                    <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>{company.color}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleEdit(company)} className="action-btn primary" title="Upravit">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(company.id, company.name)} className="action-btn danger" title="Smazat">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
