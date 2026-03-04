# Restaurante App — Sistema de Gestão de Tarefas (PRD)

## Visão Geral

Sistema de gestão operacional para restaurantes/estabelecimentos comerciais, focado em delegação de tarefas, controle de execução e supervisão de equipes. Interface mobile-first estilo kiosk, com suporte a múltiplos grupos, lojas e níveis de acesso.

## Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19.2 + Vite |
| Estilização | Tailwind CSS 3.4 |
| Roteamento | React Router DOM 7 |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage) |
| Ícones | Lucide React |
| Deploy | Vercel |

## Estrutura do Projeto

```
src/
├── App.jsx                          # Rotas + KioskHome + KioskRoute
├── supabaseClient.js                # Cliente Supabase
├── contexts/
│   └── AuthContext.jsx              # Supabase Auth, sessão, getHomeRoute()
├── components/
│   ├── KioskArea.jsx                # Dashboard colaborador + gerente (hooks)
│   ├── KioskShell.jsx               # Kiosk autenticado (disp_compartilhado)
│   ├── StoreManagerArea.jsx         # Hub do gerente de loja
│   ├── AdminArea.jsx                # Hub administrativo
│   ├── LandingPage.jsx              # Página inicial pública
│   ├── LoginPage.jsx                # Login Supabase Auth
│   ├── ProtectedRoute.jsx           # Guard por user_type
│   ├── UserManual.jsx               # Manual in-app
│   └── admin/
│       ├── AdminStores.jsx          # CRUD lojas
│       ├── AdminEmployees.jsx       # CRUD colaboradores e cargos (usa user_profiles)
│       ├── AdminGroups.jsx          # CRUD grupos + URL kiosk por grupo
│       ├── AdminUsuarios.jsx        # CRUD usuários com auth (gerentes, diretores, tablets)
│       ├── AdminTasks.jsx           # CRUD tarefas
│       ├── AdminRoutines.jsx        # CRUD rotinas
│       ├── AdminReports.jsx         # Relatórios e analytics
│       ├── AdminChecklistReport.jsx # Checklist mensal
│       └── TaskWizard.jsx           # Wizard de criação de tarefas
├── hooks/                           # useKioskData, useTaskActions, useManagerActions, useSpotTask
└── test/setup.js                    # Setup Vitest
```

## Módulos Funcionais

### Kiosk Público (`/:orgSlug` ou `/:orgSlug/:groupSlug`)
- Seleção de loja → seleção de colaborador pelo nome
- PIN opcional: se `pin_code` configurado, teclado numérico antes de entrar
- Filtro por grupo: `/:orgSlug/:groupSlug` mostra apenas lojas do grupo
- Sem autenticação; sessão em `sessionStorage`

### Kiosk Autenticado (`/kiosk/:storeId`) — `disp_compartilhado`
- Tablet físico faz login em `/login` com email/senha
- `getHomeRoute()` redireciona para `/kiosk/:storeId`
- `KioskShell` exibe colaboradores da loja; PIN flow se configurado
- "Sair" → volta para `/login`

### Kiosk (Colaborador — dentro do KioskArea)
- Visualizar e finalizar tarefas abertas ou devolvidas
- Completar com foto obrigatória quando configurado
- Ver tarefas finalizadas do dia

### Área do Gerente (`/gerente`)
- Acesso via Supabase Auth (user_type = `store_manager`)
- Visualizar/finalizar suas tarefas; aprovar/devolver tarefas da equipe
- Configurar tarefas e rotinas da loja
- Ver relatórios, checklist mensal, equipe

### Área Admin (`/admin`)
- Acesso via Supabase Auth (`super_admin`, `holding_owner`, `group_director`)
- **Lojas**: CRUD por grupo e organização
- **Colaboradores**: CRUD usando `user_profiles`; criação kiosk (sem auth) com PIN opcional
- **Cargos**: CRUD com `access_level` (kiosk / store_manager / group_director / holding_owner)
- **Grupos**: CRUD com URL kiosk copiável por grupo
- **Usuários**: CRUD de usuários autenticados (gerentes, diretores, tablets)
- **Tarefas**: Templates com frequência diária/semanal/mensal/spot
- **Rotinas**: Agrupamento de tarefas em workflows
- **Relatórios / Checklist**: Analytics e métricas de conclusão

