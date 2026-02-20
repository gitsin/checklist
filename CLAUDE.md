# Restaurante App - Sistema de Gestão de Tarefas

## Visão Geral

Sistema de gestão operacional para restaurantes/estabelecimentos comerciais, focado em delegação de tarefas, controle de execução e supervisão de equipes. Interface mobile-first estilo kiosk.

## Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19.2 + Vite |
| Estilização | Tailwind CSS 3.4 |
| Roteamento | React Router DOM 7 |
| Backend/DB | Supabase (PostgreSQL) |
| Ícones | Lucide React |
| Deploy | Vercel |

## Estrutura do Projeto

```
src/
├── App.jsx                    # Login (seleção loja/funcionário)
├── KioskArea.jsx              # Dashboard colaborador + gerente
├── ManagerArea.jsx            # Dashboard revisão gerente
├── UserManual.jsx             # Manual do usuário in-app
├── AdminArea.jsx              # Hub administrativo
├── supabaseClient.js          # Cliente Supabase
└── components/admin/
    ├── AdminStores.jsx        # CRUD lojas
    ├── AdminEmployees.jsx     # CRUD funcionários e cargos
    ├── AdminTasks.jsx         # CRUD tarefas
    ├── AdminRoutines.jsx      # CRUD rotinas
    ├── AdminReports.jsx       # Relatórios e analytics
    └── TaskWizard.jsx         # Wizard criação de tarefas
```

## Módulos Funcionais

### Kiosk (Colaborador)
- Visualizar e executar tarefas diárias
- Completar tarefas com foto obrigatória (quando configurado)
- Adiar, cancelar ou submeter tarefas para aprovação

### Área do Gerente
- Aprovar/devolver tarefas submetidas pela equipe
- Visualizar tarefas atrasadas e pendentes do time
- Monitorar performance da equipe

### Área Admin
- **Lojas**: CRUD com integração WhatsApp
- **Funcionários**: CRUD com hierarquia gerencial
- **Cargos**: Gestão de funções/posições
- **Tarefas**: Templates com frequência (diária/semanal/mensal)
- **Rotinas**: Agrupamento de tarefas em workflows
- **Relatórios**: Analytics e métricas de conclusão

## Fluxo de Tarefas

```
PENDING → COMPLETED (concluída diretamente)
PENDING → WAITING_APPROVAL (submetida para revisão)
WAITING_APPROVAL → APPROVED (aprovada pelo gerente)
WAITING_APPROVAL → RETURNED (devolvida com feedback)
PENDING → POSTPONED (adiada)
PENDING → CANCELLED (cancelada)
```

## Tabelas Supabase

| Tabela | Descrição |
|--------|-----------|
| `stores` | Lojas/unidades |
| `employee` | Funcionários com relação gerente (manager_id) |
| `roles` | Cargos/funções |
| `task_templates` | Templates de tarefas |
| `checklist_items` | Instâncias de tarefas agendadas |
| `routine_templates` | Templates de rotinas |
| `routine_items` | Tarefas vinculadas a rotinas |

## Autenticação

- **Modelo kiosk**: Seleção de loja → Seleção de funcionário
- **Acesso admin**: Senha via modal
- **Detecção de gerente**: Baseado no nome do cargo (palavras-chave: "gerente", "diretor", "admin", "gestão", "líder")

## Configuração

### Variáveis de Ambiente (.env.local)
```
VITE_SUPABASE_URL=<url-do-projeto-supabase>
VITE_SUPABASE_ANON_KEY=<chave-anonima-supabase>
```

### Timezone
- Padrão: America/Sao_Paulo (UTC-3)

## Comandos

```bash
npm install        # Instalar dependências
npm run dev        # Servidor de desenvolvimento
npm run build      # Build de produção
npm run preview    # Preview do build
```

## Convenções de Código

- Componentes React funcionais com hooks
- Estado local com useState/useEffect
- Tailwind CSS para estilização (classes utilitárias)
- Consultas Supabase com async/await
- Interface em português brasileiro
