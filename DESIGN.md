# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UniGuide is a React/Vite PWA for Sierra Leone featuring an AI assistant (AskUni) powered by Gemini API and Firebase backend. It provides educational guidance through university, course, and career exploration with role-specific dashboards for students, teachers/advisors, and parents/guardians.

## Commands

```bash
npm run dev          # Start dev server (localhost:5173)
npm run build        # Generate API + production build
npm run lint         # ESLint
npm run preview      # Preview production build
npm run generate-api # Generate static JSON API files from universities.json
```

## Architecture

### State Management
- **AuthContext** (`src/context/AuthContext.jsx`) - Authentication state and methods
- **Custom hooks** encapsulate business logic - no Redux despite being installed
- **Firestore `onSnapshot`** for real-time data sync throughout the app

### Key Hooks
- `useUserProfile` - Profile management with Firestore sync
- `useSmartAskUni` - AI chat with context injection (user profile + university data)
- `useChatAssistant` - Chat state management
- `useUserAnalytics` - Engagement tracking
- `useInviteCode` - Student invite code generation/management
- `useLinkedAccounts` - Account linking (all roles)
- `useLinkedStudents` - Teacher's linked students with profile hydration
- `useStudentProgress` / `useChildProgress` - Individual student data (teacher/parent)
- `useGuidanceTrends` - Aggregated trends across linked students (teacher)
- `useTeacherNotes` - CRUD for private counseling notes
- `useFeedbackMessages` - Structured feedback between teachers and students
- `useChildInsights` - Child's saved items resolved to full objects (parent)
- `useMilestones` - Student milestone tracking
- `useParentNotifications` - Targeted notification listener (parent)

### AI System (AskUni)
- `src/services/geminiAI.js` - Basic Gemini wrapper
- `src/services/enhancedGeminiAPI.js` - Advanced AI with analytics
- Model: `gemini-2.5-flash`
- Responses contextualized with user profile + university database

### Firebase Services
- **Auth**: Email/Password + Google OAuth
- **Firestore collections**:
  - `users/{uid}` — user profiles (all roles)
  - `userAnalytics/{uid}` — engagement tracking
  - `universities` — university data
  - `inviteCodes/{code}` — 6-char invite codes for account linking (7-day expiry)
  - `linkedAccounts/{docId}` — parent/teacher ↔ student links (status: active/revoked)
  - `userJourney/{uid}` — guided journey progress (student)
  - `teacherNotes/{noteId}` — private counseling notes (teacher only)
  - `feedbackMessages/{msgId}` — structured feedback (teacher → student)
  - `milestones/{milestoneId}` — student achievement milestones
  - `notifications` — platform-wide + targeted notifications
- **Offline persistence** enabled via IndexedDB

### Routing & Auth Flow
- `ProtectedRoute` wraps `/dashboard/*` with `requireProfileComplete={true}` — blocks access until profile is done
- `ProtectedRoute` wraps `/complete-profile` (auth only, no profile check)
- `RoleDashboardRouter` reads `userProfile.role` and renders the correct dashboard shell:
  - **Student** → `StudentDashboard` (wraps existing `DashboardRoutes.jsx` + new journey/subject-map routes)
  - **Educator** → `TeacherDashboard` (separate routes, sidebar, pages)
  - **Parent** → `ParentDashboard` (separate routes, sidebar, pages)
- All role dashboards use `DashboardShell` — shared layout wrapper (sidebar + navbar + content area)
- Flow: Signup → CompleteProfile (4-step form) → Role-specific Dashboard
- Smart skip: users can skip the form after selecting role + at least 1 preferred subject (`profilePartial: true`)

### User Roles
Three roles: **Student**, **Parent**, **Educator**. Selected during profile completion. Each role gets a distinct dashboard experience.

**Student Dashboard** — full educational guidance platform:
- All existing features (courses, universities, careers, pathfinder, AskUni, saved items)
- Guided Journey — 5-step career exploration flow persisted in Firestore (`userJourney/{uid}`)
- Subject-to-Career Map — select WASSCE subjects, see matching careers and courses
- Invite code generation from Settings (share with parent/teacher to link accounts)