## Tipos de Usuário e Rotas

| `user_type` | Rota pós-login | Criação |
|-------------|---------------|---------|
| `colaborador` | kiosk público (sem login) | direto em `user_profiles` (sem edge function) |
| `disp_compartilhado` | `/kiosk/:storeId` | edge function `create-admin-user` |
| `store_manager` | `/gerente` | edge function |
| `group_director` | `/admin` | edge function |
| `holding_owner` | `/admin` | edge function |
| `super_admin` | `/admin` | edge function |

## roles.access_level

O cargo define o nível de acesso do colaborador. Valores:

| `access_level` | Badge UI | Cria conta auth? |
|----------------|----------|-----------------|
| `kiosk` | cinza | Não — PIN opcional |
| `store_manager` | azul | Sim — email + senha |
| `group_director` | violeta | Sim |
| `holding_owner` | âmbar | Sim |

## Kiosk por Grupo

Cada `restaurant_group` tem um `slug`. A URL `/:orgSlug/:groupSlug` filtra as lojas exibidas pelo grupo. Administradores veem a URL copiável na tela AdminGroups.

Exemplo: `/default/grupo-barley-s` → mostra apenas lojas do Grupo Barley's.

## Fluxo de Tarefas

```
PENDING → COMPLETED           (finalizada sem observação)
PENDING → WAITING_APPROVAL    (finalizada com observação/foto)
WAITING_APPROVAL → APPROVED   (gestor aprova)
WAITING_APPROVAL → RETURNED   (gestor devolve com feedback)
```

## Cronjobs

- Geração diária de `checklist_items` às 04:00 AM (America/Sao_Paulo)
- Sem duplicidade; respeita frequência configurada
- Tarefas mensais dia 31 → antecipadas para dia 30 em meses com 30 dias
- Tarefas mensais dia 30 ou 31 → antecipadas para último dia de fevereiro

## Tabelas Supabase

| Tabela | Descrição |
|--------|-----------|
| `organizations` | Organizações/holdings; `slug` para URL do kiosk |
| `restaurant_groups` | Grupos de lojas por marca/região; `slug` para URL do kiosk |
| `stores` | Lojas; `restaurant_group_id` vincula ao grupo |
| `user_profiles` | **Tabela central de usuários** — colaboradores kiosk e usuários auth |
| `employee_legacy` | Legado (era `employee`); mantida, não usar |
| `roles` | Cargos; `access_level` define o tipo de acesso |
| `task_templates` | Templates de tarefas com frequência e regras |
| `checklist_items` | Instâncias diárias geradas pelo cron; FK `completed_by_profile_id` → `user_profiles` |
| `routine_templates` | Templates de rotinas por loja |
| `routine_items` | Vínculo tarefa ↔ rotina (`routine_id` FK → `routine_templates`) |

## Autenticação

- **Supabase Auth** com JWT — sessão gerenciada por `AuthContext`
- Sessão persiste por tab via `sessionStorage`; `rememberMe` usa `localStorage`
- Recuperação de senha via email (`/login` com redirect)
- `ProtectedRoute` valida `user_type` antes de renderizar rotas protegidas

## Variáveis de Ambiente

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Comandos

```bash
npm run dev        # Servidor de desenvolvimento
npm run build      # Build de produção
npm run preview    # Preview do build
npm test           # Rodar testes de regressão
npm run test:watch # Testes em modo watch
```

## Convenções de Código

- Componentes React funcionais com hooks
- Estado local com `useState` / `useEffect`
- Tailwind CSS (classes utilitárias) — referência em `.claude/styleguide.md`
- Consultas Supabase com `async/await`
- Interface em **português brasileiro**
- Erros ao usuário: genéricos ("Um erro ocorreu, por favor tente novamente")
- Rodar `npm test` após toda mudança antes de commitar
