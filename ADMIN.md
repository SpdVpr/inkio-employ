# Admin rozhraní - Správa zaměstnanců

## 📋 Přehled

Admin rozhraní umožňuje kompletní správu zaměstnanců včetně přidávání, úprav a mazání.

## 🔑 Přístup

**URL:** `http://localhost:3000/admin` (development) nebo `https://vase-domena.com/admin` (production)

**Výchozí heslo:** `inkio2024`

### Změna hesla

Heslo můžete změnit v souboru `.env.local`:

```env
NEXT_PUBLIC_ADMIN_PASSWORD=vase_nove_heslo
```

> ⚠️ **Důležité:** Pro produkční prostředí vždy změňte výchozí heslo!

## 🚀 První spuštění - Migrace zaměstnanců

Při prvním spuštění aplikace je potřeba nahrát zaměstnance do Firebase databáze:

1. Přejděte na admin stránku: `http://localhost:3000/admin`
2. Přihlaste se výchozím heslem: `inkio2024`
3. Pokud nemáte žádné zaměstnance, zobrazí se tlačítko **"Spustit migraci zaměstnanců"**
4. Klikněte na něj a počkejte na dokončení migrace

Alternativně můžete navštívit přímo: `http://localhost:3000/admin/migrate`

### Co migrace dělá?

Migrace nahraje do Firebase tyto výchozí zaměstnance:

**Interní:**
- Radim (Foto / Retuše / Ad Hoc úkoly)
- Radek (Copy)
- Věrka (Copy)
- Tonda (Grafika / DTP)
- Bětka
- Yume (Grafika / Foto)
- Adam (Video Maker)

**Externí:**
- Vlaďka (Copy)
- Roman (DTP / Motion)
- Honza Dočkal (Grafika / DTP)
- Lukáš (3D / Motion)
- Egor (Video editor)

## 📝 Funkce admin rozhraní

### ➕ Přidání zaměstnance

1. Klikněte na tlačítko **"Přidat zaměstnance"**
2. Vyplňte:
   - **Jméno** (povinné)
   - **Pozice** (nepovinné, např. "Grafik / DTP")
   - **Typ** (Interní nebo Externí)
3. Klikněte na **"Uložit"**

### ✏️ Úprava zaměstnance

1. Najděte zaměstnance v seznamu
2. Klikněte na ikonu **tužky** (Edit)
3. Upravte údaje
4. Klikněte na **"Uložit"**

### 🗑️ Smazání zaměstnance

1. Najděte zaměstnance v seznamu
2. Klikněte na ikonu **koše** (Trash)
3. Potvrďte smazání kliknutím na **"Potvrdit"**

> ⚠️ **Upozornění:** Smazání zaměstnance **nesmaže** jejich úkoly v rozvrhu!

### 🔄 Seřazení zaměstnanců (Drag & Drop)

Zaměstnance můžete seřadit pomocí drag and drop funkce:

1. Najděte zaměstnance v seznamu
2. Klikněte a táhněte zaměstnance (pomocí ikony **≡** na levé straně)
3. Přetáhněte zaměstnance na novou pozici
4. Uvolněte myš - zaměstnanec se přesune na novou pozici
5. Pořadí se automaticky uloží do Firebase

**Vizuální indikátory:**
- Při tažení se zaměstnanec zobrazí s nižší průhledností (opacity)
- Cílová pozice je zvýrazněna modrým rámečkem
- Ikona **≡** (GripVertical) ukazuje, že je prvek tažitelný

> 💡 **Tip:** Pořadí zaměstnanců se okamžitě projeví v hlavním rozvrhu na frontendu!

## 🎨 Typy zaměstnanců

### Interní zaměstnanci
- Zobrazují se se **zeleným** indikátorem
- Mají **zelené** pozadí v rozvrhu
- Jsou zobrazeni jako první v seznamu

### Externí zaměstnanci
- Zobrazují se s **modrým** indikátorem
- Mají **modré** pozadí v rozvrhu
- Jsou zobrazeni jako druzí v seznamu

## 🔄 Real-time synchronizace

Všechny změny v admin rozhraní se **okamžitě projeví**:
- V hlavním rozvrhu zaměstnanců
- Na všech zařízeních, která mají aplikaci otevřenou
- Bez nutnosti obnovení stránky

## 🔒 Bezpečnost

### Doporučené bezpečnostní praktiky:

1. **Změňte výchozí heslo** před nasazením do produkce
2. **Nesdílejte heslo** s neautorizovanými osobami
3. Pro **produkci** zvažte implementaci plné autentizace přes Firebase Auth
4. Pravidelně **kontrolujte přístup** k admin rozhraní

### Plánované vylepšení:

- [ ] Multi-uživatelská autentizace přes Firebase Auth
- [ ] Role-based přístup (admin, editor, viewer)
- [ ] Audit log změn
- [ ] Two-factor authentication (2FA)

## 📊 Firestore struktura

Zaměstnanci jsou uloženi v kolekci: `employees` (nebo `employees_dev` v development)

Struktura dokumentu:
```typescript
{
  id: string;              // např. "radim"
  name: string;            // "Radim"
  position: string;        // "Foto / Retuše / Ad Hoc úkoly"
  type: 'internal' | 'external';
  order: number;           // Pořadí v seznamu
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## ❓ Časté problémy

### Nemohu se přihlásit

- Zkontrolujte, že máte správné heslo v `.env.local`
- Zkontrolujte, že aplikace běží (`npm run dev`)
- Zkuste vymazat cache prohlížeče nebo použít anonymní režim

### Zaměstnanci se nezobrazují v rozvrhu

- Proveďte migraci na `/admin/migrate`
- Zkontrolujte Firebase konzoli, zda jsou data v kolekci `employees`
- Zkontrolujte Firestore pravidla (musí povolit čtení)

### Změny se neprojevují okamžitě

- Zkontrolujte připojení k internetu
- Zkontrolujte Firebase konzoli pro případné chyby
- Zkuste obnovit stránku (F5)

## 🛠️ Technické detaily

### Použité soubory:

- `/src/app/admin/page.tsx` - Admin rozhraní
- `/src/app/admin/migrate/page.tsx` - Migrační nástroj
- `/src/lib/employees.ts` - Databázové operace pro zaměstnance
- `/src/lib/utils.ts` - Výchozí seznam zaměstnanců

### API funkce:

```typescript
// Přihlášení k real-time odběru
subscribeToEmployees(callback)

// Načtení zaměstnanců (one-time)
getEmployees()

// Uložení/aktualizace zaměstnance
saveEmployee(employee)

// Smazání zaměstnance
deleteEmployee(employeeId)

// Migrace výchozích zaměstnanců
migrateEmployeesToFirebase(employees)

// Přeuspořádání zaměstnanců
reorderEmployees(employeeIds)
```

## 📞 Podpora

Pokud narazíte na problém nebo máte návrh na vylepšení, kontaktujte vývojový tým nebo vytvořte issue v repozitáři.