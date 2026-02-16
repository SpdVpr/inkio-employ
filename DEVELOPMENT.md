# Development Setup

Tento dokument popisuje, jak nastavit development prostředí s oddělenou Firebase databází.

## 🔧 Nastavení Development Firebase

### 1. Vytvoř nový Firebase projekt
1. Jdi na [Firebase Console](https://console.firebase.google.com/)
2. Klikni "Create a project"
3. Název: `inkio-employ-dev` (nebo podobně)
4. Dokončí setup

### 2. Nastavení Firestore
1. V novém projektu jdi na "Firestore Database"
2. Klikni "Create database"
3. Vyberi "Start in test mode"
4. Vyberi region (stejný jako produkce)

### 3. Získej konfiguraci
1. Project Settings (⚙️) → Your apps → Web app
2. Název: "inkio-schedule-dev"
3. Zkopíruj config objekt

### 4. Aktualizuj .env.local
Nahraď hodnoty v `.env.local` konfigurací z tvého dev projektu:

```env
# Firebase Configuration - DEVELOPMENT
NEXT_PUBLIC_FIREBASE_API_KEY=your_dev_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_dev_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_dev_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_dev_project_id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_dev_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_dev_app_id

# Development flag
NEXT_PUBLIC_ENVIRONMENT=development
```

## 🚀 Spuštění

```bash
npm run dev
```

Aplikace bude:
- Používat development Firebase projekt
- Ukládat data do `schedule_tasks_dev` collection
- Zobrazovat development indikátor v hlavičce

## 📁 Environment soubory

- `.env.local` - Development konfigurace (gitignored)
- `.env.production` - Production konfigurace (gitignored)
- `.env.example` - Template pro nové instalace

## 🔄 Přepínání prostředí

Development prostředí se aktivuje když:
- `NEXT_PUBLIC_ENVIRONMENT=development` NEBO
- `NODE_ENV=development`

Production prostředí se aktivuje když:
- `NODE_ENV=production` A `NEXT_PUBLIC_ENVIRONMENT` není "development"

## 🛡️ Bezpečnost

- Development používá oddělenou Firebase databázi
- Data se ukládají do `*_dev` collections
- Žádné riziko ovlivnění produkčních dat
- Development indikátor je viditelný v UI

## 📊 Migrace dat

Pro testování můžeš zkopírovat data z produkce:
1. Export z produkční Firestore
2. Import do development Firestore
3. Nebo vytvoř testovací data ručně

## 🚀 Produkční nasazení

**DŮLEŽITÉ:** V produkci se používá jiná Firebase databáze!

### Environment soubory:
- `.env.local` - Development (gitignored)
- `.env.production` - Production konfigurace (gitignored)
- `.env.example` - Template

### Produkční deployment:
1. Ujisti se, že máš správnou produkční Firebase konfiguraci
2. Environment proměnné se automaticky načtou podle prostředí
3. V produkci se používá `schedule_tasks` collection (bez _dev suffixu)

### Vercel deployment:
```bash
# Nastav environment variables ve Vercel dashboard
NEXT_PUBLIC_FIREBASE_API_KEY=produkční_hodnota
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=inkio-employ.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=inkio-employ
# ... další produkční hodnoty
```
