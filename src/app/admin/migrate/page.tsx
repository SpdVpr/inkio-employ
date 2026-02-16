'use client';

import { useState } from 'react';
import { migrateEmployeesToFirebase } from '@/lib/employees';
import { defaultEmployees } from '@/lib/utils';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function MigratePage() {
  const [status, setStatus] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleMigrate = async () => {
    setStatus('migrating');
    setErrorMessage('');

    try {
      await migrateEmployeesToFirebase(defaultEmployees);
      setStatus('success');
    } catch (error) {
      console.error('Migration error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Neznámá chyba');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          🔄 Migrace zaměstnanců do Firebase
        </h1>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            Tento nástroj nahraje výchozí seznam zaměstnanců do Firebase databáze.
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Upozornění:</h3>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>Pokud zaměstnanec již existuje, bude aktualizován</li>
              <li>Tuto akci byste měli provést pouze jednou při prvním nastavení</li>
              <li>Po migraci můžete zaměstnance upravovat v Admin rozhraní</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              📋 Budou migrovány tito zaměstnanci ({defaultEmployees.length}):
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
              {defaultEmployees.map((emp, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${emp.type === 'internal' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  <span>{emp.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status zobrazení */}
        {status === 'idle' && (
          <div className="flex gap-3">
            <button
              onClick={handleMigrate}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Spustit migraci
            </button>
            <button
              onClick={() => window.location.href = '/admin'}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Zpět do Admin
            </button>
          </div>
        )}

        {status === 'migrating' && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Loader2 className="animate-spin text-blue-600" size={24} />
            <span className="text-blue-800 font-medium">Probíhá migrace...</span>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <CheckCircle className="text-green-600" size={24} />
              <span className="text-green-800 font-medium">
                Migrace proběhla úspěšně! Všichni zaměstnanci byli nahráni do Firebase.
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = '/admin'}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Přejít do Admin rozhraní
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Zpět na rozvrh
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={24} />
              <div>
                <span className="text-red-800 font-medium block mb-1">
                  Chyba při migraci:
                </span>
                <span className="text-red-700 text-sm">{errorMessage}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStatus('idle')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Zkusit znovu
              </button>
              <button
                onClick={() => window.location.href = '/admin'}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Zpět do Admin
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}