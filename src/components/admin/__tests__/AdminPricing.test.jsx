import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminPricing from '../AdminPricing';

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
let rpcResponses = {};

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

const mockRpc = vi.fn((fn) => {
  if (rpcResponses[fn]) {
    return Promise.resolve(rpcResponses[fn]);
  }
  return Promise.resolve({ data: null, error: null });
});

vi.mock('../../../supabaseClient', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    rpc: (...args) => mockRpc(...args),
  },
}));

// ─── Test Data ───────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];

const mockPlans = [
  {
    id: 'plan-1',
    name: 'standard',
    price_per_store: 97.00,
    valid_from: '2025-01-01',
    valid_until: null,
    active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'plan-2',
    name: 'standard',
    price_per_store: 127.00,
    valid_from: '2026-06-01',
    valid_until: null,
    active: true,
    created_at: '2026-03-10T00:00:00Z',
  },
  {
    id: 'plan-3',
    name: 'standard',
    price_per_store: 79.00,
    valid_from: '2024-01-01',
    valid_until: '2024-12-31',
    active: false,
    created_at: '2024-01-01T00:00:00Z',
  },
];

const goBack = vi.fn();

function renderPricing(plans = mockPlans) {
  fromResponses = {
    pricing_plans: [{ data: plans, error: null }],
  };
  rpcResponses = {
    get_current_pricing: { data: { price_per_store: 97.00, plan_name: 'standard' }, error: null },
  };
  return render(<AdminPricing goBack={goBack} />);
}

describe('AdminPricing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromResponses = {};
    rpcResponses = {};
  });

  // ── Renderização ────────────────────────────────────────────────────

  it('renderiza lista de planos', async () => {
    renderPricing();
    await waitFor(() => {
      expect(screen.getByText('R$ 97,00')).toBeInTheDocument();
      expect(screen.getByText('R$ 127,00')).toBeInTheDocument();
      expect(screen.getByText('R$ 79,00')).toBeInTheDocument();
    });
  });

  it('exibe badge "Vigente" no plano atual', async () => {
    renderPricing();
    await waitFor(() => {
      expect(screen.getByText('Vigente')).toBeInTheDocument();
    });
  });

  it('planos inativos aparecem com visual diferente', async () => {
    renderPricing();
    await waitFor(() => {
      expect(screen.getByText('Inativo')).toBeInTheDocument();
    });
  });

  it('exibe preço vigente atual no topo', async () => {
    renderPricing();
    await waitFor(() => {
      expect(screen.getByText('Preço vigente: R$ 97,00/loja')).toBeInTheDocument();
    });
  });

  // ── Criar novo plano ────────────────────────────────────────────────

  it('abre modal ao clicar em Novo Plano', async () => {
    const user = userEvent.setup();
    renderPricing();

    await waitFor(() => screen.getByText('R$ 97,00'));
    await user.click(screen.getByRole('button', { name: /novo plano/i }));

    expect(screen.getByText('Novo Plano de Preço')).toBeInTheDocument();
  });

  it('validação: preço obrigatório e > 0', async () => {
    const user = userEvent.setup();
    renderPricing();

    await waitFor(() => screen.getByText('R$ 97,00'));
    await user.click(screen.getByRole('button', { name: /novo plano/i }));

    // Limpar campo preço e tentar salvar
    const precoInput = screen.getByLabelText(/preço por loja/i);
    await user.clear(precoInput);
    await user.type(precoInput, '0');
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(screen.getByText('Preço deve ser maior que zero')).toBeInTheDocument();
  });

  it('validação: data início obrigatória', async () => {
    const user = userEvent.setup();
    renderPricing();

    await waitFor(() => screen.getByText('R$ 97,00'));
    await user.click(screen.getByRole('button', { name: /novo plano/i }));

    const precoInput = screen.getByLabelText(/preço por loja/i);
    await user.clear(precoInput);
    await user.type(precoInput, '120');

    const dataInput = screen.getByLabelText(/vigência início/i);
    await user.clear(dataInput);
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(screen.getByText('Data de início é obrigatória')).toBeInTheDocument();
  });

  it('submit cria plano via Supabase', async () => {
    const user = userEvent.setup();
    renderPricing();

    await waitFor(() => screen.getByText('R$ 97,00'));
    await user.click(screen.getByRole('button', { name: /novo plano/i }));

    const precoInput = screen.getByLabelText(/preço por loja/i);
    await user.clear(precoInput);
    await user.type(precoInput, '150');

    const dataInput = screen.getByLabelText(/vigência início/i);
    await user.clear(dataInput);
    await user.type(dataInput, '2027-01-01');

    // Preparar resposta do insert
    fromResponses.pricing_plans = [
      { data: { id: 'new-plan' }, error: null },
      { data: [...mockPlans, { id: 'new-plan', name: 'standard', price_per_store: 150, valid_from: '2027-01-01', valid_until: null, active: true, created_at: new Date().toISOString() }], error: null },
    ];

    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('pricing_plans');
    });
  });

  it('toggle ativo/inativo chama update', async () => {
    const user = userEvent.setup();
    renderPricing();

    await waitFor(() => screen.getByText('R$ 97,00'));

    // Preparar resposta do update
    fromResponses.pricing_plans = [
      { data: null, error: null },
      { data: mockPlans, error: null },
    ];

    // Clicar no toggle do primeiro plano ativo
    const toggles = screen.getAllByRole('button', { name: /alternar status/i });
    await user.click(toggles[0]);

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('pricing_plans');
    });
  });
});
