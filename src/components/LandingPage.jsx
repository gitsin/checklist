import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare, Users, BarChart2, Zap, Shield, Bell,
  ChevronRight, Menu, X, Star, ArrowRight,
  ClipboardList, Camera, ThumbsUp, Building2, Smartphone, Globe
} from 'lucide-react';

// ─── DATA ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: ClipboardList,
    color: 'bg-emerald-50 text-emerald-600',
    title: 'Tarefas por cargo',
    desc: 'Cada colaborador vê exatamente o que precisa fazer — sem ruído, sem confusão. Checklists organizados por turno e função.',
  },
  {
    icon: Camera,
    color: 'bg-blue-50 text-blue-600',
    title: 'Evidência obrigatória',
    desc: 'Exija foto ou observação como prova de execução. Chega de "fingir que fez". Você vê tudo em tempo real.',
  },
  {
    icon: ThumbsUp,
    color: 'bg-violet-50 text-violet-600',
    title: 'Aprovação do gerente',
    desc: 'Tarefas críticas passam por aprovação antes de serem concluídas. O gerente valida pelo celular, de qualquer lugar.',
  },
  {
    icon: Building2,
    color: 'bg-amber-50 text-amber-600',
    title: 'Multi-unidade',
    desc: 'Diretores visualizam todas as lojas do grupo em um único painel. Compare performance e identifique gargalos na operação.',
  },
  {
    icon: BarChart2,
    color: 'bg-rose-50 text-rose-600',
    title: 'Relatórios automáticos',
    desc: 'Métricas de conclusão, tarefas atrasadas e performance da equipe disponíveis sem precisar montar planilha nenhuma.',
  },
  {
    icon: Zap,
    color: 'bg-cyan-50 text-cyan-600',
    title: 'Tarefas imediatas',
    desc: 'Gerentes criam tarefas emergenciais que aparecem instantaneamente para a equipe. Resposta rápida a imprevistos.',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Configure em minutos',
    desc: 'Cadastre suas lojas, cargos e tarefas. Use nossos modelos prontos ou crie do zero. Você não precisa de TI para isso.',
  },
  {
    num: '02',
    title: 'Equipe acessa pelo tablet',
    desc: 'Colaboradores acessam o kiosk da loja pelo tablet ou celular. Sem app para instalar, sem senha para lembrar.',
  },
  {
    num: '03',
    title: 'Você acompanha de onde estiver',
    desc: 'Acesse o painel pelo celular e veja em tempo real o que foi feito, o que está atrasado e quem precisa de atenção.',
  },
];

const STATS = [
  { value: '98%', label: 'das tarefas concluídas no prazo' },
  { value: '3x',  label: 'menos tempo gerenciando equipe' },
  { value: '5min', label: 'para configurar sua primeira loja' },
  { value: '0',   label: 'planilhas necessárias' },
];

const PLANS = [
  {
    name: 'Starter',
    price: 'R$ 97',
    period: '/mês',
    desc: 'Ideal para uma loja iniciando a gestão de rotinas.',
    features: ['Até 1 loja', 'Usuários ilimitados', 'Tarefas diárias e semanais', 'Relatórios básicos', 'Suporte por email'],
    cta: 'Começar grátis',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 'R$ 247',
    period: '/mês',
    desc: 'Para redes com múltiplas unidades e gestão centralizada.',
    features: ['Até 10 lojas', 'Grupos e diretores', 'Aprovação com evidência', 'Relatórios avançados', 'Suporte prioritário', 'Tarefas mensais'],
    cta: 'Começar grátis',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Sob consulta',
    period: '',
    desc: 'Holdings com muitas unidades e necessidades customizadas.',
    features: ['Lojas ilimitadas', 'Multi-holding', 'API e integrações', 'Onboarding dedicado', 'SLA garantido', 'Personalização de marca'],
    cta: 'Falar com vendas',
    highlight: false,
  },
];

// ─── COMPONENTES ───────────────────────────────────────────────────────────────

function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="font-black text-2xl text-primary-500 tracking-tight">Niilu</Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#funcionalidades" className="text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors">Funcionalidades</a>
          <a href="#como-funciona"   className="text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors">Como funciona</a>
          <a href="#precos"          className="text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors">Preços</a>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-slate-600 hover:text-slate-900 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">
            Entrar
          </Link>
          <Link to="/login" className="bg-primary-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-primary-600 active:scale-95 transition-all shadow-md">
            Começar grátis
          </Link>
        </div>

        {/* Mobile menu button */}
        <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 flex flex-col gap-3">
          <a href="#funcionalidades" onClick={() => setOpen(false)} className="text-slate-600 font-medium py-2">Funcionalidades</a>
          <a href="#como-funciona"   onClick={() => setOpen(false)} className="text-slate-600 font-medium py-2">Como funciona</a>
          <a href="#precos"          onClick={() => setOpen(false)} className="text-slate-600 font-medium py-2">Preços</a>
          <hr className="border-slate-100" />
          <Link to="/login" className="text-slate-600 font-semibold py-2">Entrar</Link>
          <Link to="/login" className="bg-primary-500 text-white font-bold px-5 py-3 rounded-xl text-center">Começar grátis</Link>
        </div>
      )}
    </nav>
  );
}