**Teacher/Advisor Dashboard** (`src/dashboard/teacher/`):
- Home overview with student stats, active/inactive counts, quick actions
- Student List with search/filter by activity status
- Individual Student Progress view (engagement, saved items, recent activity)
- Guidance Trends — aggregated career interests and course popularity across linked students
- Counseling Notes — private per-student notes (CRUD, categorized)
- Feedback system — send structured recommendations/feedback/action items to students
- Link Students — enter invite codes to connect with students

**Parent/Guardian Dashboard** (`src/dashboard/parent/`):
- Home overview with child's recent activity, stats, journey progress
- Child Progress — detailed engagement and journey tracking
- Interest Insights — read-only view of child's saved careers, courses, universities
- Milestones — timeline of child's achievements
- Teacher Feedback — read-only view of feedback from teachers
- Link Child — enter invite code to connect with student

**Account Linking System** (`src/services/linkingService.js`):
- Students generate 6-char alphanumeric invite codes (7-day expiry)
- Parents/teachers claim codes to create a `linkedAccounts` entry
- Validation: expiry check, no self-linking, no duplicate links, role restrictions
- Links can be revoked by either party
- `linkingService.js` maintains arrays on user docs via `arrayUnion`/`arrayRemove`:
  - Student's doc → `linkedAdults: [uid, ...]` (parent/teacher UIDs)
  - Parent/Teacher's doc → `linkedStudents: [uid, ...]` (student UIDs)

### Firestore Security Rules (`firestore.rules`)

Rules use linked-account arrays for cross-user access control. Two helper functions:
- `isLinkedToStudent(studentUid, auth)` — checks requester's `linkedStudents` array (1 `get()` call)
- `isLinkedAdult(userId, auth)` — checks target user's `linkedAdults` array (1 `get()` call)

**Access model per collection:**
| Collection | Who can read | Who can write |
|---|---|---|
| `users/{userId}` | Owner, super admin, university admin, linked accounts (`resource.data.linkedAdults`/`linkedStudents`) | Owner (role set-once), super admin, university admin (limited fields) |
| `userAnalytics/{userId}` | Owner, super admin, linked teacher/parent, university admin | Owner only |
| `linkedAccounts/{docId}` | Either party (`studentUid` or `linkedUid` match) | Create: any auth. Update/delete: either party |
| `feedbackMessages/{msgId}` | Sender, receiver, or linked parent of receiver | Create: sender. Update: sender/receiver. Delete: sender |
| `userJourney/{uid}` | Owner, super admin, linked adults | Owner only |
| `milestones/{milestoneId}` | Student or linked teacher/parent | Create: student only. Update/delete: super admin |
| `teacherNotes/{noteId}` | Author teacher only | Author teacher only |
| `notifications` | Super admin, approved admin, platform-wide, targeted (`targetUids`), email-based | Create: admin or auth with required fields (`targetUids`, `type`, `createdAt`). Update: `readBy` only |
| `inviteCodes/{code}` | Any authenticated (needed to claim) | Create: student. Update: owner or unclaimed. Delete: owner |

**Firestore `get()` budget:** max 1 call per rule evaluation, well within the 10-call limit.

**Deploy command:** `npx firebase-tools deploy --only firestore:rules,firestore:indexes --project uniguidesl`

