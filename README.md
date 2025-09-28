# 🏢 Docházkový Systém - LOCAL-FIRST

Moderní aplikace pro evidenci docházky s offline funkcionalitou a PWA podporou.

---

## 🎯 Klíčové funkce

### 📱 **Identifikace zaměstnanců**
- **🏷️ NFC čipy** - automatická detekce na pozadí
- **📱 Ruční výběr** - výběr ze seznamu s vyhledáváním

### 🧠 **LOCAL-FIRST architektura**
- **⚡ Okamžitá reakce** - 0ms response time
- **💾 Offline-first** - funguje bez internetu
- **🔄 Background sync** - automatická synchronizace
- **🛡️ Persistent data** - přežije restart

### 🎨 **Modern design**
- **🌙 Dark glassmorphism** theme
- **📱 Tablet optimized** pro kiosky
- **♿ Touch-friendly** interface

---

## 🚀 Spuštění

### **Environment setup**
```bash
# Zkopíruj a uprav .env soubor
cp .env.example .env
```

**Potřebné proměnné v .env:**



### **Instalace a spuštění**
```bash
npm install
npm run dev
```

**Aplikace:** http://localhost:3000

---

## 🏗️ Tech Stack

- **React 19** + **TypeScript**
- **Vite** (dev server)
- **Tailwind CSS** (styling)
- **Zustand** (state management)
- **IndexedDB** (local persistence)
- **Service Worker** (offline sync)
- **PWA** (installable app)

---

## 📊 API Integration

### **Endpoints**
- **Initial Data:** Seznam zaměstnanců + aktivity
- **Completion Webhook:** CREATE/UPDATE docházky do SmartSuite

### **Data formát**
`
---

## 🔧 Debug funkce (dev mode)

```javascript
// V konzoli prohlížeče:
debugApp.showEmployees()    // Zobraz stav zaměstnanců
debugApp.showQueue()        // Zobraz frontu akcí
debugApp.getDebugInfo()     // Info o databázi
debugApp.goOffline()        // Simuluj offline
debugApp.goOnline()         // Simuluj online
```

---

## 📱 Použití

1. **Přihlášení** PIN kódem
2. **Identifikace** NFC čipem nebo výběrem ze seznamu
3. **Akce** - Začít/Ukončit práci
4. **Potvrzení** a návrat na hlavní obrazovku

**Pro zaměstnance s `reportActivity: true` se přidává výběr aktivity při ukončení práce.**

---

## 🔄 Deployment

```bash
npm run build
```

Deploy `dist/` složku na váš hosting (Vercel, Netlify, atd.) a nastavte environment variables.

---

**🎯 Profesionální docházková aplikace připravená k produkčnímu nasazení! 🚀**