function Hero() {
  return (
    <section className="bg-gradient-to-b from-white to-slate-50 pt-16 pb-24 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-600 text-xs font-bold px-4 py-1.5 rounded-full mb-6 border border-primary-100">
          <Star size={12} className="fill-primary-500" /> Número 1 em gestão de rotinas para restaurantes
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 leading-tight mb-6">
          Sua equipe executa.
          <br />
          <span className="text-primary-500">Você comprova.</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          O Niilu transforma checklists em rotinas que realmente funcionam.
          Tarefas por cargo, aprovação com evidência e relatórios automáticos —
          sem planilha, sem papelada, sem achismo.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
          <Link to="/login"
            className="bg-primary-500 text-white font-bold px-8 py-4 rounded-2xl hover:bg-primary-600 active:scale-95 transition-all shadow-xl shadow-primary-500/25 text-base flex items-center justify-center gap-2">
            Começar grátis <ArrowRight size={18} />
          </Link>
          <a href="#como-funciona"
            className="bg-white text-slate-700 font-bold px-8 py-4 rounded-2xl hover:bg-slate-100 active:scale-95 transition-all border-2 border-slate-200 text-base flex items-center justify-center gap-2">
            Ver como funciona
          </a>
        </div>

        {/* Mock dashboard */}
        <div className="relative max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Top bar */}
            <div className="bg-primary-500 px-5 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-white/30" />
                <div className="w-3 h-3 rounded-full bg-white/30" />
                <div className="w-3 h-3 rounded-full bg-white/30" />
              </div>
              <div className="flex-1 bg-white/20 rounded-md h-5 mx-8" />
            </div>
            {/* Dashboard content mockup */}
            <div className="p-5 bg-slate-50">
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 w-32 bg-slate-200 rounded-md" />
                <div className="h-7 w-24 bg-primary-500 rounded-lg opacity-80" />
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {['bg-emerald-100', 'bg-amber-100', 'bg-blue-100'].map((c, i) => (
                  <div key={i} className={`${c} rounded-xl p-3`}>
                    <div className="h-3 w-12 bg-current opacity-30 rounded mb-2" />
                    <div className="h-6 w-8 bg-current opacity-40 rounded font-bold" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  { w: 'w-3/4', done: true },
                  { w: 'w-4/5', done: true },
                  { w: 'w-2/3', done: false },
                  { w: 'w-3/5', done: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                    <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center ${item.done ? 'bg-emerald-500' : 'border-2 border-slate-200'}`}>
                      {item.done && <CheckSquare size={12} className="text-white" />}
                    </div>
                    <div className={`h-3 ${item.w} bg-slate-200 rounded`} />
                    <div className="ml-auto h-5 w-12 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Floating badges */}
          <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl border border-slate-100 px-4 py-2.5 hidden sm:flex items-center gap-2 animate-fade-in">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
              <CheckSquare size={14} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Abertura aprovada</p>
              <p className="text-[10px] text-slate-400">há 2 minutos</p>
            </div>
          </div>
          <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl border border-slate-100 px-4 py-2.5 hidden sm:flex items-center gap-2 animate-fade-in">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
              <Bell size={14} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">3 tarefas atrasadas</p>
              <p className="text-[10px] text-slate-400">Loja Centro</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="bg-primary-500 py-14 px-4">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {STATS.map(s => (
          <div key={s.label} className="text-center">
            <p className="text-4xl font-black text-white mb-1">{s.value}</p>
            <p className="text-primary-100 text-sm font-medium leading-snug">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="funcionalidades" className="py-24 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-primary-500 font-bold text-sm uppercase tracking-widest mb-3">Funcionalidades</p>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
            Tudo que sua operação precisa
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Do colaborador no balcão ao dono da rede — cada perfil tem exatamente o que precisa.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-primary-200 hover:shadow-lg transition-all group">
                <div className={`w-12 h-12 ${f.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon size={22} />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="py-24 px-4 bg-slate-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-primary-500 font-bold text-sm uppercase tracking-widest mb-3">Como funciona</p>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
            Configure hoje, use amanhã
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Sem treinamentos longos, sem processos complexos de implantação.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <div key={step.num} className="relative">
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-primary-200 to-transparent -translate-x-4 z-0" />
              )}
              <div className="relative z-10">
                <div className="w-16 h-16 bg-primary-500 text-white rounded-2xl flex items-center justify-center font-black text-xl mb-5 shadow-lg shadow-primary-500/25">
                  {step.num}
                </div>
                <h3 className="font-bold text-slate-900 text-xl mb-3">{step.title}</h3>
                <p className="text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Devices */}
        <div className="mt-16 flex flex-wrap justify-center gap-6">
          {[
            { icon: Globe, label: 'Navegador web' },
            { icon: Smartphone, label: 'Celular' },
            { icon: Smartphone, label: 'Tablet kiosk' },
          ].map(d => {
            const Icon = d.icon;
            return (
              <div key={d.label} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm">
                <Icon size={16} className="text-primary-500" /> {d.label}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="precos" className="py-24 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-primary-500 font-bold text-sm uppercase tracking-widest mb-3">Preços</p>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Simples e transparente</h2>
          <p className="text-slate-500 text-lg">Sem taxa de implantação. Cancele quando quiser.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map(plan => (
            <div key={plan.name} className={`rounded-2xl p-7 flex flex-col border-2 transition-all ${plan.highlight ? 'border-primary-500 bg-primary-500 text-white shadow-2xl shadow-primary-500/20 scale-105' : 'border-slate-200 bg-white hover:border-primary-200 hover:shadow-lg'}`}>
              <div className="mb-6">
                <p className={`font-bold text-sm mb-1 ${plan.highlight ? 'text-primary-100' : 'text-slate-500'}`}>{plan.name}</p>
                <div className="flex items-end gap-1 mb-2">
                  <span className={`text-3xl font-black ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>{plan.price}</span>
                  {plan.period && <span className={`text-sm font-medium mb-1 ${plan.highlight ? 'text-primary-100' : 'text-slate-400'}`}>{plan.period}</span>}
                </div>
                <p className={`text-sm ${plan.highlight ? 'text-primary-100' : 'text-slate-500'}`}>{plan.desc}</p>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${plan.highlight ? 'bg-white/20' : 'bg-primary-50'}`}>
                      <CheckSquare size={12} className={plan.highlight ? 'text-white' : 'text-primary-500'} />
                    </div>
                    <span className={`text-sm ${plan.highlight ? 'text-primary-50' : 'text-slate-600'}`}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link to="/login"
                className={`w-full py-3.5 rounded-xl font-bold text-center text-sm transition-all active:scale-95 ${plan.highlight ? 'bg-white text-primary-500 hover:bg-primary-50' : 'bg-primary-500 text-white hover:bg-primary-600'}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24 px-4 bg-gradient-to-br from-primary-500 to-emerald-700">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
          Pronto para ter uma equipe autogerenciável?
        </h2>
        <p className="text-primary-100 text-lg mb-10 max-w-xl mx-auto">
          Comece grátis hoje. Configure em minutos, veja resultado em dias.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/login"
            className="bg-white text-primary-600 font-bold px-8 py-4 rounded-2xl hover:bg-primary-50 active:scale-95 transition-all shadow-xl text-base flex items-center justify-center gap-2">
            Começar grátis <ArrowRight size={18} />
          </Link>
          <a href="mailto:contato@niilu.com.br"
            className="border-2 border-white/40 text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/10 active:scale-95 transition-all text-base flex items-center justify-center gap-2">
            Falar com a equipe
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <p className="font-black text-2xl text-white mb-3">Niilu</p>
            <p className="text-sm leading-relaxed">Gestão de rotinas para restaurantes e redes de alimentação.</p>
          </div>
          <div>
            <p className="font-bold text-white text-sm mb-4">Produto</p>
            <ul className="space-y-2 text-sm">
              <li><a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a></li>
              <li><a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a></li>
              <li><a href="#precos" className="hover:text-white transition-colors">Preços</a></li>
              <li><Link to="/manual" className="hover:text-white transition-colors">Manual</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-white text-sm mb-4">Empresa</p>
            <ul className="space-y-2 text-sm">
              <li><a href="mailto:contato@niilu.com.br" className="hover:text-white transition-colors">Contato</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Termos de uso</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacidade</a></li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-white text-sm mb-4">Acesso</p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/login" className="hover:text-white transition-colors">Entrar</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Criar conta</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm">© {new Date().getFullYear()} Niilu. Todos os direitos reservados.</p>
          <div className="flex items-center gap-1 text-sm">
            <Shield size={14} className="text-primary-400" />
            <span>Dados protegidos com RLS no Supabase</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── EXPORT ────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="font-sans">
      <Nav />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}
