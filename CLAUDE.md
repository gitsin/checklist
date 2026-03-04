# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Development server (Vite)
npm run build      # Production build
npm run lint       # ESLint check
npm run preview    # Preview production build
npm test           # Run regression tests (Vitest)
npm run test:watch # Run tests in watch mode
```

> **Note:** `vite` is aliased to `rolldown-vite@7.2.5` via `package.json` overrides. This is intentional and not a bug.

## Stack

React 19.2 + Vite · Tailwind CSS 3.4 · React Router DOM 7 · Supabase (PostgreSQL + Auth + Storage) · Lucide React · Vercel

## Architecture

### Entry & Routing (`src/App.jsx`)

| Route | Component | Auth |
|-------|-----------|------|
| `/` | `RootRedirect` (→ landing ou home do user) | — |
| `/login` | `LoginPage` | pública |
| `/manual` | `UserManual` | pública |
| `/:orgSlug` | `KioskHome` | pública (kiosk público org-wide) |
| `/:orgSlug/kiosk` | `KioskRoute` → `KioskArea` | sessão (sessionStorage) |
| `/:orgSlug/:groupSlug` | `KioskHome` (filtrado por grupo) | pública |
| `/:orgSlug/:groupSlug/kiosk` | `KioskRoute` → `KioskArea` | sessão |
| `/kiosk/:storeId` | `KioskShell` | `disp_compartilhado` (Supabase Auth) |
| `/gerente` | `StoreManagerArea` | `store_manager` |
| `/admin` | `AdminArea` | `super_admin`, `holding_owner`, `group_director` |

### Autenticação

Dois modelos coexistem:

**Kiosk público** (`/:orgSlug` ou `/:orgSlug/:groupSlug`): sem login. O colaborador seleciona a loja e depois o próprio nome. Se o colaborador tiver `pin_code`, um teclado numérico é exibido antes de entrar. A sessão é guardada em `sessionStorage` (`kiosk_user`, `kiosk_org`, `kiosk_group`).

**Supabase Auth** (`/login`): JWT via `AuthContext`. Pós-login, `getHomeRoute()` redireciona por `user_type`:
- `disp_compartilhado` → `/kiosk/:storeId` (`KioskShell`)
- `store_manager` → `/gerente`
- `holding_owner` / `group_director` / `super_admin` → `/admin`

`ProtectedRoute` valida `user_type` via contexto. Sessão persiste por tab via `sessionStorage`; `rememberMe` usa `localStorage`.

### user_profiles — tabela central de usuários

**Não use mais a tabela `employee`** (renomeada para `employee_legacy`). Todos os usuários vivem em `user_profiles`:

| `user_type` | Acesso |
|-------------|--------|
| `colaborador` | kiosk público (sem auth) — criado diretamente em `user_profiles` com `auth_user_id = null` |
| `disp_compartilhado` | `/kiosk/:storeId` — tablet físico autenticado por loja |
| `store_manager` | `/gerente` |
| `group_director` | `/admin` |
| `holding_owner` | `/admin` |
| `super_admin` | `/admin` |

Colaboradores kiosk usam `pin_code` (4 dígitos, opcional). Se definido, o kiosk pede o PIN antes de entrar.

### roles.access_level

A coluna `access_level` em `roles` determina o nível de acesso do cargo:

| Valor | Significado |
|-------|-------------|
| `kiosk` | colaborador sem login |
| `store_manager` | gerente de loja (Supabase Auth) |
| `group_director` | diretor de grupo |
| `holding_owner` | dono da holding |

`AdminEmployees` usa o `access_level` do cargo selecionado para mostrar o formulário correto (campo PIN para kiosk; email obrigatório para store_manager+).

### KioskHome (`src/App.jsx`)

Componente inline em `App.jsx`. Suporta dois modos:
- `/:orgSlug` — carrega todas as lojas da organização
- `/:orgSlug/:groupSlug` — resolve o grupo via `restaurant_groups.slug` e filtra as lojas pelo `restaurant_group_id`

Exibe teclado numérico de PIN quando o colaborador tem `pin_code`.

### KioskShell (`src/components/KioskShell.jsx`)

Para dispositivos `disp_compartilhado`. O tablet já está autenticado. O colaborador se identifica pelo nome (com PIN se configurado). Logout retorna a `/login`.

### KioskArea (`src/components/KioskArea.jsx`)

Serve tanto colaboradores normais quanto gerentes. Lógica em 4 hooks em `src/hooks/`:

| Hook | Responsabilidade |
|------|----------------|
| `useKioskData(user)` | `fetchData`, todos os estados de tarefa, `isManager()` |
| `useTaskActions(user, fetchData)` | Finalizar, modal obs, upload foto |
| `useManagerActions(...)` | Aprovar e devolver tarefas |
| `useSpotTask(user, fetchData)` | Criar Tarefa Imediata |

`isManager()` detecta por palavras-chave no nome do cargo: `gerente`, `diretor`, `admin`, `gestão`, `lider`.

**Tabs**: "A Fazer" · "Finalizadas" · "Atrasadas" (gerente). Tarefas em revisão (WAITING_APPROVAL de subordinados) aparecem inline no final de "A Fazer".

> `src/components/ManagerArea.jsx` existe mas **não é usado** — código morto.

### Data Fetching Pattern

`fetchData()` em `useKioskData` busca tarefas de hoje E atrasadas separadamente, deduplica via `Map` com chave `template_id` (hoje tem prioridade). Filtro client-side por `role_id`.

### Task Flow

```
PENDING → COMPLETED           (finalizada sem observação)
PENDING → WAITING_APPROVAL    (finalizada com observação/foto)
WAITING_APPROVAL → APPROVED   (gestor aprova)
WAITING_APPROVAL → RETURNED   (gestor devolve com feedback)
```

Evidências de foto ficam em Supabase Storage (`task-evidence`). FK `completed_by_profile_id` aponta para `user_profiles.id`.

### Spot Tasks (Tarefas Imediatas)

`frequency_type = 'spot'` com `active = false` (invisível no AdminTasks e no cron). Um `checklist_items` é inserido imediatamente com `scheduled_date = hoje`. Badge "Fazer hoje" (violeta).

### Routine Linking

FK na `routine_items` é **`routine_id`** (→ `routine_templates.id`), não `routine_template_id`.

### AdminArea (`src/components/AdminArea.jsx`)

Hub com navegação por estado (`screen`). Carrega `stores` e `roles` globalmente e passa como props. Sub-telas em `src/components/admin/`.

### AdminGroups (`src/components/admin/AdminGroups.jsx`)

Gerencia grupos de lojas (`restaurant_groups`). Exibe a **URL kiosk** de cada grupo (`/:orgSlug/:groupSlug`) com botão copiar, para configurar tablets por grupo.

### AdminEmployees (`src/components/admin/AdminEmployees.jsx`)

Usa `user_profiles` (não mais `employee`). Criação em dois fluxos:
- `access_level = kiosk` → inserção direta em `user_profiles` com `auth_user_id = null` + campo PIN
- `access_level = store_manager+` → via edge function `create-admin-user`

Cargos exibem badge colorido por nível de acesso.

### StoreManagerArea (`src/components/StoreManagerArea.jsx`)

Hub do gerente. Acessa: KioskArea (suas tarefas), AdminTasks, AdminRoutines, AdminReports, AdminChecklistReport, tela Equipe.

### Edge Function `create-admin-user`

`TIPOS_PERMITIDOS` (v3):
```typescript
super_admin:    ["holding_owner", "group_director", "store_manager", "colaborador", "disp_compartilhado"]
holding_owner:  ["group_director", "store_manager", "colaborador", "disp_compartilhado"]
group_director: ["store_manager", "colaborador", "disp_compartilhado"]
store_manager:  ["colaborador"]
```
Colaboradores kiosk (sem auth) são criados diretamente via client, não passam pela edge function.

## Supabase Tables

| Tabela | Colunas relevantes |
|--------|-------------------|
| `organizations` | `id`, `name`, `slug`, `logo_url`, `active` |
| `restaurant_groups` | `id`, `name`, `slug`, `organization_id`, `active` |
| `stores` | `id`, `name`, `shortName`, `InternalCode`, `active`, `organization_id`, `restaurant_group_id` |
| `user_profiles` | `id`, `auth_user_id` (null para kiosk), `full_name`, `user_type`, `store_id`, `role_id`, `manager_id`, `organization_id`, `restaurant_group_id`, `pin_code`, `email`, `phone`, `active` |
| `employee_legacy` | legado — não usar; mantida para referência histórica |
| `roles` | `id`, `name`, `slug`, `access_level` (`kiosk`/`store_manager`/`group_director`/`holding_owner`), `organization_id`, `active` |
| `task_templates` | `id`, `title`, `frequency_type` (`daily`/`weekly`/`monthly`/`spot`), `due_time`, `requires_photo_evidence`, `role_id`, `store_id`, `active`, `notify_whatsapp` |
| `checklist_items` | `id`, `template_id`, `store_id`, `scheduled_date`, `status`, `completed_by_profile_id`, `completed_at`, `notes`, `evidence_image_url` |
| `routine_templates` | `id`, `title`, `store_id`, `active` |
| `routine_items` | `routine_id` (FK → `routine_templates`), `task_template_id`, `order_index` |

Cron Supabase gera `checklist_items` às 04:00 AM (America/Sao_Paulo). Tarefas mensais dia 30/31 são ajustadas para o último dia válido do mês.

## Environment Variables (`.env.local`)

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Se ausentes, a app renderiza tela branca — o cliente Supabase não tem guards.

## Testing (Regression)

Stack: **Vitest 4 + React Testing Library + jsdom**

- Config em `vite.config.js` (bloco `test`), setup em `src/test/setup.js`
- Testes em `src/components/admin/__tests__/` e `src/contexts/__tests__/`
- Supabase mockado via `vi.mock` — nunca acessa DB real em testes
- **Rodar `npm test` após toda mudança de feature antes de commitar**
- Ao criar ou modificar tela admin, adicionar/atualizar o arquivo de teste
- Nomenclatura: blocos `describe` por área (`Renderização inicial`, `Gerenciar Lojas`, etc.)
- Skills de referência: `.claude/skills/` (`javascript-testing-patterns`, `testing-patterns`, `test-automator`)

## Conventions

- Todo texto de UI em **português brasileiro**
- Timezone: `America/Sao_Paulo` (UTC-3) em todo o sistema
- Erros para o usuário: genéricos ("Um erro ocorreu, por favor tente novamente"), nunca técnicos
- Design system em `.claude/styleguide.md` — cor primária `#1F4D3A` (verde floresta), mapeada para `primary-500` no Tailwind
- Touch target mínimo: 44px de altura em elementos interativos
- Animações máx 300ms; `animate-fade-in` e `animate-slide-up` são utilities Tailwind customizadas
