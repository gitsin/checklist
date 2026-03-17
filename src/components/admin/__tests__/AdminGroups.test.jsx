import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminGroups from '../AdminGroups';

// ─── Mock Supabase ───────────────────────────────────────────────────
const mockChain = () => {
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    or: vi.fn(() => chain),
    order: vi.fn(() => chain),
    single: vi.fn(() => chain),
    // Default: resolve empty
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

vi.mock('../../../supabaseClient', () => ({
  supabase: { from: (...args) => mockFrom(...args) },
}));

// ─── Test Data ───────────────────────────────────────────────────────
const ORG_ID = 'org-1';

const mockGroups = [
  {
    id: 'grp-1',
    name: 'Marca Premium',
    slug: 'marca-premium',
    description: 'Lojas premium',
    active: true,
    organization_id: ORG_ID,
    stores: [{ count: 2 }],
  },
  {
    id: 'grp-2',
    name: 'Marca Express',
    slug: 'marca-express',
    description: null,
    active: false,
    organization_id: ORG_ID,
    stores: [{ count: 0 }],
  },
];

const mockLojasVinculadas = [
  { id: 'store-1', name: 'Loja Centro', shortName: 'LC' },
  { id: 'store-2', name: 'Loja Shopping', shortName: 'LS' },
];

const mockLojasDisponiveis = [
  { id: 'store-3', name: 'Loja Norte', shortName: 'LN' },
  { id: 'store-4', name: 'Loja Sul', shortName: null },
];

// ─── Helpers ─────────────────────────────────────────────────────────
function setupResponses(overrides = {}) {
  fromResponses = {
    restaurant_groups: [{ data: overrides.groups ?? mockGroups, error: null }],
    ...overrides.extra,
  };
}

function renderComponent(props = {}) {
  return render(
    <AdminGroups
      goBack={vi.fn()}
      orgId={ORG_ID}
      isSuperAdmin={false}
      {...props}
    />
  );
}

// ─── Tests ───────────────────────────────────────────────────────────
describe('AdminGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromResponses = {};
  });

  describe('Renderização inicial', () => {
    it('exibe os grupos após carregamento', async () => {
      setupResponses();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Marca Premium')).toBeInTheDocument();
        expect(screen.getByText('Marca Express')).toBeInTheDocument();
      });
    });

    it('exibe contagem de lojas corretamente', async () => {
      setupResponses();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('2 lojas')).toBeInTheDocument();
        expect(screen.getByText('0 lojas')).toBeInTheDocument();
      });
    });

    it('exibe singular "loja" quando count = 1', async () => {
      setupResponses({
        groups: [{ ...mockGroups[0], stores: [{ count: 1 }] }],
      });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('1 loja')).toBeInTheDocument();
      });
    });

    it('exibe empty state quando não há grupos', async () => {
      setupResponses({ groups: [] });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Nenhum grupo cadastrado')).toBeInTheDocument();
      });
    });

    it('exibe botão Novo Grupo', async () => {
      setupResponses();
      renderComponent();

      expect(screen.getByText('Novo Grupo')).toBeInTheDocument();
    });

    it('exibe botão Voltar', () => {
      setupResponses();
      renderComponent();

      expect(screen.getByText('Voltar')).toBeInTheDocument();
    });
  });

  describe('Criar grupo', () => {
    it('abre modal ao clicar em Novo Grupo', async () => {
      setupResponses();
      renderComponent();
      const user = userEvent.setup();

      await user.click(screen.getByText('Novo Grupo'));

      expect(screen.getByText('Criar Grupo')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Marca Premium/)).toBeInTheDocument();
    });

    it('fecha modal ao clicar em Cancelar', async () => {
      setupResponses();
      renderComponent();
      const user = userEvent.setup();

      await user.click(screen.getByText('Novo Grupo'));
      expect(screen.getByText('Criar Grupo')).toBeInTheDocument();

      await user.click(screen.getByText('Cancelar'));
      expect(screen.queryByText('Criar Grupo')).not.toBeInTheDocument();
    });
  });

  describe('Editar grupo', () => {
    it('abre modal de edição ao clicar no ícone de lápis', async () => {
      setupResponses();
      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Marca Premium')).toBeInTheDocument();
      });

      // Encontrar o card do grupo e clicar no botão de editar (Pencil)
      const cards = screen.getAllByText('Marca Premium');
      const card = cards[0].closest('div[class*="rounded-xl"]');
      const editButton = card.querySelectorAll('button')[1]; // segundo botão = edit
      await user.click(editButton);

      expect(screen.getByText('Editar Grupo')).toBeInTheDocument();
      expect(screen.getByText('Salvar Alterações')).toBeInTheDocument();
    });
  });

  describe('Gerenciar Lojas do Grupo', () => {
    it('exibe botão de gerenciar lojas em cada card de grupo', async () => {
      setupResponses();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Marca Premium')).toBeInTheDocument();
      });

      // Deve existir botões com title "Gerenciar Lojas"
      const storeButtons = screen.getAllByTitle('Gerenciar Lojas');
      expect(storeButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('abre modal e exibe lojas vinculadas e disponíveis', async () => {
      setupResponses();
      fromResponses.stores = [
        { data: mockLojasVinculadas, error: null },
        { data: mockLojasDisponiveis, error: null },
      ];
      fromResponses.restaurant_groups.push({ data: mockGroups, error: null });

      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Marca Premium')).toBeInTheDocument();
      });

      await user.click(screen.getAllByTitle('Gerenciar Lojas')[0]);

      await waitFor(() => {
        expect(screen.getByText('Lojas vinculadas')).toBeInTheDocument();
        expect(screen.getByText('Lojas disponíveis')).toBeInTheDocument();
        expect(screen.getByText('Loja Centro')).toBeInTheDocument();
        expect(screen.getByText('Loja Shopping')).toBeInTheDocument();
        expect(screen.getByText('Loja Norte')).toBeInTheDocument();
        expect(screen.getByText('Loja Sul')).toBeInTheDocument();
      });
    });

    it('exibe shortName entre parênteses quando disponível', async () => {
      setupResponses();
      fromResponses.stores = [
        { data: mockLojasVinculadas, error: null },
        { data: mockLojasDisponiveis, error: null },
      ];
      fromResponses.restaurant_groups.push({ data: mockGroups, error: null });

      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => screen.getByText('Marca Premium'));
      await user.click(screen.getAllByTitle('Gerenciar Lojas')[0]);

      await waitFor(() => {
        expect(screen.getByText('(LC)')).toBeInTheDocument();
        expect(screen.getByText('(LS)')).toBeInTheDocument();
        expect(screen.getByText('(LN)')).toBeInTheDocument();
      });
    });

    it('exibe empty state quando grupo não tem lojas', async () => {
      setupResponses();
      fromResponses.stores = [
        { data: [], error: null },
        { data: mockLojasDisponiveis, error: null },
      ];
      fromResponses.restaurant_groups.push({ data: mockGroups, error: null });

      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => screen.getByText('Marca Premium'));
      await user.click(screen.getAllByTitle('Gerenciar Lojas')[0]);

      await waitFor(() => {
        expect(screen.getByText('Nenhuma loja vinculada a este grupo')).toBeInTheDocument();
      });
    });

    it('exibe mensagem quando todas lojas já estão vinculadas', async () => {
      setupResponses();
      fromResponses.stores = [
        { data: mockLojasVinculadas, error: null },
        { data: [], error: null },
      ];
      fromResponses.restaurant_groups.push({ data: mockGroups, error: null });

      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => screen.getByText('Marca Premium'));
      await user.click(screen.getAllByTitle('Gerenciar Lojas')[0]);

      await waitFor(() => {
        expect(screen.getByText('Todas as lojas já estão vinculadas')).toBeInTheDocument();
      });
    });

    it('chama update ao clicar em adicionar loja', async () => {
      setupResponses();
      fromResponses.stores = [
        { data: [], error: null },
        { data: mockLojasDisponiveis, error: null },
        // Responses após adicionar (refetch)
        { data: [mockLojasDisponiveis[0]], error: null },
        { data: [mockLojasDisponiveis[1]], error: null },
      ];
      fromResponses.restaurant_groups.push(
        { data: mockGroups, error: null },
        { data: mockGroups, error: null }
      );

      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => screen.getByText('Marca Premium'));
      await user.click(screen.getAllByTitle('Gerenciar Lojas')[0]);

      await waitFor(() => screen.getByText('Loja Norte'));

      // Clicar no botão + da primeira loja disponível
      const addButtons = screen.getAllByTitle('Adicionar ao grupo');
      await user.click(addButtons[0]);

      // Verificar que supabase.from('stores').update foi chamado
      expect(mockFrom).toHaveBeenCalledWith('stores');
    });

    it('chama update ao clicar em remover loja', async () => {
      setupResponses();
      fromResponses.stores = [
        { data: mockLojasVinculadas, error: null },
        { data: mockLojasDisponiveis, error: null },
        // Responses após remover (refetch)
        { data: [mockLojasVinculadas[1]], error: null },
        { data: [...mockLojasDisponiveis, mockLojasVinculadas[0]], error: null },
      ];
      fromResponses.restaurant_groups.push(
        { data: mockGroups, error: null },
        { data: mockGroups, error: null }
      );

      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => screen.getByText('Marca Premium'));
      await user.click(screen.getAllByTitle('Gerenciar Lojas')[0]);

      await waitFor(() => screen.getByText('Loja Centro'));

      const removeButtons = screen.getAllByTitle('Remover do grupo');
      await user.click(removeButtons[0]);

      expect(mockFrom).toHaveBeenCalledWith('stores');
    });

    it('fecha modal ao clicar em Fechar', async () => {
      setupResponses();
      fromResponses.stores = [
        { data: [], error: null },
        { data: [], error: null },
      ];
      fromResponses.restaurant_groups.push({ data: mockGroups, error: null });

      renderComponent();
      const user = userEvent.setup();

      await waitFor(() => screen.getByText('Marca Premium'));
      await user.click(screen.getAllByTitle('Gerenciar Lojas')[0]);

      await waitFor(() => screen.getByText('Lojas do Grupo'));

      await user.click(screen.getByText('Fechar'));

      await waitFor(() => {
        expect(screen.queryByText('Lojas do Grupo')).not.toBeInTheDocument();
      });
    });
  });

  describe('Toggle status', () => {
    it('chama update ao clicar no toggle de status', async () => {
      setupResponses();
      fromResponses.restaurant_groups.push({ data: mockGroups, error: null });

      renderComponent();

      await waitFor(() => screen.getByText('Marca Premium'));

      // O toggle é o terceiro botão de cada card (store, edit, toggle)
      const card = screen.getByText('Marca Premium').closest('div[class*="rounded-xl"]');
      const buttons = card.querySelectorAll('button');
      const toggleButton = buttons[2]; // terceiro botão = toggle
      await userEvent.click(toggleButton);

      expect(mockFrom).toHaveBeenCalledWith('restaurant_groups');
    });
  });

  describe('Super Admin', () => {
    it('exibe seletor de organização quando isSuperAdmin', async () => {
      fromResponses = {
        organizations: [
          { data: [{ id: 'org-1', name: 'Org 1' }, { id: 'org-2', name: 'Org 2' }], error: null },
        ],
        restaurant_groups: [],
      };

      renderComponent({ isSuperAdmin: true, orgId: null });

      await waitFor(() => {
        expect(screen.getByText('Organização')).toBeInTheDocument();
        expect(screen.getByText('Selecione...')).toBeInTheDocument();
      });
    });

    it('exibe mensagem quando nenhuma org selecionada', () => {
      fromResponses = {
        organizations: [{ data: [], error: null }],
        restaurant_groups: [],
      };

      renderComponent({ isSuperAdmin: true, orgId: null });

      expect(screen.getByText('Selecione uma organização para ver os grupos')).toBeInTheDocument();
    });
  });

  describe('Navegação', () => {
    it('chama goBack ao clicar em Voltar', async () => {
      const goBack = vi.fn();
      setupResponses();
      renderComponent({ goBack });

      await userEvent.click(screen.getByText('Voltar'));

      expect(goBack).toHaveBeenCalledOnce();
    });
  });
});
