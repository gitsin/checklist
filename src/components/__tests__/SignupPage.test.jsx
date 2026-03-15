import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SignupPage from '../SignupPage';

// ─── Mock navigate ──────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ─── Mock Supabase ──────────────────────────────────────────────────
const mockSetSession = vi.fn(() => Promise.resolve({ error: null }));
const mockInvoke = vi.fn();

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: { setSession: (...args) => mockSetSession(...args) },
    functions: { invoke: (...args) => mockInvoke(...args) },
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────
function renderSignup() {
  return render(
    <MemoryRouter>
      <SignupPage />
    </MemoryRouter>
  );
}

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Step 1: Conta ──────────────────────────────────────────────────

  it('renderiza step 1 com campos de conta', () => {
    renderSignup();
    expect(screen.getByPlaceholderText('Seu nome completo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Mínimo 8 caracteres')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Repita a senha')).toBeInTheDocument();
  });

  it('mostra erro se senha < 8 chars ao avançar', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'João Silva');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'joao@test.com');
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), '1234567');
    await user.type(screen.getByPlaceholderText('Repita a senha'), '1234567');
    await user.click(screen.getByRole('button', { name: /próximo/i }));

    expect(screen.getByText('A senha deve ter no mínimo 8 caracteres')).toBeInTheDocument();
  });

  it('mostra erro se senhas não coincidem', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'João Silva');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'joao@test.com');
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), '12345678');
    await user.type(screen.getByPlaceholderText('Repita a senha'), '12345679');
    await user.click(screen.getByRole('button', { name: /próximo/i }));

    expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument();
  });

  it('mostra erro se email inválido', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'João Silva');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'emailinvalido');
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), '12345678');
    await user.type(screen.getByPlaceholderText('Repita a senha'), '12345678');
    await user.click(screen.getByRole('button', { name: /próximo/i }));

    expect(screen.getByText('Informe um e-mail válido')).toBeInTheDocument();
  });

  // ── Step 2: Negócio ────────────────────────────────────────────────

  it('avança para step 2 com dados válidos', async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'João Silva');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'joao@test.com');
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), '12345678');
    await user.type(screen.getByPlaceholderText('Repita a senha'), '12345678');
    await user.click(screen.getByRole('button', { name: /próximo/i }));

    expect(screen.getByPlaceholderText('Nome do restaurante ou empresa')).toBeInTheDocument();
  });

  it('mostra erro se nome do negócio vazio no step 2', async () => {
    const user = userEvent.setup();
    renderSignup();

    // Avançar para step 2
    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'João Silva');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'joao@test.com');
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), '12345678');
    await user.type(screen.getByPlaceholderText('Repita a senha'), '12345678');
    await user.click(screen.getByRole('button', { name: /próximo/i }));

    // Tentar avançar sem nome do negócio
    await user.click(screen.getByRole('button', { name: /próximo/i }));

    expect(screen.getByText('Nome do negócio é obrigatório')).toBeInTheDocument();
  });

  // ── Step 3: Confirmação ────────────────────────────────────────────

  it('avança para step 3 com resumo dos dados', async () => {
    const user = userEvent.setup();
    renderSignup();

    // Step 1
    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'João Silva');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'joao@test.com');
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), '12345678');
    await user.type(screen.getByPlaceholderText('Repita a senha'), '12345678');
    await user.click(screen.getByRole('button', { name: /próximo/i }));

    // Step 2
    await user.type(screen.getByPlaceholderText('Nome do restaurante ou empresa'), 'Restaurante do João');
    await user.click(screen.getByRole('button', { name: /próximo/i }));

    // Step 3: verifica resumo
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('joao@test.com')).toBeInTheDocument();
    expect(screen.getByText('Restaurante do João')).toBeInTheDocument();
  });

  it('botão submit desabilitado sem checkbox de termos', async () => {
    const user = userEvent.setup();
    renderSignup();

    // Navegar até step 3
    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'João Silva');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'joao@test.com');
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), '12345678');
    await user.type(screen.getByPlaceholderText('Repita a senha'), '12345678');
    await user.click(screen.getByRole('button', { name: /próximo/i }));
    await user.type(screen.getByPlaceholderText('Nome do restaurante ou empresa'), 'Restaurante');
    await user.click(screen.getByRole('button', { name: /próximo/i }));

    const submitBtn = screen.getByRole('button', { name: /criar minha conta grátis/i });
    expect(submitBtn).toBeDisabled();
  });

  // ── Submit ──────────────────────────────────────────────────────────

  it('submit chama edge function com dados corretos', async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce({
      data: { success: true, session: { access_token: 'tok', refresh_token: 'ref' } },
      error: null,
    });

    renderSignup();

    // Step 1
    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'João Silva');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'joao@test.com');
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), '12345678');
    await user.type(screen.getByPlaceholderText('Repita a senha'), '12345678');
    await user.click(screen.getByRole('button', { name: /próximo/i }));

    // Step 2
    await user.type(screen.getByPlaceholderText('Nome do restaurante ou empresa'), 'Restaurante do João');
    await user.click(screen.getByRole('button', { name: /próximo/i }));

    // Step 3: aceitar termos e submeter
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /criar minha conta grátis/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('self-signup', {
        body: {
          fullName: 'João Silva',
          email: 'joao@test.com',
          password: '12345678',
          businessName: 'Restaurante do João',
          phone: '',
        },
      });
    });
  });

  it('sucesso: chama setSession e navega para /admin', async () => {
    const user = userEvent.setup();
    const mockSession = { access_token: 'tok', refresh_token: 'ref' };
    mockInvoke.mockResolvedValueOnce({
      data: { success: true, session: mockSession },
      error: null,
    });

    renderSignup();

    // Navegar até step 3 e submeter
    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'João Silva');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'joao@test.com');
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), '12345678');
    await user.type(screen.getByPlaceholderText('Repita a senha'), '12345678');
    await user.click(screen.getByRole('button', { name: /próximo/i }));
    await user.type(screen.getByPlaceholderText('Nome do restaurante ou empresa'), 'Restaurante');
    await user.click(screen.getByRole('button', { name: /próximo/i }));
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /criar minha conta grátis/i }));

    await waitFor(() => {
      expect(mockSetSession).toHaveBeenCalledWith(mockSession);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
    });
  });

  it('erro da edge function: exibe mensagem inline', async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce({
      data: { error: 'Este e-mail já está cadastrado no sistema' },
      error: null,
    });

    renderSignup();

    // Navegar até step 3 e submeter
    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'João Silva');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'joao@test.com');
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), '12345678');
    await user.type(screen.getByPlaceholderText('Repita a senha'), '12345678');
    await user.click(screen.getByRole('button', { name: /próximo/i }));
    await user.type(screen.getByPlaceholderText('Nome do restaurante ou empresa'), 'Restaurante');
    await user.click(screen.getByRole('button', { name: /próximo/i }));
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /criar minha conta grátis/i }));

    await waitFor(() => {
      expect(screen.getByText('Este e-mail já está cadastrado no sistema')).toBeInTheDocument();
    });
  });

  it('erro de rede: exibe mensagem genérica', async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'Network error' },
    });

    renderSignup();

    // Navegar até step 3 e submeter
    await user.type(screen.getByPlaceholderText('Seu nome completo'), 'João Silva');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'joao@test.com');
    await user.type(screen.getByPlaceholderText('Mínimo 8 caracteres'), '12345678');
    await user.type(screen.getByPlaceholderText('Repita a senha'), '12345678');
    await user.click(screen.getByRole('button', { name: /próximo/i }));
    await user.type(screen.getByPlaceholderText('Nome do restaurante ou empresa'), 'Restaurante');
    await user.click(screen.getByRole('button', { name: /próximo/i }));
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /criar minha conta grátis/i }));

    await waitFor(() => {
      expect(screen.getByText('Um erro ocorreu, por favor tente novamente')).toBeInTheDocument();
    });
  });
});
