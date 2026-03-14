import { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../AuthContext';

// ─── Mock Supabase ───────────────────────────────────────────────────
let authStateCallback = null;
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn((callback) => {
  authStateCallback = callback;
  return { data: { subscription: { unsubscribe: vi.fn() } } };
});

const mockQueryChain = (data = null, error = null) => {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(() => chain),
    then: (resolve) => Promise.resolve({ data, error }).then(resolve),
  };
  return chain;
};

const mockFrom = vi.fn(() => mockQueryChain());

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: (...args) => mockGetSession(...args),
      signInWithPassword: (...args) => mockSignInWithPassword(...args),
      signOut: (...args) => mockSignOut(...args),
      onAuthStateChange: (...args) => mockOnAuthStateChange(...args),
      resetPasswordForEmail: (...args) => mockResetPasswordForEmail(...args),
      updateUser: (...args) => mockUpdateUser(...args),
    },
    from: (...args) => mockFrom(...args),
  },
  setOrgHeader: vi.fn(),
}));

// ─── Test Data ───────────────────────────────────────────────────────
const mockAdminUser = {
  id: 'admin-1',
  auth_user_id: 'auth-123',
  organization_id: 'org-1',
  user_type: 'holding_owner',
  store_id: null,
  restaurant_group_id: null,
  active: true,
  organization: { id: 'org-1', name: 'Test Org', slug: 'test-org', logo_url: null },
  store: null,
  group: null,
  role: null,
};

const mockSession = {
  user: { id: 'auth-123', email: 'test@test.com' },
  access_token: 'token-123',
};

// ─── Test Components ─────────────────────────────────────────────────
function AuthStatus() {
  const { adminUser, loading, signIn, signOut } = useAuth();
  const [loginError, setLoginError] = useState(null);

  const handleLogin = async (remember) => {
    try {
      setLoginError(null);
      await signIn('test@test.com', 'password', remember);
    } catch (err) {
      setLoginError(err.message);
    }
  };

  return (
    <div>
      <span data-testid="loading">{loading ? 'true' : 'false'}</span>
      <span data-testid="user">{adminUser ? adminUser.organization?.name : 'null'}</span>
      <span data-testid="error">{loginError || ''}</span>
      <button data-testid="login" onClick={() => handleLogin(false)}>Login</button>
      <button data-testid="login-remember" onClick={() => handleLogin(true)}>Login Remember</button>
      <button data-testid="logout" onClick={() => signOut()}>Logout</button>
    </div>
  );
}

