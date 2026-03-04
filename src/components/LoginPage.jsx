import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, LogIn, ArrowLeft, Send, KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { userProfile, signIn, resetPassword, updatePassword, passwordRecovery, getHomeRoute } = useAuth();

  // Redireciona se já está autenticado
  useEffect(() => {
    if (userProfile) navigate(getHomeRoute(), { replace: true });
  }, [userProfile]);

  const [view, setView]                   = useState('login'); // 'login' | 'forgot' | 'reset'
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [rememberMe, setRememberMe]       = useState(false);
  const [showPassword, setShowPassword]   = useState(false);
  const [resetEmail, setResetEmail]       = useState('');
  const [resetSent, setResetSent]         = useState(false);
  const [newPassword, setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPwd, setShowNewPwd]       = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);

  const isRecovery = passwordRecovery || view === 'reset';

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true); setError('');
    try {
      await signIn(email, password, rememberMe);
    } catch {
      setError('Email ou senha incorretos');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    if (!resetEmail) return;
    setLoading(true); setError('');
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch {
      setError('Não foi possível enviar o email. Verifique o endereço e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePassword(e) {
    e.preventDefault();
    if (!newPassword || !confirmPassword) return;
    if (newPassword.length < 6) { setError('A senha deve ter pelo menos 6 caracteres'); return; }
    if (newPassword !== confirmPassword) { setError('As senhas não coincidem'); return; }
    setLoading(true); setError('');
    try {
      await updatePassword(newPassword);
      setPasswordUpdated(true);
    } catch {
      setError('Não foi possível atualizar a senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <Link to="/" className="inline-block">
            <h1 className="text-4xl font-black text-primary-500 tracking-tight mb-1">Niilu</h1>
          </Link>
          <p className="text-slate-400 text-xs font-medium tracking-widest uppercase">Gestão de Rotinas</p>
        </div>

        {/* ── LOGIN ── */}
        {!isRecovery && view === 'login' && (
          <form onSubmit={handleLogin} className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 animate-slide-up">
            <h2 className="text-lg font-bold text-slate-800 mb-5">Entrar na sua conta</h2>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
                  placeholder="seu@email.com" autoFocus />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer" tabIndex={-1}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 accent-primary-500 cursor-pointer" />
                <span className="text-xs text-slate-500 font-medium">Manter-me conectado</span>
              </label>
              <button type="button" onClick={() => { setView('forgot'); setResetEmail(email); setError(''); }}
                className="text-xs text-primary-500 hover:text-primary-600 font-medium cursor-pointer">
                Esqueci a senha
              </button>
            </div>

            {error && <p className="text-red-500 text-xs font-bold mb-4 text-center">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 active:scale-95 transition-all shadow-lg min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
              {loading ? <span className="animate-pulse">Entrando...</span> : <><LogIn size={18} /> Entrar</>}
            </button>

            <div className="mt-4 text-center">
              <Link to="/" className="text-slate-400 hover:text-slate-600 text-xs font-medium flex items-center gap-1 justify-center">
                <ArrowLeft size={12} /> Voltar ao início
              </Link>
            </div>
          </form>
        )}

        {/* ── ESQUECI SENHA ── */}
        {!isRecovery && view === 'forgot' && (
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 animate-slide-up">
            {!resetSent ? (
              <form onSubmit={handleForgotPassword}>
                <div className="text-center mb-5">
                  <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mail size={22} className="text-primary-500" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Recuperar senha</h2>
                  <p className="text-xs text-slate-400 mt-1">Enviaremos um link para redefinir sua senha</p>
                </div>
                <div className="mb-5">
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
                      placeholder="seu@email.com" autoFocus />
                  </div>
                </div>
                {error && <p className="text-red-500 text-xs font-bold mb-4 text-center">{error}</p>}
                <button type="submit" disabled={loading || !resetEmail}
                  className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 active:scale-95 transition-all shadow-lg min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
                  {loading ? <span className="animate-pulse">Enviando...</span> : <><Send size={16} /> Enviar link</>}
                </button>
                <button type="button" onClick={() => { setView('login'); setError(''); }}
                  className="mt-3 w-full text-slate-400 hover:text-slate-600 py-3 min-h-[44px] font-semibold text-sm rounded-xl hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center gap-1.5">
                  <ArrowLeft size={14} /> Voltar ao login
                </button>
              </form>
            ) : (
              <div className="text-center py-2">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={28} className="text-green-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-2">Email enviado!</h2>
                <p className="text-sm text-slate-500 mb-1">Link enviado para:</p>
                <p className="text-sm font-bold text-slate-700 mb-4">{resetEmail}</p>
                <p className="text-xs text-slate-400 mb-6">Verifique sua caixa de entrada e spam. O link expira em 1 hora.</p>
                <button onClick={() => { setView('login'); setResetSent(false); }}
                  className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 active:scale-95 transition-all shadow-lg min-h-[48px] flex items-center justify-center gap-2 cursor-pointer">
                  <ArrowLeft size={16} /> Voltar ao login
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── REDEFINIR SENHA ── */}
        {isRecovery && (
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 animate-slide-up">
            {!passwordUpdated ? (
              <form onSubmit={handleUpdatePassword}>
                <div className="text-center mb-5">
                  <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <KeyRound size={22} className="text-primary-500" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Nova senha</h2>
                  <p className="text-xs text-slate-400 mt-1">Defina sua nova senha de acesso</p>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nova senha</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={showNewPwd ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
                      placeholder="Mínimo 6 caracteres" autoFocus />
                    <button type="button" onClick={() => setShowNewPwd(!showNewPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer" tabIndex={-1}>
                      {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Confirmar senha</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={showNewPwd ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
                      placeholder="Repita a nova senha" />
                  </div>
                </div>
                {error && <p className="text-red-500 text-xs font-bold mb-4 text-center">{error}</p>}
                <button type="submit" disabled={loading || !newPassword || !confirmPassword}
                  className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 active:scale-95 transition-all shadow-lg min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
                  {loading ? <span className="animate-pulse">Salvando...</span> : <><KeyRound size={16} /> Salvar nova senha</>}
                </button>
              </form>
            ) : (
              <div className="text-center py-2">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={28} className="text-green-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-2">Senha atualizada!</h2>
                <p className="text-sm text-slate-500 mb-6">Sua senha foi alterada com sucesso.</p>
                <button onClick={() => navigate('/login')}
                  className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 active:scale-95 transition-all shadow-lg min-h-[48px] flex items-center justify-center gap-2 cursor-pointer">
                  <LogIn size={16} /> Entrar na conta
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
