# 📚 StudyHub — React + Firebase PWA

Your personal CS study companion. Track your 12-week curriculum, log daily sessions, add custom modules, and share your progress with classmates.

---

## 🚀 Quick Start

### 1. Install dependencies

Make sure you have Node.js installed (`node -v`). Then:

```bash
npm install
```

---

### 2. Set up Firebase (5 minutes)

#### Step 1 — Create a Firebase project
1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"**
3. Name it `studyhub` → click Continue
4. Disable Google Analytics (not needed) → click **Create project**

#### Step 2 — Enable Authentication
1. In your project, click **Authentication** in the left sidebar
2. Click **Get started**
3. Under **Sign-in providers**, enable:
   - **Email/Password** → toggle on → Save
   - **Google** → toggle on → add your support email → Save

#### Step 3 — Create Firestore Database
1. Click **Firestore Database** in the left sidebar
2. Click **Create database**
3. Choose **Start in test mode** (we'll secure it later)
4. Select a region close to you → click **Enable**

#### Step 4 — Register your Web App
1. Click the **gear icon ⚙️** → **Project settings**
2. Scroll down to **"Your apps"** → click the **Web icon (</>)**
3. Name it `studyhub-web` → click **Register app**
4. You'll see a config object like this:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "studyhub-abc.firebaseapp.com",
  projectId: "studyhub-abc",
  storageBucket: "studyhub-abc.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

#### Step 5 — Paste your config
Open `src/firebase/config.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey:            "PASTE YOUR VALUE HERE",
  authDomain:        "PASTE YOUR VALUE HERE",
  projectId:         "PASTE YOUR VALUE HERE",
  storageBucket:     "PASTE YOUR VALUE HERE",
  messagingSenderId: "PASTE YOUR VALUE HERE",
  appId:             "PASTE YOUR VALUE HERE",
};
```

---

### 3. Run the app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3.1 Optional — Enable Gemini AI roadmaps

Create a `.env` file in the project root using `.env.example`:

```bash
cp .env.example .env
```

Then set:

```bash
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_MODEL=gemini-1.5-flash
```

This powers AI-generated weekly study roadmaps for custom modules.

---

### 4. Build for production

```bash
npm run build
```

This creates a `dist/` folder ready to deploy.

---

## 🧭 Phase 1 Access Model

- The app is currently **open access**.
- New users complete a one-time onboarding step after sign-in.
- Academic fields are optional and can be skipped or edited later:
  - `university`
  - `program`
  - `classGroup`
- Future restriction modes are prepared in `src/config/appConfig.js` but are **not enforced yet**.

---

## 🌐 Deploy (Free hosting)

### Option A — Firebase Hosting (recommended, stays in the Google ecosystem)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # select your project, set dist as public folder, SPA: yes
npm run build
firebase deploy
```
You get a free URL like: `https://studyhub-abc.web.app`

If you update Firestore permissions, deploy rules too:

```bash
firebase deploy --only firestore:rules
```

### Option B — Netlify (easiest)
1. Run `npm run build`
2. Go to [https://app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag and drop the `dist/` folder
4. Done — you get a shareable URL instantly

### Option C — Vercel
```bash
npm install -g vercel
vercel
```

---

## 🔐 Firestore Security Rules (before going live)

Replace the default rules in Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can read/write their own profile document
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // Users can read/write their own nested data (modules, logs, meta, etc.)
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // Public profiles are readable by anyone, writable only by owner
    match /public/{uid} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

---

## 📁 Project Structure

```
studyhub/
├── public/
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service worker (offline support)
├── src/
│   ├── firebase/
│   │   ├── config.js       # ← PASTE YOUR FIREBASE CONFIG HERE
│   │   └── db.js           # All Firestore read/write functions
│   ├── config/
│   │   └── appConfig.js    # App access mode placeholder for future restrictions
│   ├── hooks/
│   │   └── useAuth.jsx     # Auth context (Google + email login)
│   ├── services/
│   │   └── geminiRoadmap.js  # Gemini AI roadmap generator
│   ├── components/
│   │   ├── Layout.jsx      # Bottom nav bar
│   │   └── Notif.jsx       # Toast notifications
│   ├── pages/
│   │   ├── AuthPage.jsx    # Login / register
│   │   ├── Onboarding.jsx  # One-time optional academic profile setup
│   │   ├── Dashboard.jsx   # Timer + today's study blocks
│   │   ├── Tracker.jsx     # 12-week curriculum tracker
│   │   ├── MyModules.jsx   # Add/delete custom study modules
│   │   ├── StudyLog.jsx    # Daily study log with mood tracking
│   │   ├── Profile.jsx     # Stats + share link
│   │   └── PublicProfile.jsx # Public shareable profile page
│   ├── data/
│   │   └── curriculum.js   # All 12 weeks of tasks + default modules
│   ├── styles/
│   │   └── globals.css     # Design system (colors, cards, buttons)
│   ├── App.jsx             # Routes
│   └── main.jsx            # Entry point
├── index.html
├── vite.config.js
└── package.json
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 Auth | Sign in with Google or email/password |
| 🎓 Academic Profile | Optional university, program, and class/group onboarding |
| ⏱ Timer | Focus timer with per-session progress bar |
| 📚 Custom Modules | Add your own subjects, focus time, daily study time, and target duration |
| 🤖 AI Roadmaps | Generate Week 0 → Week N study plans for each custom module using Gemini |
| 📅 AI Tracker | Track week-by-week tasks for each module roadmap, synced to your account |
| 📓 Study Log | Log what you studied, how long, and your mood |
| 👥 Share Profile | Enable a public link to share your progress with classmates |
| 📲 PWA | Installs to home screen, works offline |

---

## 🔮 Phase 2 (Later)

Possible future restriction modes:
- university-only access
- class-only access (example: DIT)
- filtered discovery by academic group

These are intentionally not enabled yet so you can improve the app first and collect feedback.

---

## 🧩 Recommended VS Code Extensions

Install these for the best development experience:
- **Prettier** — auto-format on save
- **ESLint** — catch JavaScript errors
- **ES7+ React Snippets** — React shorthand (type `rfce` for a component)
- **GitLens** — Git history in the editor
- **Tailwind CSS IntelliSense** — if you add Tailwind later