function renderWithAuth(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <Routes>
          <Route path="*" element={<AuthStatus />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────
describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    authStateCallback = null;

    // Defaults
    mockSignOut.mockResolvedValue({ error: null });
    mockSignInWithPassword.mockResolvedValue({ data: { user: mockSession.user, session: mockSession }, error: null });
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    mockUpdateUser.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Estado inicial', () => {
    it('começa com loading=true e adminUser=null', async () => {
      renderWithAuth();

      expect(screen.getByTestId('loading').textContent).toBe('true');
      expect(screen.getByTestId('user').textContent).toBe('null');

      // Simulate INITIAL_SESSION with no session
      await act(async () => {
        await authStateCallback('INITIAL_SESSION', null);
      });

      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  describe('Login', () => {
    it('faz login e seta adminUser ANTES de retornar', async () => {
      mockFrom.mockReturnValue(mockQueryChain(mockAdminUser));

      renderWithAuth();
      const user = userEvent.setup();

      // Simulate initial load (no session)
      await act(async () => {
        await authStateCallback('INITIAL_SESSION', null);
      });

      expect(screen.getByTestId('user').textContent).toBe('null');

      // Click login
      await user.click(screen.getByTestId('login'));

      // signIn should have awaited fetchAdminProfile, so adminUser should be set
      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('Test Org');
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password',
      });
    });

    it('seta rememberMe no localStorage quando marcado', async () => {
      mockFrom.mockReturnValue(mockQueryChain(mockAdminUser));

      renderWithAuth();
      const user = userEvent.setup();

      await act(async () => {
        await authStateCallback('INITIAL_SESSION', null);
      });

      await user.click(screen.getByTestId('login-remember'));

      await waitFor(() => {
        expect(localStorage.getItem('rememberMe')).toBe('1');
      });
    });

    it('NÃO seta rememberMe quando não marcado', async () => {
      mockFrom.mockReturnValue(mockQueryChain(mockAdminUser));

      renderWithAuth();
      const user = userEvent.setup();

      await act(async () => {
        await authStateCallback('INITIAL_SESSION', null);
      });

      await user.click(screen.getByTestId('login'));

      await waitFor(() => {
        expect(localStorage.getItem('rememberMe')).toBeNull();
      });
    });

    it('seta sessionActive no sessionStorage ao fazer login', async () => {
      mockFrom.mockReturnValue(mockQueryChain(mockAdminUser));

      renderWithAuth();
      const user = userEvent.setup();

      await act(async () => {
        await authStateCallback('INITIAL_SESSION', null);
      });

      await user.click(screen.getByTestId('login'));

      await waitFor(() => {
        expect(sessionStorage.getItem('sessionActive')).toBe('1');
      });
    });

    it('exibe erro ao falhar login', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: new Error('Invalid login credentials'),
      });

      renderWithAuth();
      const user = userEvent.setup();

      await act(async () => {
        await authStateCallback('INITIAL_SESSION', null);
      });

      await user.click(screen.getByTestId('login'));

      await waitFor(() => {
        expect(screen.getByTestId('error').textContent).toBe('Invalid login credentials');
      });

      // adminUser should remain null
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  describe('Manter-me conectado (Remember Me)', () => {
    it('mantém sessão quando rememberMe está no localStorage', async () => {
      localStorage.setItem('rememberMe', '1');
      mockFrom.mockReturnValue(mockQueryChain(mockAdminUser));

      renderWithAuth();

      // Simulate INITIAL_SESSION with existing session (browser reopened)
      await act(async () => {
        await authStateCallback('INITIAL_SESSION', mockSession);
      });

      // Should NOT sign out
      expect(mockSignOut).not.toHaveBeenCalled();

      // Should fetch admin profile
      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('Test Org');
      });
    });

    it('mantém sessão quando sessionActive existe (mesma sessão do navegador)', async () => {
      sessionStorage.setItem('sessionActive', '1');
      mockFrom.mockReturnValue(mockQueryChain(mockAdminUser));

      renderWithAuth();

      await act(async () => {
        await authStateCallback('INITIAL_SESSION', mockSession);
      });

      expect(mockSignOut).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('Test Org');
      });
    });

    it('faz signOut quando NEM rememberMe NEM sessionActive existem', async () => {
      // Simulates: user logged in without "remember me", closed browser, reopened
      renderWithAuth();

      await act(async () => {
        await authStateCallback('INITIAL_SESSION', mockSession);
      });

      // Should sign out
      expect(mockSignOut).toHaveBeenCalled();

      // Should NOT set adminUser
      expect(screen.getByTestId('user').textContent).toBe('null');
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    it('NÃO faz signOut quando não há sessão (INITIAL_SESSION com null)', async () => {
      renderWithAuth();

      await act(async () => {
        await authStateCallback('INITIAL_SESSION', null);
      });

      expect(mockSignOut).not.toHaveBeenCalled();
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  describe('Logout', () => {
    it('limpa adminUser, rememberMe e sessionActive ao fazer logout', async () => {
      localStorage.setItem('rememberMe', '1');
      sessionStorage.setItem('sessionActive', '1');
      mockFrom.mockReturnValue(mockQueryChain(mockAdminUser));

      renderWithAuth();
      const user = userEvent.setup();

      // Login first
      await act(async () => {
        await authStateCallback('INITIAL_SESSION', mockSession);
      });

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('Test Org');
      });

      // Logout
      await user.click(screen.getByTestId('logout'));

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('null');
      });

      expect(localStorage.getItem('rememberMe')).toBeNull();
      expect(sessionStorage.getItem('sessionActive')).toBeNull();
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('Password Recovery', () => {
    it('detecta evento PASSWORD_RECOVERY', async () => {
      renderWithAuth();

      await act(async () => {
        await authStateCallback('PASSWORD_RECOVERY', mockSession);
      });

      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  describe('onAuthStateChange - outros eventos', () => {
    it('atualiza adminUser ao receber SIGNED_IN', async () => {
      mockFrom.mockReturnValue(mockQueryChain(mockAdminUser));

      renderWithAuth();

      // Initial load
      await act(async () => {
        await authStateCallback('INITIAL_SESSION', null);
      });

      // Simulate sign in event
      await act(async () => {
        await authStateCallback('SIGNED_IN', mockSession);
      });

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('Test Org');
      });
    });

    it('limpa adminUser ao receber SIGNED_OUT', async () => {
      sessionStorage.setItem('sessionActive', '1');
      mockFrom.mockReturnValue(mockQueryChain(mockAdminUser));

      renderWithAuth();

      // Login via INITIAL_SESSION (sessionActive existe, então não faz signOut)
      await act(async () => {
        await authStateCallback('INITIAL_SESSION', mockSession);
      });

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('Test Org');
      });

      // Simulate sign out event
      await act(async () => {
        await authStateCallback('SIGNED_OUT', null);
      });

      expect(screen.getByTestId('user').textContent).toBe('null');
    });

    it('atualiza perfil ao receber TOKEN_REFRESHED', async () => {
      mockFrom.mockReturnValue(mockQueryChain(mockAdminUser));
      localStorage.setItem('rememberMe', '1');

      renderWithAuth();

      // INITIAL_SESSION triggers fetchUserProfile via setTimeout(…, 0)
      await act(async () => {
        authStateCallback('INITIAL_SESSION', mockSession);
      });
      // Flush the setTimeout(…, 0) queued by the callback
      await act(async () => {
        await new Promise(r => setTimeout(r, 0));
      });

      mockFrom.mockClear();
      mockFrom.mockReturnValue(mockQueryChain(mockAdminUser));

      // TOKEN_REFRESHED also triggers fetchUserProfile via setTimeout
      await act(async () => {
        authStateCallback('TOKEN_REFRESHED', mockSession);
      });
      await act(async () => {
        await new Promise(r => setTimeout(r, 0));
      });

      // fetchUserProfile should have been called again
      expect(mockFrom).toHaveBeenCalledWith('user_profiles');
    });
  });
});