### Directory Structure
```
src/
├── components/         # Reusable UI (Navbar, ProtectedRoute, RoleDashboardRouter)
│   └── ui/             # shadcn/ui component library
├── dashboard/
│   ├── shared/         # DashboardShell (common layout wrapper)
│   ├── student/        # StudentDashboard, GuidedJourney/, SubjectMapping/, InviteCode/
│   ├── teacher/        # TeacherDashboard, TeacherSidePanel, pages/ (8 pages)
│   ├── parent/         # ParentDashboard, ParentSidePanel, pages/ (7 pages)
│   ├── OverviewPage/   # Student home/overview
│   ├── CoursePage/     # Course browsing (shared, used by student)
│   ├── UniversityPage/ # University browsing (shared, used by student)
│   └── SettingPage/    # Settings (role-aware: shows invite code for students)
├── pages/              # Top-level routes (Login, SignUp, Home)
│   └── landing/        # Landing page sections (Hero, HowItWorks, FeaturesGrid, etc.)
├── hooks/              # Custom hooks (37 total, barrel-exported from index.js)
├── services/           # Firebase, Gemini AI, analytics, linkingService, notifications
├── context/            # AuthContext
├── data/               # Static data (coursesData.js, careerData.js, subjectCareerMapping.js, tags.js)
├── config/             # App settings (access codes, feature flags)
└── utils/              # Helpers (ErrorBoundary, gamification, intentClassifier)
```

### Build Configuration
- Vite with manual chunks: vendor, firebase, ai, router, icons
- PWA via VitePWA plugin with Workbox caching
- Terser minification (console removal in production)
- 500KB bundle size warning threshold

## Environment Variables

Required in `.env.development`:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_GEMINI_API_KEY=
```

## Conventions

- PropTypes for all components
- Environment variables prefixed with `VITE_`
- No CSS files — all styling via Tailwind classes in JSX
- PascalCase for component files, UI primitives in `src/components/ui/`
- Tag-based categorization system in `src/data/tags.js`

### Notification System
- Platform-wide notifications via `subscribePlatformNotifications` (existing)
- Targeted notifications via `createNotification(targetUids, type, data)`:
  - `guidance_milestone` → parent (child reached milestone)
  - `teacher_feedback` → student (teacher sent feedback)
  - `new_student_linked` → teacher (student linked via invite code)
  - `inactivity_alert` → parent/teacher (student inactive 14+ days)

## Gotchas

- **Student routes** still handled by `DashboardRoutes.jsx` — wrapped inside `StudentDashboard.jsx`
- **Teacher/Parent routes** defined in their own `TeacherDashboard.jsx` / `ParentDashboard.jsx`
- `Dashboard.jsx` now just renders `<RoleDashboardRouter />` — it no longer contains layout logic
- Each role has its own sidebar component (student uses existing `DashboardSidePanel`, teacher/parent have dedicated ones)
- Swipe gestures implemented globally for mobile sidebar navigation
- The `firestore` npm package is NOT used — use `firebase/firestore` from the official SDK
- Static API files generated at build time in `public/api/` from `universities.json`
- No dark mode — light-only app
- Tailwind v4 with CSS-based config (`@theme` directive in `src/index.css`)
- Path aliases: `@/` → `src/`
- Invite codes exclude ambiguous characters (I, O, 0, 1) for readability
- **Firestore rules rely on `linkedStudents`/`linkedAdults` arrays** on user docs for cross-user access, with `isLinkedViaDoc()` as a fallback that checks the `linkedAccounts/{studentUid}_{parentUid}` doc directly. If linking logic changes in `linkingService.js`, the security rules must be updated to match. Queries on `linkedAccounts` and `feedbackMessages` must filter by the caller's UID (no blanket list allowed)
- **Analytics fields may be objects, not strings** — `lastViewedCourse`, `lastViewedCareer`, `lastViewedUniversity` in `userAnalytics` docs can be stored as `{viewedAt, type, id}` objects. Similarly, `savedCourses`/`savedCareers`/`savedUniversities` on user docs can contain objects. Hooks (`useStudentProgress`, `useChildProgress`) normalize these to strings via `toDisplayString()` and `normalizeIds()`. Any new code consuming these fields must handle both formats.
- **Account linking uses `arrayUnion`/`arrayRemove`** — `linkingService.js` uses atomic Firestore operations (no preceding `getDoc` needed). `useLinkedAccounts` includes self-repair logic that runs once per session to sync `linkedStudents`/`linkedAdults` arrays with the `linkedAccounts` collection
- **Firebase deploy** requires `npx firebase-tools login` in a regular terminal (not Claude Code) — needs browser OAuth
- **Mobile overflow prevention** — `html, body { overflow-x: hidden }` in `index.css` and `overflow-x-hidden` on `DashboardShell` wrapper. All `max-w-*` content containers use `px-4 sm:px-6` (never bare `px-6`). Tight 3-column grids use `p-2 sm:p-4` and `gap-2 sm:gap-4`. Button rows always include `flex-wrap`. New pages must follow these patterns to avoid horizontal scroll on ~360px devices.

## Beta Access Gate

Controlled in `src/config/appSettings.js`:
- `ENABLE_SIGNUP_ACCESS_GATE` - Toggle access gate
- `VALID_ACCESS_CODES` - Array of valid codes

---

## Design System

### Tech Stack
- **Tailwind CSS v4** — CSS-based config via `@theme` in `src/index.css`
- **shadcn/ui** — Component library in `src/components/ui/`, import via `@/components/ui`
- **Syne** — Display font for headlines (`font-display` utility)
- **Plus Jakarta Sans** — Body font
- Components: Button, Badge, Card, Input, Label, Separator, Accordion, Tabs, Avatar, Textarea, Select, Switch, Dialog
- Custom: LazyImage (blur-up placeholder), ScrollReveal (scroll-triggered animations)

### Brand Colors (defined in `src/index.css` via @theme)
```
Primary:
  deep-blue: #00619c    (headers, primary buttons, active states)
  aqua-blue: #00AABB    (button hover, links, accents)
  dark-teal: #0D3C5C    (body text, dark backgrounds)
  light-aqua: #48E0F3   (highlights)

