# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Development server (Vite)
npm run build      # Production build
npm run lint       # ESLint check
npm run preview    # Preview production build
```

> **Note:** `vite` is aliased to `rolldown-vite@7.2.5` via `package.json` overrides. This is intentional and not a bug.

## Stack

React 19.2 + Vite · Tailwind CSS 3.4 · React Router DOM 7 · Supabase (PostgreSQL + Storage) · Lucide React · Vercel

## Architecture

### Entry & Routing (`src/App.jsx`)

Three routes: `/` (kiosk login), `/kiosk` (employee dashboard), `/admin` (admin hub), `/manual` (in-app guide). No server-side auth — state is held in memory, so refreshing `/kiosk` redirects to `/`.

The login flow is a 2-step kiosk screen: store selection → employee selection. Admin access is a modal with a hardcoded password (`"1234"` in `App.jsx`).

### KioskArea (`src/components/KioskArea.jsx`)

Single component that serves **both regular employees and managers**. Manager detection is done at runtime via `isManager()`, which checks the role name for keywords: `gerente`, `diretor`, `admin`, `gestão`, `lider`. When the user is a manager, additional tabs and queries (review queue, team overdue) are activated.

> `src/components/ManagerArea.jsx` exists but is **not imported or used anywhere**. It is dead code.

### Data Fetching Pattern

`fetchData()` in KioskArea fetches today's tasks AND overdue tasks separately, then deduplicates them using a `Map` keyed by `template_id`. Today's entries take priority over overdue entries with the same key.

Tasks are filtered client-side: only items matching the user's `role_id` (or tasks with no role restriction) are shown.

### Task Flow

```
PENDING → COMPLETED           (finalized without observation)
PENDING → WAITING_APPROVAL    (finalized with observation/photo)
WAITING_APPROVAL → APPROVED   (manager approves)
WAITING_APPROVAL → RETURNED   (manager returns with feedback)
```

The `checklist_items.completed_by` column is a FK to `employee.id`. Photo evidence is stored in Supabase Storage.

### Admin Area (`src/components/AdminArea.jsx`)

Hub with screen-based navigation (no router). Loads global `stores` and `roles` upfront and passes them as props to sub-screens. Sub-components are in `src/components/admin/`.

## Supabase Tables

| Table | Key columns |
|-------|-------------|
| `stores` | `id`, `name`, `shortName`, `InternalCode`, `active` |
| `employee` | `id`, `full_name`, `store_id`, `role_id`, `manager_id`, `active` |
| `roles` | `id`, `name`, `access_level` |
| `task_templates` | `id`, `title`, `frequency_type`, `due_time`, `requires_photo_evidence`, `role_id` |
| `checklist_items` | `id`, `template_id`, `store_id`, `scheduled_date`, `status`, `completed_by` |
| `routine_templates` / `routine_items` | routine groupings |

A Supabase cron job generates `checklist_items` daily at 04:00 AM (America/Sao_Paulo). Monthly tasks scheduled for day 30/31 are adjusted to the last valid day of the month.

## Environment Variables (`.env.local`)

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

If either is missing, the app will render a white screen — the Supabase client is initialized without guards.

## Conventions

- All UI text in **Brazilian Portuguese**
- Timezone: `America/Sao_Paulo` (UTC-3) throughout
- User-facing errors must be generic ("Um erro ocorreu, por favor tente novamente"), not technical
- Design system is documented in `.claude/styleguide.md` — primary color is `#1F4D3A` (forest green), mapped to `primary-500` in Tailwind config
- Minimum touch target: 44px height for interactive elements
- Animations max 300ms; `animate-fade-in` and `animate-slide-up` are custom Tailwind utilities
