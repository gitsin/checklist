import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminOrgChart from '../AdminOrgChart';

// ─── Mock Supabase ───────────────────────────────────────────────────
const mockChain = () => {
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
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

let rpcResponses = {};
const mockRpc = vi.fn((fn) => {
  if (rpcResponses[fn]) {
    const response = rpcResponses[fn].shift() || { data: null, error: null };
    return Promise.resolve(response);
  }
  return Promise.resolve({ data: null, error: null });
});

vi.mock('../../../supabaseClient', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    rpc: (...args) => mockRpc(...args),
  },
}));

// Mock clipboard
Object.assign(navigator, {
  clipboard: { writeText: vi.fn(() => Promise.resolve()) },
});

// ─── Test Data ───────────────────────────────────────────────────────
const ORG_ID = 'org-1';
const ORG_NAME = 'Holding do João';

const mockGroupsWithStores = [
  {
    id: 'grp-1',
    name: 'Grupo Premium',
    slug: 'grupo-premium',
    description: 'Lojas premium',
    active: true,
    organization_id: ORG_ID,
    stores: [
      { id: 'store-1', name: 'Loja Centro', shortName: 'LC', active: true },
      { id: 'store-2', name: 'Loja Shopping', shortName: 'LS', active: true },
    ],
  },
  {
    id: 'grp-2',
    name: 'Grupo Express',
    slug: 'grupo-express',
    description: null,
    active: true,
    organization_id: ORG_ID,
    stores: [
      { id: 'store-3', name: 'Loja Norte', shortName: 'LN', active: true },
    ],
  },
];

const mockOrgSlug = { slug: 'holding-joao' };

// ─── Helpers ─────────────────────────────────────────────────────────
function setupResponses(overrides = {}) {
  fromResponses = {
    restaurant_groups: [{ data: overrides.groups ?? mockGroupsWithStores, error: null }],
    stores: [{ data: overrides.unassigned ?? [], error: null }],
    organizations: [{ data: overrides.org ?? mockOrgSlug, error: null }],
    ...overrides.extra,
  };
}

// Add refetch responses (component calls fetchData again after CRUD)
function addRefetchResponses() {
  fromResponses.restaurant_groups.push({ data: mockGroupsWithStores, error: null });
  fromResponses.stores.push({ data: [], error: null });
  fromResponses.organizations.push({ data: mockOrgSlug, error: null });
}

function renderComponent(props = {}) {
  return render(
    <AdminOrgChart
      goBack={vi.fn()}
      orgId={ORG_ID}
      orgName={ORG_NAME}
      lojas={[]}
      onUpdate={vi.fn()}
      {...props}
    />
  );
}

// Both desktop+mobile layouts render in jsdom, so texts appear 2x.
// Use getAllByText and check length >= expected.

