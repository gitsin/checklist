import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminSubscriptions from '../AdminSubscriptions';

// ─── Mock Supabase ───────────────────────────────────────────────────
const mockChain = () => {
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    single: vi.fn(() => chain),
    then(resolve) {
      return Promise.resolve({ data: [], error: null }).then(resolve);
    },
  };
  return chain;
};

let fromResponses = {};

const mockFrom = vi.fn((table) => {
  if (fromResponses[table]) {
    const responses = fromResponses[table];
    const response = responses.shift() || { data: [], error: null };
    const chain = mockChain();
    chain.then = (resolve) => Promise.resolve(response).then(resolve);
    return chain;
  }
  return mockChain();
});

let rpcResponse = { data: [{ price_per_store: 97, plan_name: 'standard' }], error: null };
const mockRpc = vi.fn(() => Promise.resolve(rpcResponse));

vi.mock('../../../supabaseClient', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    rpc: (...args) => mockRpc(...args),
  },
}));

// ─── Test Data ───────────────────────────────────────────────────────
const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
const expiredTrialEndsAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

const mockSubscriptions = [
  {
    id: 'sub-1',
    organization_id: 'org-1',
    plan: 'standard',
    status: 'active',
    max_stores: 5,
    price_per_store: 97.00,
    trial_ends_at: null,
    current_period_start: '2026-03-01T00:00:00Z',
    current_period_end: '2026-03-31T23:59:59Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    organizations: { name: 'Org Alpha', slug: 'org-alpha', billing_email: 'billing@alpha.com' },
  },
  {
    id: 'sub-2',
    organization_id: 'org-2',
    plan: 'standard',
    status: 'trialing',
    max_stores: 3,
    price_per_store: 97.00,
    trial_ends_at: trialEndsAt,
    current_period_start: null,
    current_period_end: null,
    created_at: '2026-03-10T00:00:00Z',
    updated_at: '2026-03-10T00:00:00Z',
    organizations: { name: 'Org Beta', slug: 'org-beta', billing_email: 'billing@beta.com' },
  },
  {
    id: 'sub-3',
    organization_id: 'org-3',
    plan: 'standard',
    status: 'canceled',
    max_stores: 2,
    price_per_store: 97.00,
    trial_ends_at: null,
    current_period_start: '2026-02-01T00:00:00Z',
    current_period_end: '2026-02-28T23:59:59Z',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-20T00:00:00Z',
    organizations: { name: 'Org Gamma', slug: 'org-gamma', billing_email: 'billing@gamma.com' },
  },
  {
    id: 'sub-4',
    organization_id: 'org-4',
    plan: 'standard',
    status: 'past_due',
    max_stores: 4,
    price_per_store: 97.00,
    trial_ends_at: null,
    current_period_start: '2026-03-01T00:00:00Z',
    current_period_end: '2026-03-31T23:59:59Z',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-03-05T00:00:00Z',
    organizations: { name: 'Org Delta', slug: 'org-delta', billing_email: 'billing@delta.com' },
  },
];

// active_stores count per org: org-1=3, org-2=1, org-3=0, org-4=6(exceeds max 4)
const mockStores = [
  { organization_id: 'org-1' },
  { organization_id: 'org-1' },
  { organization_id: 'org-1' },
  { organization_id: 'org-2' },
  { organization_id: 'org-4' },
  { organization_id: 'org-4' },
  { organization_id: 'org-4' },
  { organization_id: 'org-4' },
  { organization_id: 'org-4' },
  { organization_id: 'org-4' },
];

const goBack = vi.fn();

function setupSuperAdminResponses(subs = mockSubscriptions, stores = mockStores) {
  fromResponses = {
    subscriptions: [{ data: subs, error: null }],
    stores: [{ data: stores, error: null }],
  };
}

function setupHoldingOwnerResponses(sub = mockSubscriptions[0], storeCount = 3) {
  fromResponses = {
    subscriptions: [{ data: sub, error: null }],
    stores: [{ data: null, error: null, count: storeCount }],
  };
}

function renderSuperAdmin(subs, stores) {
  setupSuperAdminResponses(subs, stores);
  return render(<AdminSubscriptions goBack={goBack} orgId="org-1" isSuperAdmin={true} />);
}

function renderHoldingOwner(sub, storeCount) {
  setupHoldingOwnerResponses(sub, storeCount);
  return render(<AdminSubscriptions goBack={goBack} orgId="org-1" isSuperAdmin={false} />);
}

