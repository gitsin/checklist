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
- Visualizar e finalizar tarefas abertas ou devolvidas
- Completar tarefas com foto obrigatória [quando configurado]
- Visualiza as suas tarefas finalizadas no dia.

### Área do Gestor 
- Visualizar e finalizar suas tarefas abertas ou devolvidas
- Aprovar/devolver tarefas finalizadas com observação pela equipe
- Visualiza as suas tarefas finalizadas no dia.
- Visualizar tarefas atrasadas e pendentes do seu time
- Monitorar performance da equipe

Considera-se um usuário Gestor todos que tem algum funcionário cadastrado com seu usuário no campo Gestor.

### Área Admin
- **Lojas**: CRUD com integração WhatsApp
- **Funcionários**: CRUD com hierarquia gerencial
- **Cargos**: Gestão de funções/posições
- **Tarefas**: Templates com frequência (diária/semanal/mensal)
- **Rotinas**: Agrupamento de tarefas em workflows
- **Relatórios**: Analytics e métricas de conclusão

## Fluxo de Tarefas

```
PENDING → COMPLETED (concluída diretamente)- Tarefas que foram finalizadas sem obs
PENDING → WAITING_APPROVAL (submetida para revisão) - Tarefas que foram finalizadas com obs
WAITING_APPROVAL → APPROVED (aprovada pelo gestor)
WAITING_APPROVAL → RETURNED (devolvida com feedback)
```

## Cronjobs
- Rotina configurada no supabase para geração diária das tarefas as 04:00 AM, respeitando a frequência configurada
- Não gerar tarefas em duplicidade 
- Para tarefas mensais configuradas para dia 31 ou 30, antecipar em função do último dia do mês. Tarefa configurada para 31 é antecipada para 30 nos meses Abril, Junho, Setembro e Novembro. Tarefas configuradas para 30 ou 31 é anteciapda o último dia fevereiro


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

## Autenticação (ainda temporário)

- **Modelo kiosk**: Seleção de loja → Seleção de funcionário
- **Acesso admin**: Senha via modal
- **Detecção de gerente**: Baseado no nome do cargo (palavras-chave: "gerente", "diretor", "admin", "gestão", "líder")

## Configuração

### Variáveis de Ambiente (.env.local)
```
VITE_SUPABASE_URL=<url-do-projeto-supabase>
VITE_SUPABASE_ANON_KEY=<chave-anonima-supabase>
```

### Timezone para todo o sistema
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
- Evitar mensagens de erros técnicos ao usuário final. Prefira "Um erro ocorreu, por favor tente novamente" que "error 404 xyz"
- utilizar o arquivo .claude/styleguide como referência de UX e UI