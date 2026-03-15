import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  User, Mail, Lock, Building2, Phone, ArrowLeft, ArrowRight,
  Eye, EyeOff, CheckCircle2, Rocket,
} from 'lucide-react';

const STEPS = [
  { label: 'Conta', icon: User },
  { label: 'Negócio', icon: Building2 },
  { label: 'Confirmação', icon: CheckCircle2 },
];

export default function SignupPage() {
  const navigate = useNavigate();

  // Form data
  const [fullName, setFullName]         = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPwd, setConfirmPwd]     = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone]               = useState('');
  const [acceptTerms, setAcceptTerms]   = useState(false);

  // UI state
  const [step, setStep]               = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  function validateStep1() {
    if (!fullName.trim() || !email.trim() || !password || !confirmPwd) {
      setError('Preencha todos os campos obrigatórios');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Informe um e-mail válido');
      return false;
    }
    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres');
      return false;
    }
    if (password !== confirmPwd) {
      setError('As senhas não coincidem');
      return false;
    }
    return true;
  }

  function validateStep2() {
    if (!businessName.trim()) {
      setError('Nome do negócio é obrigatório');
      return false;
    }
    return true;
  }

  function handleNext() {
    setError('');
    if (step === 0 && !validateStep1()) return;
    if (step === 1 && !validateStep2()) return;
    setStep(s => s + 1);
  }

  function handleBack() {
    setError('');
    setStep(s => s - 1);
  }

  async function handleSubmit() {
    setError('');
    setLoading(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('self-signup', {
        body: {
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          businessName: businessName.trim(),
          phone,
        },
      });

      if (invokeError) {
        setError('Um erro ocorreu, por favor tente novamente');
        setLoading(false);
        return;
      }

      if (data?.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      if (data?.session) {
        await supabase.auth.setSession(data.session);
        navigate('/admin', { replace: true });
      } else {
        // Conta criada mas sem sessão — redirecionar para login
        navigate('/login', { replace: true });
      }
    } catch {
      setError('Um erro ocorreu, por favor tente novamente');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-6 animate-fade-in">
          <Link to="/" className="inline-block">
            <h1 className="text-4xl font-black text-primary-500 tracking-tight mb-1">Niilu</h1>
          </Link>
          <p className="text-slate-400 text-xs font-medium tracking-widest uppercase">Crie sua conta grátis</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i <= step
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-200 text-slate-400'
              }`}>
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 transition-all ${i < step ? 'bg-primary-500' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 animate-slide-up">

          {/* ── Step 1: Conta ── */}
          {step === 0 && (
            <>
              <h2 className="text-lg font-bold text-slate-800 mb-5">Seus dados de acesso</h2>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome completo</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
                    placeholder="Seu nome completo" autoFocus />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
                    placeholder="seu@email.com" />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Senha</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
                    placeholder="Mínimo 8 caracteres" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer" tabIndex={-1}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Confirmar senha</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={showPassword ? 'text' : 'password'} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
                    placeholder="Repita a senha" />
                </div>
              </div>
            </>
          )}

          {/* ── Step 2: Negócio ── */}
          {step === 1 && (
            <>
              <h2 className="text-lg font-bold text-slate-800 mb-5">Sobre seu negócio</h2>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome do negócio</label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
                    placeholder="Nome do restaurante ou empresa" autoFocus />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Telefone <span className="text-slate-300 normal-case">(opcional)</span></label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
                    placeholder="(11) 99999-9999" />
                </div>
              </div>
            </>
          )}

          {/* ── Step 3: Confirmação ── */}
          {step === 2 && (
            <>
              <h2 className="text-lg font-bold text-slate-800 mb-5">Confirme seus dados</h2>

              <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">Nome</span>
                  <span className="text-sm font-semibold text-slate-800">{fullName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">Email</span>
                  <span className="text-sm font-semibold text-slate-800">{email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase">Negócio</span>
                  <span className="text-sm font-semibold text-slate-800">{businessName}</span>
                </div>
                {phone && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">Telefone</span>
                    <span className="text-sm font-semibold text-slate-800">{phone}</span>
                  </div>
                )}
              </div>

              <div className="bg-primary-50 rounded-xl p-4 mb-5 border border-primary-100">
                <p className="text-sm text-primary-700 font-medium">
                  <Rocket size={14} className="inline mr-1.5 -mt-0.5" />
                  Teste grátis por 7 dias. Sem cartão de crédito.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer select-none mb-6">
                <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 accent-primary-500 cursor-pointer mt-0.5 shrink-0" />
                <span className="text-xs text-slate-500 leading-relaxed">
                  Li e aceito os <a href="#" className="text-primary-500 font-semibold hover:underline">termos de uso</a> e a{' '}
                  <a href="#" className="text-primary-500 font-semibold hover:underline">política de privacidade</a>.
                </span>
              </label>
            </>
          )}

          {/* Error */}
          {error && <p className="text-red-500 text-xs font-bold mb-4 text-center">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3">
            {step > 0 && (
              <button type="button" onClick={handleBack}
                className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 active:scale-95 transition-all min-h-[48px] flex items-center justify-center gap-2 cursor-pointer">
                <ArrowLeft size={16} /> Voltar
              </button>
            )}

            {step < 2 && (
              <button type="button" onClick={handleNext}
                className="flex-1 bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 active:scale-95 transition-all shadow-lg min-h-[48px] flex items-center justify-center gap-2 cursor-pointer">
                Próximo <ArrowRight size={16} />
              </button>
            )}

            {step === 2 && (
              <button type="button" onClick={handleSubmit} disabled={!acceptTerms || loading}
                className="flex-1 bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 active:scale-95 transition-all shadow-lg min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
                {loading ? <span className="animate-pulse">Criando conta...</span> : 'Criar minha conta grátis'}
              </button>
            )}
          </div>

          {/* Links */}
          <div className="mt-5 text-center">
            <p className="text-xs text-slate-400">
              Já tem conta?{' '}
              <Link to="/login" className="text-primary-500 font-semibold hover:underline">Faça login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