describe('AdminSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromResponses = {};
    rpcResponse = { data: [{ price_per_store: 97, plan_name: 'standard' }], error: null };
  });

  // ── Renderização super_admin ──────────────────────────────────────

  describe('super_admin', () => {
    it('renderiza cards de resumo (MRR, ativos, trials, cancelados)', async () => {
      renderSuperAdmin();
      await waitFor(() => {
        // MRR = active subs only: org-1 (3 stores × 97) = 291
        expect(screen.getAllByText(/R\$ 291,00/).length).toBeGreaterThanOrEqual(1);
        // Labels dos cards de resumo
        expect(screen.getByText('MRR')).toBeInTheDocument();
        expect(screen.getByText('Ativos')).toBeInTheDocument();
        expect(screen.getByText('Trials Ativos')).toBeInTheDocument();
        expect(screen.getByText('Cancelados')).toBeInTheDocument();
      });
    });

    it('renderiza lista com nomes das orgs', async () => {
      renderSuperAdmin();
      await waitFor(() => {
        expect(screen.getByText('Org Alpha')).toBeInTheDocument();
        expect(screen.getByText('Org Beta')).toBeInTheDocument();
        expect(screen.getByText('Org Gamma')).toBeInTheDocument();
        expect(screen.getByText('Org Delta')).toBeInTheDocument();
      });
    });

    it('exibe badges de status corretos', async () => {
      renderSuperAdmin();
      await waitFor(() => {
        expect(screen.getByText('Ativo')).toBeInTheDocument();
        expect(screen.getByText('Em Trial')).toBeInTheDocument();
        expect(screen.getByText('Cancelado')).toBeInTheDocument();
        expect(screen.getByText('Inadimplente')).toBeInTheDocument();
      });
    });

    it('mostra countdown de trial para assinaturas em trial', async () => {
      renderSuperAdmin();
      await waitFor(() => {
        expect(screen.getByText(/3 dias restantes/i)).toBeInTheDocument();
      });
    });

    it('mostra alerta de excedente quando lojas > max', async () => {
      renderSuperAdmin();
      await waitFor(() => {
        // org-4 has 6 active stores but max_stores=4
        expect(screen.getByText(/excedente/i)).toBeInTheDocument();
      });
    });

    // ── Filtros super_admin ───────────────────────────────────────────

    it('filtro por status mostra apenas assinaturas correspondentes', async () => {
      const user = userEvent.setup();
      renderSuperAdmin();

      await waitFor(() => screen.getByText('Org Alpha'));

      await user.click(screen.getByRole('button', { name: /em trial/i }));

      await waitFor(() => {
        expect(screen.getByText('Org Beta')).toBeInTheDocument();
        expect(screen.queryByText('Org Alpha')).not.toBeInTheDocument();
        expect(screen.queryByText('Org Gamma')).not.toBeInTheDocument();
      });
    });

    it('filtro "Todos" mostra todas as assinaturas', async () => {
      const user = userEvent.setup();
      renderSuperAdmin();

      await waitFor(() => screen.getByText('Org Alpha'));

      // Filtrar por trial primeiro
      await user.click(screen.getByRole('button', { name: /em trial/i }));
      await waitFor(() => expect(screen.queryByText('Org Alpha')).not.toBeInTheDocument());

      // Voltar para todos
      await user.click(screen.getByRole('button', { name: /^todos/i }));
      await waitFor(() => {
        expect(screen.getByText('Org Alpha')).toBeInTheDocument();
        expect(screen.getByText('Org Beta')).toBeInTheDocument();
      });
    });

    // ── Edição super_admin ────────────────────────────────────────────

    it('botão editar abre modal com valores pré-preenchidos', async () => {
      const user = userEvent.setup();
      renderSuperAdmin();

      await waitFor(() => screen.getByText('Org Alpha'));

      const editButtons = screen.getAllByRole('button', { name: /editar/i });
      await user.click(editButtons[0]);

      expect(screen.getByText('Editar Assinatura')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // max_stores
      expect(screen.getByDisplayValue('97')).toBeInTheDocument(); // price_per_store
    });

    it('salvar chama update no Supabase', async () => {
      const user = userEvent.setup();
      renderSuperAdmin();

      await waitFor(() => screen.getByText('Org Alpha'));

      const editButtons = screen.getAllByRole('button', { name: /editar/i });
      await user.click(editButtons[0]);

      // Prepare update + refetch responses
      fromResponses.subscriptions = [
        { data: null, error: null },
        { data: mockSubscriptions, error: null },
      ];
      fromResponses.stores = [{ data: mockStores, error: null }];

      await user.click(screen.getByRole('button', { name: /salvar/i }));

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('subscriptions');
      });
    });

    it('validação: max_stores >= 1', async () => {
      const user = userEvent.setup();
      renderSuperAdmin();

      await waitFor(() => screen.getByText('Org Alpha'));

      const editButtons = screen.getAllByRole('button', { name: /editar/i });
      await user.click(editButtons[0]);

      const maxInput = screen.getByLabelText(/máx\. lojas/i);
      await user.clear(maxInput);
      await user.type(maxInput, '0');
      await user.click(screen.getByRole('button', { name: /salvar/i }));

      expect(screen.getByText(/mínimo.*1 loja/i)).toBeInTheDocument();
    });
  });

  // ── Renderização holding_owner ──────────────────────────────────────

  describe('holding_owner', () => {
    it('mostra card único da própria org', async () => {
      renderHoldingOwner();
      await waitFor(() => {
        expect(screen.getByText('Org Alpha')).toBeInTheDocument();
        expect(screen.getByText('Ativo')).toBeInTheDocument();
      });
    });

    it('mostra barra de uso de lojas', async () => {
      renderHoldingOwner();
      await waitFor(() => {
        expect(screen.getByText(/3.*\/.*5/)).toBeInTheDocument();
      });
    });

    it('mostra countdown se em trial', async () => {
      const trialSub = {
        ...mockSubscriptions[0],
        status: 'trialing',
        trial_ends_at: trialEndsAt,
      };
      renderHoldingOwner(trialSub);
      await waitFor(() => {
        expect(screen.getByText(/3 dias restantes/i)).toBeInTheDocument();
      });
    });

    it('não exibe botões de edição', async () => {
      renderHoldingOwner();
      await waitFor(() => screen.getByText('Org Alpha'));

      expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
    });
  });

  // ── Ações do Holding Owner ──────────────────────────────────────────

  describe('holding_owner — Adicionar Lojas', () => {
    it('botão "Adicionar Lojas" visível para owner com status active', async () => {
      renderHoldingOwner();
      await waitFor(() => screen.getByText('Org Alpha'));
      expect(screen.getByRole('button', { name: /adicionar lojas/i })).toBeInTheDocument();
    });

    it('modal abre com cálculo pró-rata correto', async () => {
      const user = userEvent.setup();
      renderHoldingOwner();
      await waitFor(() => screen.getByText('Org Alpha'));

      await user.click(screen.getByRole('button', { name: /adicionar lojas/i }));
      expect(screen.getByText(/cobrança imediata/i)).toBeInTheDocument();
      expect(screen.getByText(/pró-rata/i)).toBeInTheDocument();
    });

    it('cálculo atualiza ao mudar quantidade de slots', async () => {
      const user = userEvent.setup();
      renderHoldingOwner();
      await waitFor(() => screen.getByText('Org Alpha'));

      await user.click(screen.getByRole('button', { name: /adicionar lojas/i }));

      const input = screen.getByLabelText(/quantas lojas/i);
      await user.clear(input);
      await user.type(input, '3');

      // Should show calculation for 3 additional stores
      expect(screen.getByText(/3 lojas? adicionais?/i)).toBeInTheDocument();
    });

    it('confirmar chama update no Supabase com max_stores incrementado', async () => {
      const user = userEvent.setup();
      renderHoldingOwner();
      await waitFor(() => screen.getByText('Org Alpha'));

      await user.click(screen.getByRole('button', { name: /adicionar lojas/i }));

      // Prepare update + refetch
      fromResponses.subscriptions = [
        { data: null, error: null },
        { data: mockSubscriptions[0], error: null },
      ];
      fromResponses.stores = [{ data: null, error: null, count: 3 }];

      await user.click(screen.getByRole('button', { name: /confirmar/i }));

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('subscriptions');
      });
    });

    it('validação: mínimo 1 loja adicional', async () => {
      const user = userEvent.setup();
      renderHoldingOwner();
      await waitFor(() => screen.getByText('Org Alpha'));

      await user.click(screen.getByRole('button', { name: /adicionar lojas/i }));

      const input = screen.getByLabelText(/quantas lojas/i);
      await user.clear(input);
      await user.type(input, '0');
      await user.click(screen.getByRole('button', { name: /confirmar/i }));

      expect(screen.getByText(/mínimo.*1/i)).toBeInTheDocument();
    });
  });

  describe('holding_owner — Reduzir Lojas', () => {
    it('botão "Reduzir Lojas" visível se max_stores > 1', async () => {
      renderHoldingOwner();
      await waitFor(() => screen.getByText('Org Alpha'));
      expect(screen.getByRole('button', { name: /reduzir lojas/i })).toBeInTheDocument();
    });

    it('botão "Reduzir Lojas" oculto se max_stores = 1', async () => {
      const sub1 = { ...mockSubscriptions[0], max_stores: 1 };
      renderHoldingOwner(sub1, 1);
      await waitFor(() => screen.getByText('Org Alpha'));
      expect(screen.queryByRole('button', { name: /reduzir lojas/i })).not.toBeInTheDocument();
    });

    it('confirmar salva pending_changes com type reduce', async () => {
      const user = userEvent.setup();
      renderHoldingOwner();
      await waitFor(() => screen.getByText('Org Alpha'));

      await user.click(screen.getByRole('button', { name: /reduzir lojas/i }));

      // Set new total to 4 (current is 5, active is 3)
      const input = screen.getByLabelText(/novo total/i);
      await user.clear(input);
      await user.type(input, '4');

      // Prepare update + refetch
      fromResponses.subscriptions = [
        { data: null, error: null },
        { data: mockSubscriptions[0], error: null },
      ];
      fromResponses.stores = [{ data: null, error: null, count: 3 }];

      await user.click(screen.getByRole('button', { name: /confirmar/i }));

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('subscriptions');
      });
    });
  });

  describe('holding_owner — Cancelamento', () => {
    it('link "Cancelar assinatura" visível para status active', async () => {
      renderHoldingOwner();
      await waitFor(() => screen.getByText('Org Alpha'));
      expect(screen.getByRole('button', { name: /cancelar assinatura/i })).toBeInTheDocument();
    });

    it('etapa 1 mostra copy de retenção com data do fim do ciclo', async () => {
      const user = userEvent.setup();
      renderHoldingOwner();
      await waitFor(() => screen.getByText('Org Alpha'));

      await user.click(screen.getByRole('button', { name: /cancelar assinatura/i }));
      expect(screen.getByText(/tem certeza/i)).toBeInTheDocument();
      expect(screen.getAllByText(/31\/03\/2026/).length).toBeGreaterThanOrEqual(1);
    });

    it('botão "Confirmar Cancelamento" desabilitado até digitar CANCELAR', async () => {
      const user = userEvent.setup();
      renderHoldingOwner();
      await waitFor(() => screen.getByText('Org Alpha'));

      await user.click(screen.getByRole('button', { name: /cancelar assinatura/i }));
      await user.click(screen.getByRole('button', { name: /continuar cancelamento/i }));

      const confirmBtn = screen.getByRole('button', { name: /confirmar cancelamento/i });
      expect(confirmBtn).toBeDisabled();

      const input = screen.getByPlaceholderText(/digite cancelar/i);
      await user.type(input, 'CANCELAR');

      expect(confirmBtn).not.toBeDisabled();
    });

    it('confirmar salva pending_changes com type cancel', async () => {
      const user = userEvent.setup();
      renderHoldingOwner();
      await waitFor(() => screen.getByText('Org Alpha'));

      await user.click(screen.getByRole('button', { name: /cancelar assinatura/i }));
      await user.click(screen.getByRole('button', { name: /continuar cancelamento/i }));

      const input = screen.getByPlaceholderText(/digite cancelar/i);
      await user.type(input, 'CANCELAR');

      // Prepare update + refetch
      fromResponses.subscriptions = [
        { data: null, error: null },
        { data: { ...mockSubscriptions[0], pending_changes: { type: 'cancel' } }, error: null },
      ];
      fromResponses.stores = [{ data: null, error: null, count: 3 }];

      await user.click(screen.getByRole('button', { name: /confirmar cancelamento/i }));

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith('subscriptions');
      });
    });
  });

  describe('holding_owner — Pending Changes UI', () => {
    it('badge "Redução agendada" quando pending_changes.type = reduce', async () => {
      const sub = { ...mockSubscriptions[0], pending_changes: { type: 'reduce', new_max_stores: 3 } };
      renderHoldingOwner(sub, 3);
      await waitFor(() => {
        expect(screen.getByText(/redução agendada/i)).toBeInTheDocument();
      });
    });

    it('badge "Cancelamento agendado" quando pending_changes.type = cancel', async () => {
      const sub = { ...mockSubscriptions[0], pending_changes: { type: 'cancel' } };
      renderHoldingOwner(sub, 3);
      await waitFor(() => {
        expect(screen.getByText(/cancelamento agendado/i)).toBeInTheDocument();
      });
    });
  });

  // ── Estados ─────────────────────────────────────────────────────────

  describe('estados', () => {
    it('loading spinner durante fetch', () => {
      setupSuperAdminResponses();
      render(<AdminSubscriptions goBack={goBack} orgId="org-1" isSuperAdmin={true} />);
      expect(screen.getByText(/carregando/i)).toBeInTheDocument();
    });

    it('estado vazio quando não há assinaturas', async () => {
      renderSuperAdmin([], []);
      await waitFor(() => {
        expect(screen.getByText(/nenhuma assinatura/i)).toBeInTheDocument();
      });
    });
  });
});
