# Employee Shift Schedule - Inkio

Webová aplikace pro plánování týdenních úkolů zaměstnanců firmy Inkio s real-time synchronizací.

## 🚀 Funkce

- **Týdenní zobrazení** - Přehledná tabulka s navigací mezi týdny
- **Real-time editace** - Okamžité ukládání a synchronizace změn
- **Responsive design** - Optimalizováno pro desktop, tablet i mobil
- **Barevné rozlišení** - Interní (zelení) vs externí (modří) zaměstnanci
- **Excel-like UX** - Jednoduché kliknutí a psaní

## 🛠️ Technologie

- **Next.js 14** - React framework s App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Firebase Firestore** - Real-time databáze
- **Vercel** - Hosting

## 📋 Požadavky

- Node.js 18+
- npm nebo yarn
- Firebase projekt

## 🔧 Instalace a spuštění

### 1. Klonování a instalace

```bash
git clone <repository-url>
cd inkio-zamestnanci
npm install
```

### 2. Nastavení Firebase

1. **Vytvořte Firebase projekt:**
   - Jděte na [Firebase Console](https://console.firebase.google.com/)
   - Klikněte "Create a project"
   - Zadejte název projektu (např. "inkio-schedule")
   - Dokončete setup

2. **Nastavte Firestore:**
   - V Firebase Console jděte na "Firestore Database"
   - Klikněte "Create database"
   - Vyberte "Start in test mode" (pro začátek)
   - Vyberte region (europe-west3 pro EU)

3. **Získejte konfiguraci:**
   - Jděte na Project Settings (⚙️ ikona)
   - Scroll dolů na "Your apps"
   - Klikněte "Web app" (</> ikona)
   - Zadejte název aplikace
   - Zkopírujte config objekt

4. **Vytvořte .env.local:**
   ```bash
   cp .env.example .env.local
   ```

   Vyplňte hodnoty z Firebase config:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

### 3. Spuštění aplikace

```bash
npm run dev
```

Aplikace bude dostupná na http://localhost:3000

## 👥 Zaměstnanci

Aplikace obsahuje přednastavené zaměstnance:

**Interní (zelení):**
- Radim, Radek, Věrka, Tonda, Lukáš

**Externí (modří):**
- Vlaďka, Roman, Honza Dočkal, Terka, Michal, Yume

## 🎯 Použití

1. **Navigace:** Použijte šipky pro přepínání mezi týdny
2. **Editace:** Klikněte na buňku a začněte psát
3. **Uložení:** Automatické při opuštění buňky nebo stisknutí Enter
4. **Zrušení:** ESC pro zrušení editace

## 🔒 Firestore Security Rules

Pro produkci nastavte bezpečnostní pravidla:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /schedule_tasks/{document} {
      allow read, write: if true; // Pro začátek - později omezte
    }
  }
}
```

## 🚀 Deploy na Vercel

1. **Připojte GitHub repo:**
   - Jděte na [Vercel](https://vercel.com)
   - Import z GitHub

2. **Nastavte environment variables:**
   - V Vercel dashboard → Settings → Environment Variables
   - Přidejte všechny NEXT_PUBLIC_* proměnné

3. **Deploy:**
   - Automatický při push do main branch

## 📱 Responsive breakpoints

- **Mobile:** < 640px
- **Tablet:** 640px - 1024px
- **Desktop:** > 1024px

## 🔄 Databázová struktura

```typescript
interface ScheduleTask {
  id: string;              // "radim_2025-09-15"
  employeeName: string;    // "Radim"
  taskDate: string;        // "2025-09-15"
  taskContent: string;     // "Retuš produktových fotek"
  updatedAt: Timestamp;    // Firebase timestamp
}
```

## 🐛 Troubleshooting

**Firebase chyby:**
- Zkontrolujte .env.local soubor
- Ověřte Firestore pravidla
- Zkontrolujte Firebase projekt ID

**Build chyby:**
- `npm run build` pro kontrolu
- Zkontrolujte TypeScript chyby

## 📈 Roadmapa

- [ ] Autentifikace uživatelů
- [ ] Drag & drop úkolů
- [ ] Export do Excel
- [ ] Email notifikace
- [ ] PWA podpora