Secondary:
  brand-yellow: #E9B000  (warnings)
  brand-green: #09AE73   (success, save states, CTAs)
  brand-purple: #9146FF  (special features)
  brand-coral: #F0736A   (errors, alerts)
```

### Button Standard

**Sizes (by context):**
| Size | Height | When to use |
|------|--------|-------------|
| `lg` | h-12, px-8 | Page-level primary CTAs: hero, form submits (Login/Signup/CompleteProfile), "Start Pathfinder", empty-state CTAs. **One per view max.** |
| `default` | h-10, px-5 | Standard actions: dialog confirms, card primary actions, Save, Send Feedback, Link Student. The workhorse. |
| `sm` | h-8, px-3 | Compact/inline: "View All" links, filter chips, table row actions, card footer links, sidebar nav items. |
| `icon` | h-10 w-10 | Single-icon only: bookmark toggles, close/dismiss, send, delete. No text. |

**Variants (by hierarchy):**
| Variant | Style | When to use | Max per section |
|---------|-------|-------------|-----------------|
| `default` | `bg-deep-blue` → `hover:bg-aqua-blue`, white text | The #1 action: Submit, Save, Confirm, primary CTA | 1 |
| `outline` | `border-deep-blue` → `hover:bg-deep-blue hover:text-white` | The #2 action: Cancel, alternative choice, secondary CTA | Pairs with default |
| `ghost` | No bg → `hover:bg-deep-blue/10` | Navigation/tertiary: sidebar items, "View All", back buttons | Unlimited |
| `destructive` | `bg-red-600` → `hover:bg-red-500` | Irreversible actions only. Always behind a confirmation dialog. | 1 per page max |

**Removed variants:** `secondary` (use `outline`), `link` (use `ghost`).

- Styling: `rounded-xl`, `font-semibold`, `transition-all duration-200`
- **No gradients on buttons.** Solid colors only.
- All interactive elements must use the shadcn `<Button>` component — no custom `<button>` styling except hamburger toggles and quiz option selectors.

### Color Usage Rules
```
Primary actions:     bg-deep-blue (solid)
Hover states:        bg-aqua-blue (buttons) or bg-deep-blue/10 (nav items)
Success:             bg-brand-green
Warnings:            bg-brand-yellow
Errors/Destructive:  bg-red-600 or bg-brand-coral
Focus rings:         ring-deep-blue (all interactive elements)
```

### No Gradients Rule
Gradients NOT used for: buttons, active nav states, card backgrounds.
Gradients allowed for: landing page hero backgrounds (blurred/subtle), CTA section bg, stat card decorative layers (~2% opacity).

### Spacing & Sizing
- Touch targets: 44px minimum (min-h-touch, min-w-touch)
- Card padding: p-6 (24px)
- Section gaps: space-y-6 or gap-6
- Border radius: rounded-card (16px), rounded-button / rounded-xl (12px), rounded-badge (20px)
- **Content wrapper padding:** Always `px-4 sm:px-6` on `max-w-*` containers — never bare `px-6`
- **Tight 3-column grids** (e.g. stat counters): Use `gap-2 sm:gap-4` and `p-2 sm:p-4` on cells
- **Button rows:** Always include `flex-wrap` when multiple buttons sit side-by-side

### Dashboard Layout
- **Collapsible sidebar:** Desktop only, 250px expanded / 70px collapsed
- **Sidebar nav:** Active = `bg-deep-blue text-white`, Hover = `bg-deep-blue/10 text-deep-blue`
- **Main content + top navbar** respond to sidebar collapse via `sidebarCollapsed` custom event

### Card Hover Pattern
All dashboard cards use border hover with inline styles for specificity:
```jsx
className="border-2 border-slate-200 transition-all duration-300"
onMouseEnter={(e) => e.currentTarget.style.borderColor = '#00619c'}
onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
```

### Hero Header Pattern (detail/settings pages)
Deep-blue gradient with dot pattern overlay:
```jsx
<div className="relative bg-gradient-to-br from-deep-blue via-deep-blue to-dark-teal overflow-hidden">
  <div className="absolute inset-0 opacity-10" style={{
    backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
    backgroundSize: "24px 24px",
  }} />
  <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-12">...</div>
