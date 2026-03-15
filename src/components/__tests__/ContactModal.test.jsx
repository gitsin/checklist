import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactModal from '../ContactModal';

// ─── Mock Supabase ──────────────────────────────────────────────────
const mockInsert = vi.fn();
const mockUpload = vi.fn();

const mockChain = () => {
  const chain = {
    select: vi.fn(() => chain),
    single: vi.fn(() => chain),
    then(resolve) {
      return Promise.resolve({ data: { id: 'new-id' }, error: null }).then(resolve);
    },
  };
  return chain;
};

vi.mock('../../supabaseClient', () => ({
  supabase: {
    from: () => ({
      insert: (...args) => {
        mockInsert(...args);
        return mockChain();
      },
    }),
    storage: {
      from: () => ({
        upload: (...args) => {
          mockUpload(...args);
          return Promise.resolve({ data: { path: 'test/file.pdf' }, error: null });
        },
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/file.pdf' } }),
      }),
    },
  },
}));

describe('ContactModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza campos do formulário', () => {
    render(<ContactModal open={true} onClose={onClose} />);
    expect(screen.getByPlaceholderText('Seu nome')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Escreva sua mensagem...')).toBeInTheDocument();
  });

  it('não renderiza quando fechado', () => {
    render(<ContactModal open={false} onClose={onClose} />);
    expect(screen.queryByPlaceholderText('Seu nome')).not.toBeInTheDocument();
  });

  it('mostra erro se campos obrigatórios vazios', async () => {
    const user = userEvent.setup();
    render(<ContactModal open={true} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /enviar mensagem/i }));

    expect(screen.getByText('Preencha todos os campos obrigatórios')).toBeInTheDocument();
  });

  it('mostra erro se email inválido', async () => {
    const user = userEvent.setup();
    render(<ContactModal open={true} onClose={onClose} />);

    await user.type(screen.getByPlaceholderText('Seu nome'), 'João');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'invalido');
    await user.type(screen.getByPlaceholderText('Escreva sua mensagem...'), 'Olá');
    await user.click(screen.getByRole('button', { name: /enviar mensagem/i }));

    expect(screen.getByText('Informe um e-mail válido')).toBeInTheDocument();
  });

  it('submit salva no banco e mostra agradecimento', async () => {
    const user = userEvent.setup();
    render(<ContactModal open={true} onClose={onClose} />);

    await user.type(screen.getByPlaceholderText('Seu nome'), 'João Silva');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'joao@test.com');
    await user.type(screen.getByPlaceholderText('Escreva sua mensagem...'), 'Quero saber mais');
    await user.click(screen.getByRole('button', { name: /enviar mensagem/i }));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith({
        name: 'João Silva',
        email: 'joao@test.com',
        message: 'Quero saber mais',
        attachment_urls: [],
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/mensagem enviada/i)).toBeInTheDocument();
      expect(screen.getByText('joao@test.com')).toBeInTheDocument();
    });
  });

  it('modal de agradecimento tem botão fechar', async () => {
    const user = userEvent.setup();
    render(<ContactModal open={true} onClose={onClose} />);

    await user.type(screen.getByPlaceholderText('Seu nome'), 'João');
    await user.type(screen.getByPlaceholderText('seu@email.com'), 'joao@test.com');
    await user.type(screen.getByPlaceholderText('Escreva sua mensagem...'), 'Olá');
    await user.click(screen.getByRole('button', { name: /enviar mensagem/i }));

    await waitFor(() => screen.getByText(/mensagem enviada/i));
    await user.click(screen.getByRole('button', { name: /fechar/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('exibe área de anexo de arquivos', () => {
    render(<ContactModal open={true} onClose={onClose} />);
    expect(screen.getByText(/anexar arquivos/i)).toBeInTheDocument();
  });
});
