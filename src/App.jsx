import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, Navigate, useParams } from "react-router-dom";
import { supabase } from "./supabaseClient";
import {
  BookOpen, Info, Store, User, ArrowLeft, Lock
} from "lucide-react";

import AdminArea from "./components/AdminArea";
import UserManual from "./components/UserManual";
import KioskArea from "./components/KioskArea";
import AdminLogin from "./components/AdminLogin";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      {/* Kiosk com slug da org */}
      <Route path="/:orgSlug" element={<KioskHome />} />
      <Route path="/:orgSlug/kiosk" element={<KioskRoute />} />

      {/* Admin (protegido por auth) */}
      <Route path="/login" element={<AdminLogin />} />
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminArea onExit={() => {}} />
        </ProtectedRoute>
      } />

      {/* Manual */}
      <Route path="/manual" element={<UserManual onExit={() => {}} />} />

      {/* Fallback: redireciona para org padrao */}
      <Route path="/" element={<Navigate to="/default" replace />} />
    </Routes>
  );
}

// =============================================================================
// KIOSK HOME — Tela de login de 2 etapas, scoped por org
// =============================================================================
function KioskHome() {
  const navigate = useNavigate();
  const { orgSlug } = useParams();

  const [organization, setOrganization] = useState(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState(false);

  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    resolveOrg();
  }, [orgSlug]);

  async function resolveOrg() {
    setOrgLoading(true);
    setOrgError(false);

    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, slug, logo_url')
      .eq('slug', orgSlug)
      .eq('active', true)
      .single();

    if (error || !data) {
      setOrgError(true);
      setOrgLoading(false);
      return;
    }

    setOrganization(data);
    setOrgLoading(false);
    fetchStores(data.id);
  }

  async function fetchStores(orgId) {
    const { data } = await supabase
      .from('stores')
      .select('*')
      .eq('organization_id', orgId)
      .eq('active', true)
      .order('name');
    setStores(data || []);
  }

  async function handleSelectStore(store) {
    setSelectedStore(store);
    const { data } = await supabase
      .from('employee')
      .select('*, roles(name)')
      .eq('store_id', store.id)
      .eq('active', true)
      .order('full_name');
    setUsers(data || []);
  }

  function handleLogin(user) {
    setLoading(true);
    const userData = {
      ...user,
      store_name: selectedStore.name,
      role_name: user.roles?.name,
      organization_id: organization.id,
    };

    // Salva no sessionStorage para persistir durante a sessao
    sessionStorage.setItem('kiosk_user', JSON.stringify(userData));
    sessionStorage.setItem('kiosk_org', orgSlug);

    setLoading(false);
    navigate(`/${orgSlug}/kiosk`);
  }

  const handleBack = () => {
    setSelectedStore(null);
    setUsers([]);
  };

  // Loading org
  if (orgLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  // Org not found
  if (orgError) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Organização não encontrada</h1>
          <p className="text-slate-500 mb-6">Verifique o endereço e tente novamente.</p>
          <button
            onClick={() => navigate('/login')}
            className="text-primary-500 hover:text-primary-600 font-medium text-sm cursor-pointer"
          >
            Ir para login administrativo
          </button>
        </div>
      </div>
    );
  }

  return (
    <Home
      stores={stores}
      users={users}
      selectedStore={selectedStore}
      loading={loading}
      handleSelectStore={handleSelectStore}
      handleLogin={handleLogin}
      navigate={navigate}
      onBack={handleBack}
      orgSlug={orgSlug}
      organization={organization}
    />
  );
}

// =============================================================================
// KIOSK ROUTE — Dashboard com protecao de sessao
// =============================================================================
function KioskRoute() {
  const navigate = useNavigate();
  const { orgSlug } = useParams();

  const stored = sessionStorage.getItem('kiosk_user');
  const storedOrg = sessionStorage.getItem('kiosk_org');

  if (!stored || storedOrg !== orgSlug) {
    return <Navigate to={`/${orgSlug}`} replace />;
  }

  const userData = JSON.parse(stored);

  const handleLogout = () => {
    sessionStorage.removeItem('kiosk_user');
    navigate(`/${orgSlug}`);
  };

  return <KioskArea user={userData} onLogout={handleLogout} />;
}

// =============================================================================
// CONSTANTES
// =============================================================================
const STORE_COLORS = [
  "from-blue-600 to-indigo-700",
  "from-emerald-600 to-teal-700",
  "from-violet-600 to-purple-700",
  "from-amber-600 to-orange-700",
  "from-rose-600 to-pink-700",
  "from-cyan-600 to-sky-700",
];

function getInitials(name) {
  if (!name) return "?";
  return name.trim()[0].toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
];