</div>
```

### Course/Career Color Accents by Field
| Field | Color |
|-------|-------|
| Computer/Software/Data/IT | deep-blue |
| Business/Management/Finance | emerald |
| Medicine/Health/Nursing | rose |
| Engineering | amber |
| Law/Legal | slate |
| Art/Design/Media | violet |
| Education/Teaching | cyan |

---

## Landing Page Structure (`src/pages/landing/` → `Home.jsx`)

| Order | Component | Purpose |
|-------|-----------|---------|
| 1 | `Hero.jsx` | Centered headline (Syne font), social proof avatars, dual CTAs, stats row, browser mockup |
| 2 | `HowItWorks.jsx` | 3-step flow with dashed connecting line |
| 3 | `FeaturesGrid.jsx` | 6 feature cards (3x2 grid) on gray-50 bg |
| 4 | `TestimonialsGrid.jsx` | Featured quote + supporting quotes |
| 5 | `FAQ.jsx` | Accordion-based |
| 6 | `CTASection.jsx` | Green CTA section |
| 7 | Footer | 4-column links, social icons |

---

## Development Environment

- Dev server opens in Playwright's Chrome via `scripts/get-playwright-chrome.sh`
- `agentation` package with MCP server (`endpoint="http://localhost:4747"`) for visual feedback toolbar (dev only)
- Agentation skill installed globally (`~/.claude/skills/agentation`) — `/agentation` sets up any React project
- MCP server configured globally (`~/.claude/claude_code_config.json`)

## Performance (Sierra Leone Context)

- Target: < 100KB per route, interactive < 3s on 3G, works offline
- Route-level code splitting with React.lazy()
- useMemo for expensive computations
- Tailwind tree-shaking removes unused utilities

---

## Claude Code Setup

### MCP Servers
- **playwright** - Browser automation (`npx -y @playwright/mcp@latest`)
- **agentation** - Visual feedback toolbar sync (`npx agentation-mcp server`, port 4747)

### Skills (`.claude/skills/`)
- **frontend-design** - Bold, distinctive UI design. Use when building/styling UI.
- **design-motion-principles** - Motion design auditing (Emil Kowalski, Jakub Krehel, Jhey Tompkins).

### Design Approach
1. Pick a tone (editorial, futuristic, minimal, playful)
2. Typography matters — Syne for headlines
3. Colors have jobs — each serves a purpose
4. One memorable thing per page
5. No gradients as crutch — solid colors, blend intentionally