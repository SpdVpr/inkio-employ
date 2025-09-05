// Test Firebase connection
const fs = require('fs');

console.log('🔥 Firebase Configuration Test');
console.log('================================');

try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const lines = envContent.split('\n');

  const config = {};
  lines.forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      config[key.trim()] = value.trim();
    }
  });

  console.log('Project ID:', config.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  console.log('Auth Domain:', config.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
  console.log('Environment:', config.NEXT_PUBLIC_ENVIRONMENT);
  console.log('================================');

  if (config.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'your_dev_project_id') {
    console.log('❌ CHYBA: Ještě jsi neaktualizoval .env.local!');
    console.log('📝 Aktualizuj .env.local s konfigurací z Firebase Console');
  } else if (config.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'inkio-employ') {
    console.log('⚠️  VAROVÁNÍ: Používáš produkční databázi!');
    console.log('🔄 Změň PROJECT_ID na tvůj development projekt');
  } else {
    console.log('✅ Konfigurace vypadá správně!');
    console.log('🚀 Restartuj npm run dev a zkus editovat úkoly');
  }
} catch (error) {
  console.log('❌ Chyba při čtení .env.local:', error.message);
}