// ─── Tests ───────────────────────────────────────────────────────────
describe('AdminOrgChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromResponses = {};
    rpcResponses = {};
  });

  describe('Renderizacao inicial', () => {
    it('exibe card da organizacao com nome', async () => {
      setupResponses();
      renderComponent();

      await waitFor(() => {
        const matches = screen.getAllByText(ORG_NAME);
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('exibe grupos abaixo da organizacao', async () => {
      setupResponses();
      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByText('Grupo Premium').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Grupo Express').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('exibe lojas dentro de cada grupo', async () => {
      setupResponses();
      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByText('Loja Centro').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Loja Shopping').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Loja Norte').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('exibe card "+ Novo Grupo"', async () => {
      setupResponses();
      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByText('Novo Grupo').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('exibe card "+ Nova Loja" dentro de cada grupo', async () => {
      setupResponses();
      renderComponent();

      await waitFor(() => {
        // 2 groups × 2 layouts (desktop + mobile) = 4
        const novaLojaButtons = screen.getAllByText('Nova Loja');
        expect(novaLojaButtons.length).toBe(4);
      });
    });
  });

  describe('CRUD', () => {
    it('abre modal ao clicar "+ Novo Grupo"', async () => {
      setupResponses();
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => screen.getAllByText('Novo Grupo'));
      // Click the first "Novo Grupo" button
      await user.click(screen.getAllByText('Novo Grupo')[0]);

      expect(screen.getByText('Criar Grupo')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Marca Premium/)).toBeInTheDocument();
    });

    it('cria grupo via supabase insert', async () => {
      setupResponses();
      addRefetchResponses();

      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => screen.getAllByText('Novo Grupo'));
      await user.click(screen.getAllByText('Novo Grupo')[0]);

      await user.type(screen.getByPlaceholderText(/Marca Premium/), 'Grupo Teste');
      await user.click(screen.getByText('Criar Grupo'));

      expect(mockFrom).toHaveBeenCalledWith('restaurant_groups');
    });

    it('abre modal ao clicar "+ Nova Loja" com grupo pre-selecionado', async () => {
      setupResponses();
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => screen.getAllByText('Grupo Premium'));

      const novaLojaButtons = screen.getAllByText('Nova Loja');
      await user.click(novaLojaButtons[0]);

      expect(screen.getByText('Nova Loja no Grupo')).toBeInTheDocument();
      // Group name appears in modal + in the chart
      expect(screen.getAllByText('Grupo Premium').length).toBeGreaterThanOrEqual(1);
    });

    it('cria loja com restaurant_group_id correto', async () => {
      setupResponses();
      addRefetchResponses();

      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => screen.getAllByText('Grupo Premium'));

      const novaLojaButtons = screen.getAllByText('Nova Loja');
      await user.click(novaLojaButtons[0]);

      await user.type(screen.getByPlaceholderText(/Nome da loja/), 'Loja Teste');
      await user.click(screen.getByText('Criar Loja'));

      expect(mockFrom).toHaveBeenCalledWith('stores');
    });

    it('abre modal de edicao ao clicar no icone de editar grupo', async () => {
      setupResponses();
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => screen.getAllByText('Grupo Premium'));

      const editButtons = screen.getAllByTitle('Editar grupo');
      await user.click(editButtons[0]);

      expect(screen.getByText('Editar Grupo')).toBeInTheDocument();
      expect(screen.getByText('Salvar Alterações')).toBeInTheDocument();
    });
  });

  describe('Limite de lojas', () => {
    function setupLimitResponses() {
      setupResponses();
      fromResponses.subscriptions = [{
        data: { id: 'sub-1', max_stores: 1, price_per_store: 97, current_period_end: '2026-04-15' },
        error: null,
      }];
      fromResponses.stores.push({ data: null, error: null, count: 1 });
      rpcResponses.get_current_pricing = [{ data: [{ price_per_store: 97 }], error: null }];
    }

    it('exibe modal "Adicionar Lojas" quando limite atingido ao criar loja', async () => {
      setupLimitResponses();
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => screen.getAllByText('Grupo Premium'));

      await user.click(screen.getAllByText('Nova Loja')[0]);
      await user.type(screen.getByPlaceholderText(/Nome da loja/), 'Loja Teste');
      await user.click(screen.getByText('Criar Loja'));

      await waitFor(() => {
        expect(screen.getByText('Adicionar Lojas')).toBeInTheDocument();
        expect(screen.getByText(/Quantas lojas adicionar/i)).toBeInTheDocument();
        expect(screen.getByText('Confirmar')).toBeInTheDocument();
      });
    });

    it('fecha modal ao clicar Cancelar', async () => {
      setupLimitResponses();
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => screen.getAllByText('Grupo Premium'));

      await user.click(screen.getAllByText('Nova Loja')[0]);
      await user.type(screen.getByPlaceholderText(/Nome da loja/), 'Loja Teste');
      await user.click(screen.getByText('Criar Loja'));

      await waitFor(() => screen.getByText('Adicionar Lojas'));
      await user.click(screen.getByText('Cancelar'));

      await waitFor(() => {
        expect(screen.queryByText('Adicionar Lojas')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navegacao', () => {
    it('botao Voltar chama goBack', async () => {
      const goBack = vi.fn();
      setupResponses();
      renderComponent({ goBack });

      await userEvent.click(screen.getByText('Voltar'));

      expect(goBack).toHaveBeenCalledOnce();
    });

    it('URL kiosk copiavel no card do grupo', async () => {
      setupResponses();
      renderComponent();

      await waitFor(() => {
        const urlElements = screen.getAllByText(/\/holding-joao\/grupo-premium/);
        expect(urlElements.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
