'use client';

import { useState, useEffect } from 'react';
import { EmployeeDocument, subscribeToEmployees, saveEmployee, deleteEmployee, reorderEmployees } from '@/lib/employees';
import { Plus, Edit2, Trash2, Save, X, Eye, EyeOff, GripVertical } from 'lucide-react';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [employees, setEmployees] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeDocument | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [draggedEmployee, setDraggedEmployee] = useState<EmployeeDocument | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Formulářové pole
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    type: 'internal' as 'internal' | 'external'
  });

  // Zkontrolovat, zda je uživatel již přihlášen (z sessionStorage)
  useEffect(() => {
    const authenticated = sessionStorage.getItem('admin_authenticated');
    if (authenticated === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Přihlášení k odběru zaměstnanců
  useEffect(() => {
    if (!isAuthenticated) return;

    setLoading(true);
    const unsubscribe = subscribeToEmployees((employeeList) => {
      setEmployees(employeeList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Přihlášení
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Jednoduché heslo - v produkci by mělo být v env proměnné
    const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'inkio2024';
    
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_authenticated', 'true');
      setPasswordError('');
    } else {
      setPasswordError('Nesprávné heslo');
      setPassword('');
    }
  };

  // Odhlášení
  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_authenticated');
    setPassword('');
  };

  // Zahájit editaci
  const handleEdit = (employee: EmployeeDocument) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      position: employee.position,
      type: employee.type
    });
    setIsAddingNew(false);
    // Automaticky scrollovat nahoru k formuláři
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Zahájit přidání nového
  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingEmployee(null);
    setFormData({
      name: '',
      position: '',
      type: 'internal'
    });
  };

  // Zrušit editaci/přidání
  const handleCancel = () => {
    setEditingEmployee(null);
    setIsAddingNew(false);
    setFormData({
      name: '',
      position: '',
      type: 'internal'
    });
  };

  // Uložit zaměstnance
  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Jméno zaměstnance je povinné');
      return;
    }

    try {
      const id = isAddingNew 
        ? formData.name.toLowerCase().replace(/\s+/g, '_')
        : editingEmployee!.id;

      const order = isAddingNew 
        ? employees.length 
        : editingEmployee!.order;

      await saveEmployee({
        id,
        name: formData.name,
        position: formData.position,
        type: formData.type,
        order
      });

      handleCancel();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Chyba při ukládání zaměstnance');
    }
  };

  // Smazat zaměstnance
  const handleDelete = async (employeeId: string) => {
    try {
      await deleteEmployee(employeeId);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Chyba při mazání zaměstnance');
    }
  };

  // Drag and drop funkce
  const handleDragStart = (employee: EmployeeDocument) => {
    setDraggedEmployee(employee);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (index: number) => {
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (targetIndex: number) => {
    if (!draggedEmployee) return;

    setDragOverIndex(null);

    // Najdi index původního zaměstnance
    const sourceIndex = employees.findIndex(e => e.id === draggedEmployee.id);
    if (sourceIndex === targetIndex) {
      setDraggedEmployee(null);
      return;
    }

    // Vytvoř nové pole s přesunutým zaměstnancem
    const newEmployees = [...employees];
    const [movedEmployee] = newEmployees.splice(sourceIndex, 1);
    newEmployees.splice(targetIndex, 0, movedEmployee);

    // Aktualizuj lokálně
    setEmployees(newEmployees);
    setDraggedEmployee(null);

    // Ulož nové pořadí do Firebase
    try {
      const employeeIds = newEmployees.map(e => e.id);
      await reorderEmployees(employeeIds);
    } catch (error) {
      console.error('Error reordering employees:', error);
      alert('Chyba při změně pořadí zaměstnanců');
      // Vrať zpět původní pořadí
      setEmployees(employees);
    }
  };

  // Login formulář
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            🔒 Admin přístup
          </h1>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Heslo
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 text-gray-900 bg-white"
                  placeholder="Zadejte heslo"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {passwordError && (
                <p className="mt-2 text-sm text-red-600">{passwordError}</p>
              )}
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Přihlásit se
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-500">
          </div>
        </div>
      </div>
    );
  }

  // Admin rozhraní
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Hlavička */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🔧 Admin - Správa zaměstnanců
            </h1>
            <p className="text-gray-600 mt-1">
              Přidávejte, upravujte a mažte zaměstnance
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Zpět na rozvrh
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Odhlásit se
            </button>
          </div>
        </div>

        {/* Tlačítko přidat nového */}
        {!isAddingNew && !editingEmployee && (
          <div className="mb-6">
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus size={20} />
              Přidat zaměstnance
            </button>
          </div>
        )}

        {/* Formulář pro přidání/editaci */}
        {(isAddingNew || editingEmployee) && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-2 border-blue-500">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {isAddingNew ? '➕ Nový zaměstnanec' : '✏️ Upravit zaměstnance'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jméno *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="např. Jan Novák"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pozice
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="např. Grafik / DTP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Typ zaměstnance *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="internal"
                      checked={formData.type === 'internal'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'internal' | 'external' })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="flex items-center gap-2 text-gray-900">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      Interní
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="external"
                      checked={formData.type === 'external'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'internal' | 'external' })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="flex items-center gap-2 text-gray-900">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      Externí
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save size={18} />
                  Uložit
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <X size={18} />
                  Zrušit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Seznam zaměstnanců */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Zaměstnanci ({employees.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Načítání...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mb-6">
                <p className="text-gray-600 text-lg mb-2">Zatím nemáte žádné zaměstnance.</p>
                <p className="text-sm text-gray-500">Můžete je přidat ručně nebo nahrát výchozí seznam.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={() => window.location.href = '/admin/migrate'}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                >
                  🔄 Spustit migraci zaměstnanců
                </button>
                <span className="text-gray-400">nebo</span>
                <button
                  onClick={handleAddNew}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                >
                  <Plus size={20} />
                  Přidat ručně
                </button>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left max-w-md mx-auto">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Tip:</h4>
                <p className="text-sm text-blue-800">
                  Migrace nahraje 12 výchozích zaměstnanců (7 interních + 5 externích) do Firebase.
                  Poté je můžete upravovat nebo mazat podle potřeby.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {/* Interní zaměstnanci */}
              <div className="p-4 bg-green-50">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  Interní zaměstnanci
                </h3>
                <div className="space-y-2">
                  {employees.filter(e => e.type === 'internal').map((employee, index) => {
                    const allIndex = employees.findIndex(e => e.id === employee.id);
                    return (
                      <div
                        key={employee.id}
                        draggable
                        onDragStart={() => handleDragStart(employee)}
                        onDragOver={handleDragOver}
                        onDragEnter={() => handleDragEnter(allIndex)}
                        onDragLeave={handleDragLeave}
                        onDrop={() => handleDrop(allIndex)}
                        className={`flex items-center justify-between p-3 bg-white rounded-lg cursor-move transition-all ${
                          draggedEmployee?.id === employee.id ? 'opacity-50' : ''
                        } ${
                          dragOverIndex === allIndex ? 'ring-2 ring-blue-400 bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <GripVertical size={18} className="text-gray-400 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{employee.name}</div>
                            <div className="text-sm text-gray-500">{employee.position || '—'}</div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(employee)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Upravit"
                          >
                            <Edit2 size={18} />
                          </button>

                          {deleteConfirm === employee.id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDelete(employee.id)}
                                className="px-3 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors text-sm"
                              >
                                Potvrdit
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-3 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                              >
                                Zrušit
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(employee.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Smazat"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Externí zaměstnanci */}
              <div className="p-4 bg-blue-50">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  Externí zaměstnanci
                </h3>
                <div className="space-y-2">
                  {employees.filter(e => e.type === 'external').map((employee) => {
                    const allIndex = employees.findIndex(e => e.id === employee.id);
                    return (
                      <div
                        key={employee.id}
                        draggable
                        onDragStart={() => handleDragStart(employee)}
                        onDragOver={handleDragOver}
                        onDragEnter={() => handleDragEnter(allIndex)}
                        onDragLeave={handleDragLeave}
                        onDrop={() => handleDrop(allIndex)}
                        className={`flex items-center justify-between p-3 bg-white rounded-lg cursor-move transition-all ${
                          draggedEmployee?.id === employee.id ? 'opacity-50' : ''
                        } ${
                          dragOverIndex === allIndex ? 'ring-2 ring-blue-400 bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <GripVertical size={18} className="text-gray-400 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{employee.name}</div>
                            <div className="text-sm text-gray-500">{employee.position || '—'}</div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(employee)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Upravit"
                          >
                            <Edit2 size={18} />
                          </button>

                          {deleteConfirm === employee.id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDelete(employee.id)}
                                className="px-3 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors text-sm"
                              >
                                Potvrdit
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-3 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                              >
                                Zrušit
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(employee.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Smazat"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upozornění a užitečné odkazy */}
        <div className="mt-6 space-y-4">
          {/* Migrace zaměstnanců */}
          {employees.length === 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">🔄 První spuštění?</h3>
              <p className="text-sm text-blue-800 mb-3">
                Vypadá to, že ještě nemáte žádné zaměstnance v databázi. 
                Můžete nahrát výchozí seznam pomocí migračního nástroje.
              </p>
              <button
                onClick={() => window.location.href = '/admin/migrate'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Spustit migraci zaměstnanců
              </button>
            </div>
          )}

          {/* Upozornění */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Důležité upozornění</h3>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>Změny se okamžitě projeví v hlavním rozvrhu</li>
              <li>Smazání zaměstnance nesmaže jejich úkoly v rozvrhu</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

}