// =============================================================================
// HOME COMPONENT — Tela Kiosk de 2 etapas
// =============================================================================
function Home({ stores, users, selectedStore, loading, handleSelectStore, handleLogin, navigate, onBack, orgSlug, organization }) {
  return (
    <div className="min-h-screen bg-slate-100 font-sans">

      {/* ---- BARRA TOPO ---- */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-slate-200 px-4 py-2 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-primary-500" />
            <span className="text-xs text-slate-500"><strong className="text-primary-500">Beta</strong> — Relate erros ao gerente</span>
          </div>
          <button
            onClick={() => navigate('/manual')}
            className="flex items-center gap-1 text-slate-500 hover:text-primary-500 text-xs font-medium px-2 py-1 rounded hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <BookOpen size={12} /> Manual
          </button>
        </div>
      </div>

      {/* ---- CONTEUDO PRINCIPAL ---- */}
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-8 flex flex-col min-h-[90vh] pb-safe">

        {/* LOGO */}
        <div className="text-center mb-6 sm:mb-10 animate-fade-in">
          {organization?.logo_url ? (
            <img src={organization.logo_url} alt={organization.name} className="h-16 mx-auto mb-2" />
          ) : (
            <h1 className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight mb-1">Niilu</h1>
          )}
          <p className="text-slate-400 text-xs sm:text-sm font-medium tracking-widest uppercase">Gestão de Rotinas</p>
        </div>

        {/* ====== ETAPA 1: SELECAO DE LOJA ====== */}
        {!selectedStore && (
          <div className="animate-fade-in flex-1">
            <h2 className="text-xl font-bold text-slate-700 mb-6 flex items-center gap-2">
              <Store size={22} className="text-primary-500" /> Selecione sua Loja
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {stores.map((store, idx) => (
                <button
                  key={store.id}
                  onClick={() => handleSelectStore(store)}
                  className={`
                    bg-gradient-to-br ${STORE_COLORS[idx % STORE_COLORS.length]}
                    p-4 sm:p-6 rounded-2xl text-white font-bold text-base sm:text-lg text-left
                    shadow-lg hover:shadow-2xl hover:brightness-110
                    active:scale-95 transition-all duration-200
                    flex items-center gap-4 min-h-[90px]
                    border border-white/10
                    animate-slide-up cursor-pointer
                  `}
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <div className="bg-white/20 rounded-xl p-3 shrink-0">
                    <Store size={24} />
                  </div>
                  <div>
                    <div className="leading-tight">{store.shortName || store.name}</div>
                    {store.InternalCode && (
                      <div className="text-[10px] font-normal text-white/60 mt-1">Cod: {store.InternalCode}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ====== ETAPA 2: SELECAO DE FUNCIONARIO ====== */}
        {selectedStore && (
          <div className="animate-fade-in flex-1">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-800 mb-6 text-sm font-medium transition-colors group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-slate-500">›</span>
              <span className="text-primary-500 font-bold">{selectedStore.shortName || selectedStore.name}</span>
            </button>

            <h2 className="text-2xl font-bold text-slate-800 mb-6">Quem é você?</h2>

            {users.length === 0 ? (
              <div className="text-center text-slate-500 py-16">
                <User size={48} className="mx-auto mb-4 text-slate-400" />
                <p className="font-medium">Nenhum colaborador ativo nesta loja</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {users.map((user, idx) => (
                  <button
                    key={user.id}
                    onClick={() => handleLogin(user)}
                    disabled={loading}
                    className={`
                      bg-white/95 backdrop-blur rounded-2xl p-3 sm:p-4
                      text-left flex items-center gap-3 min-h-[56px]
                      shadow-md hover:shadow-xl hover:border-primary-400
                      active:scale-95 transition-all duration-200
                      border border-slate-200/50
                      animate-slide-up cursor-pointer
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <div className={`
                      ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}
                      w-12 h-12 rounded-full flex items-center justify-center
                      text-white font-bold text-sm shrink-0
                      shadow-sm
                    `}>
                      {getInitials(user.full_name)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 text-sm leading-tight truncate">
                        {user.full_name}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                        {user.roles?.name || 'Sem cargo'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---- BOTAO ADMIN (RODAPE) ---- */}
        <div className="mt-auto pt-6 sm:pt-8 text-center pb-safe">
          <button
            onClick={() => navigate('/login')}
            className="text-slate-400 hover:text-slate-600 text-xs font-medium flex items-center gap-1.5 mx-auto px-4 py-3 rounded-lg hover:bg-slate-200 transition-colors min-h-[44px] cursor-pointer"
          >
            <Lock size={12} /> Acesso Admin
          </button>
        </div>
      </div>
    </div>
  );
}
