import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminCheckout from '../AdminCheckout';

// ─── Mock fetch ──────────────────────────────────────────────────────
let fetchResponses = [];
global.fetch = vi.fn(() => {
  const resp = fetchResponses.shift() || { ok: true, json: async () => ({}) };
  return Promise.resolve({
    ok: resp.ok,
    json: async () => resp.data,
  });
});

// ─── Mock Supabase ───────────────────────────────────────────────────
const mockUpdate = vi.fn(() => ({
  eq: vi.fn(() => Promise.resolve({ error: null })),
}));

vi.mock('../../../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({
        data: { session: { access_token: 'test-token' } },
      })),
    },
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  },
}));

// ─── Mock env ────────────────────────────────────────────────────────
vi.stubGlobal('import', { meta: { env: { VITE_SUPABASE_URL: 'https://test.supabase.co' } } });

const SUB = {
  id: 'sub-1',
  max_stores: 1,
  price_per_store: 97,
  organization_id: 'org-1',
};

function renderCheckout(props = {}) {
  return render(
    <AdminCheckout
      subscription={SUB}
      orgName="Holding Test"
      orgId="org-1"
      onComplete={vi.fn()}
      onCancel={vi.fn()}
      {...props}
    />,
  );
}

describe('AdminCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchResponses = [];
  });

  // ── Step 1: Dados de cobrança ────────────────────────────────────────

  it('renderiza step 1 com campos de cobrança', () => {
    renderCheckout();
    expect(screen.getByText('Dados de cobrança')).toBeTruthy();
    expect(screen.getByLabelText(/Nome \/ Razão Social/)).toBeTruthy();
    expect(screen.getByLabelText(/CPF \/ CNPJ/)).toBeTruthy();
    expect(screen.getByLabelText(/Telefone/)).toBeTruthy();
    expect(screen.getByLabelText(/CEP/)).toBeTruthy();
  });

  it('pré-preenche nome com orgName', () => {
    renderCheckout();
    expect(screen.getByLabelText(/Nome \/ Razão Social/).value).toBe('Holding Test');
  });

  it('exibe resumo com preço da assinatura', () => {
    renderCheckout();
    expect(screen.getByText(/1 loja\(s\)/)).toBeTruthy();
  });

  it('valida campos obrigatórios no step 1', () => {
    renderCheckout();
    // Limpar nome pré-preenchido
    fireEvent.change(screen.getByLabelText(/Nome \/ Razão Social/), { target: { value: '' } });
    fireEvent.click(screen.getByText('Continuar'));
    expect(screen.getByText(/Nome é obrigatório/)).toBeTruthy();
  });

  it('valida CPF/CNPJ inválido', () => {
    renderCheckout();
    fireEvent.change(screen.getByLabelText(/CPF \/ CNPJ/), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/Telefone/), { target: { value: '11999999999' } });
    fireEvent.change(screen.getByLabelText(/CEP/), { target: { value: '01310100' } });
    fireEvent.change(screen.getByLabelText(/Número \*/), { target: { value: '100' } });
    fireEvent.click(screen.getByText('Continuar'));
    expect(screen.getByText(/CPF ou CNPJ inválido/)).toBeTruthy();
  });

  it('aceita CNPJ alfanumérico', () => {
    renderCheckout();
    fireEvent.change(screen.getByLabelText(/CPF \/ CNPJ/), { target: { value: 'MS8ZEWJP000166' } });
    fireEvent.change(screen.getByLabelText(/Telefone/), { target: { value: '11999999999' } });
    fireEvent.change(screen.getByLabelText(/CEP/), { target: { value: '01310100' } });
    fireEvent.change(screen.getByLabelText(/Número \*/), { target: { value: '100' } });
    fireEvent.click(screen.getByText('Continuar'));
    expect(screen.getByText('Forma de pagamento')).toBeTruthy();
  });

  it('avança para step 2 com dados válidos', () => {
    renderCheckout();
    fireEvent.change(screen.getByLabelText(/CPF \/ CNPJ/), { target: { value: '12345678901' } });
    fireEvent.change(screen.getByLabelText(/Telefone/), { target: { value: '11999999999' } });
    fireEvent.change(screen.getByLabelText(/CEP/), { target: { value: '01310100' } });
    fireEvent.change(screen.getByLabelText(/Número \*/), { target: { value: '100' } });
    fireEvent.click(screen.getByText('Continuar'));
    expect(screen.getByText('Forma de pagamento')).toBeTruthy();
  });

  // ── Step 2: Forma de pagamento ───────────────────────────────────────

  function goToStep2() {
    renderCheckout();
    fireEvent.change(screen.getByLabelText(/CPF \/ CNPJ/), { target: { value: '12345678901' } });
    fireEvent.change(screen.getByLabelText(/Telefone/), { target: { value: '11999999999' } });
    fireEvent.change(screen.getByLabelText(/CEP/), { target: { value: '01310100' } });
    fireEvent.change(screen.getByLabelText(/Número \*/), { target: { value: '100' } });
    fireEvent.click(screen.getByText('Continuar'));
  }

  it('exibe 3 opções de pagamento no step 2', () => {
    goToStep2();
    expect(screen.getByText('Cartão de Crédito')).toBeTruthy();
    expect(screen.getByText('PIX')).toBeTruthy();
    expect(screen.getByText('Boleto')).toBeTruthy();
  });

  it('clicar em CC avança para step 3 (dados do cartão)', () => {
    goToStep2();
    fireEvent.click(screen.getByText('Cartão de Crédito'));
    expect(screen.getByText('Dados do cartão')).toBeTruthy();
  });

  it('clicar em PIX inicia processamento direto', async () => {
    fetchResponses = [
      { ok: true, data: { asaas_customer_id: 'cus_123' } },
      { ok: true, data: { asaas_subscription_id: 'sub_123', status: 'ACTIVE' } },
    ];
    goToStep2();
    fireEvent.click(screen.getByText('PIX'));
    await waitFor(() => {
      expect(screen.getByText(/Processando pagamento/)).toBeTruthy();
    });
  });

  // ── Step 3: Dados do cartão ──────────────────────────────────────────

  function goToStep3() {
    goToStep2();
    fireEvent.click(screen.getByText('Cartão de Crédito'));
  }

  it('exibe campos do cartão no step 3', () => {
    goToStep3();
    expect(screen.getByLabelText(/Nome no cartão/)).toBeTruthy();
    expect(screen.getByLabelText(/Número do cartão/)).toBeTruthy();
    expect(screen.getByLabelText(/CVV/)).toBeTruthy();
  });

  it('valida dados do cartão incompletos', () => {
    goToStep3();
    fireEvent.click(screen.getByText('Ativar Assinatura'));
    expect(screen.getByText(/Nome no cartão é obrigatório/)).toBeTruthy();
  });

  // ── Botão Voltar ─────────────────────────────────────────────────────

  it('botão Voltar no step 1 chama onCancel', () => {
    const onCancel = vi.fn();
    render(
      <AdminCheckout subscription={SUB} orgName="Test" orgId="org-1" onComplete={vi.fn()} onCancel={onCancel} />,
    );
    fireEvent.click(screen.getByText('Voltar'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('botão Voltar no step 2 retorna ao step 1', () => {
    goToStep2();
    fireEvent.click(screen.getByText('Voltar'));
    expect(screen.getByText('Dados de cobrança')).toBeTruthy();
  });
});
