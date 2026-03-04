import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, useNavigate, Navigate, useParams } from "react-router-dom";
import { supabase, setOrgHeader } from "./supabaseClient";
import { useAuth } from "./contexts/AuthContext";
import { BookOpen, Info, Store, User, ArrowLeft, Lock, KeyRound, Delete } from "lucide-react";
import KioskArea from "./components/KioskArea";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy: carregados só quando a rota é acessada
const LandingPage       = lazy(() => import("./components/LandingPage"));
const LoginPage         = lazy(() => import("./components/LoginPage"));
const AdminArea         = lazy(() => import("./components/AdminArea"));
const StoreManagerArea  = lazy(() => import("./components/StoreManagerArea"));
const KioskShell        = lazy(() => import("./components/KioskShell"));
const UserManual        = lazy(() => import("./components/UserManual"));

function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm font-medium">Carregando...</p>
      </div>
    </div>
  );
}

// Redireciona usuários autenticados para a tela correta
function RootRedirect() {
  const { userProfile, loading, getHomeRoute } = useAuth();
  if (loading) return <PageLoader />;
  if (userProfile) return <Navigate to={getHomeRoute()} replace />;
  return (
    <Suspense fallback={<PageLoader />}>
      <LandingPage />
    </Suspense>
  );
}

export default function App() {
  return (
    <Routes>
      {/* ════════════════════════════════════════
          PÚBLICAS
      ════════════════════════════════════════ */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
      <Route path="/manual" element={<Suspense fallback={<PageLoader />}><UserManual onExit={() => {}} /></Suspense>} />

      {/* ════════════════════════════════════════
          KIOSK PÚBLICO (seleção loja/funcionário por slug)
          Mantido para compatibilidade e lojas sem disp_compartilhado
      ════════════════════════════════════════ */}
      <Route path="/:orgSlug" element={<KioskHome />} />
      <Route path="/:orgSlug/kiosk" element={<KioskRoute />} />

      {/* ════════════════════════════════════════
          KIOSK POR GRUPO (filtra lojas do grupo)
      ════════════════════════════════════════ */}
      <Route path="/:orgSlug/:groupSlug" element={<KioskHome />} />
      <Route path="/:orgSlug/:groupSlug/kiosk" element={<KioskRoute />} />

      {/* ════════════════════════════════════════
          KIOSK AUTENTICADO (disp_compartilhado)
      ════════════════════════════════════════ */}
      <Route path="/kiosk/:storeId" element={
        <ProtectedRoute allowedTypes={['disp_compartilhado']}>
          <Suspense fallback={<PageLoader />}><KioskShell /></Suspense>
        </ProtectedRoute>
      } />

      {/* ════════════════════════════════════════
          GERENTE DE LOJA
      ════════════════════════════════════════ */}
      <Route path="/gerente" element={
        <ProtectedRoute allowedTypes={['store_manager']}>
          <Suspense fallback={<PageLoader />}><StoreManagerArea /></Suspense>
        </ProtectedRoute>
      } />

      {/* ════════════════════════════════════════
          ADMIN (holding_owner, group_director, super_admin)
      ════════════════════════════════════════ */}
      <Route path="/admin" element={
        <ProtectedRoute allowedTypes={['super_admin', 'holding_owner', 'group_director']}>
          <Suspense fallback={<PageLoader />}><AdminArea onExit={() => {}} /></Suspense>
        </ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KIOSK HOME — login público por slug da org (seleciona loja → funcionário)
// ═══════════════════════════════════════════════════════════════════════════════
const STORE_COLORS = [
  "from-blue-600 to-indigo-700", "from-emerald-600 to-teal-700",
  "from-violet-600 to-purple-700", "from-amber-600 to-orange-700",
  "from-rose-600 to-pink-700", "from-cyan-600 to-sky-700",
];
const AVATAR_COLORS = [
  "bg-blue-500","bg-emerald-500","bg-violet-500","bg-amber-500",
  "bg-rose-500","bg-cyan-500","bg-indigo-500","bg-teal-500",
];

function getInitials(name) {
  if (!name) return "?";
  return name.trim()[0].toUpperCase();
}

function KioskHome() {
  const navigate = useNavigate();
  const { orgSlug, groupSlug } = useParams();
  const [organization, setOrganization] = useState(null);
  const [group, setGroup] = useState(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState(false);
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [loading, setLoading] = useState(false);

  // PIN flow
  const [pinUser, setPinUser] = useState(null);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => { resolveOrg(); }, [orgSlug, groupSlug]);

  async function resolveOrg() {
    setOrgLoading(true); setOrgError(false);

    const { data: orgData, error: orgErr } = await supabase
      .from('organizations')
      .select('id, name, slug, logo_url')
      .eq('slug', orgSlug)
      .eq('active', true)
      .single();

    if (orgErr || !orgData) { setOrgError(true); setOrgLoading(false); return; }

    setOrganization(orgData);
    setOrgHeader(orgData.id);

    // Se há groupSlug, resolve o grupo e filtra lojas
    let groupId = null;
    if (groupSlug) {
      const { data: groupData, error: groupErr } = await supabase
        .from('restaurant_groups')
        .select('id, name')
        .eq('organization_id', orgData.id)
        .eq('slug', groupSlug)
        .eq('active', true)
        .single();

      if (groupErr || !groupData) { setOrgError(true); setOrgLoading(false); return; }
      setGroup(groupData);
      groupId = groupData.id;
    } else {
      setGroup(null);
    }

    let storeQuery = supabase
      .from('stores')
      .select('id, name, shortName, InternalCode, active')
      .eq('organization_id', orgData.id)
      .eq('active', true)
      .order('name');

    if (groupId) storeQuery = storeQuery.eq('restaurant_group_id', groupId);

    const { data: storesData } = await storeQuery;
    setStores(storesData || []);
    setOrgLoading(false);
  }

  async function handleSelectStore(store) {
    setSelectedStore(store);
    const { data } = await supabase
      .from('user_profiles')
      .select('id, full_name, role_id, store_id, organization_id, pin_code, role:roles(name)')
      .eq('store_id', store.id)
      .in('user_type', ['colaborador', 'store_manager'])
      .eq('active', true)
      .order('full_name');
    setUsers(data || []);
  }

  function handleLogin(user) {
    setLoading(true);
    const userData = {
      ...user,
      store_name: selectedStore.name,
      role_name: user.role?.name,
      organization_id: organization.id,
    };
    sessionStorage.setItem('kiosk_user', JSON.stringify(userData));
    sessionStorage.setItem('kiosk_org', orgSlug);
    if (groupSlug) {
      sessionStorage.setItem('kiosk_group', groupSlug);
      navigate(`/${orgSlug}/${groupSlug}/kiosk`);
    } else {
      sessionStorage.removeItem('kiosk_group');
      navigate(`/${orgSlug}/kiosk`);
    }
    setLoading(false);
  }

  function handleUserSelect(user) {
    if (user.pin_code) {
      setPinUser(user);
      setPinValue('');
      setPinError(false);
    } else {
      handleLogin(user);
    }
  }

  function handlePinDigit(digit) {
    if (pinValue.length >= 4) return;
    const next = pinValue + digit;
    setPinValue(next);
    setPinError(false);
    if (next.length === 4) {
      if (next === pinUser.pin_code) {
        handleLogin(pinUser);
      } else {
        setPinError(true);
        setTimeout(() => setPinValue(''), 600);
      }
    }
  }

  function handlePinBackspace() {
    setPinValue(v => v.slice(0, -1));
    setPinError(false);
  }

  if (orgLoading) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm font-medium">Carregando...</p>
      </div>
    </div>
  );

  if (orgError) return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Organização não encontrada</h1>
        <p className="text-slate-500 mb-6">Verifique o endereço e tente novamente.</p>
        <button onClick={() => navigate('/login')} className="text-primary-500 hover:text-primary-600 font-medium text-sm cursor-pointer">
          Ir para login
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <div className="bg-white/90 backdrop-blur-sm border-b border-slate-200 px-4 py-2 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-primary-500" />
            <span className="text-xs text-slate-500"><strong className="text-primary-500">Beta</strong> — Relate erros ao gerente</span>
          </div>
          <button onClick={() => navigate('/manual')} className="flex items-center gap-1 text-slate-500 hover:text-primary-500 text-xs font-medium px-2 py-1 rounded hover:bg-slate-200 transition-colors cursor-pointer">
            <BookOpen size={12} /> Manual
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-8 flex flex-col min-h-[90vh] pb-safe">
        <div className="text-center mb-6 sm:mb-10 animate-fade-in">
          {organization?.logo_url
            ? <img src={organization.logo_url} alt={organization.name} className="h-16 mx-auto mb-2" />
            : <h1 className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight mb-1">Niilu</h1>}
          <p className="text-slate-400 text-xs sm:text-sm font-medium tracking-widest uppercase">
            {group ? group.name : 'Gestão de Rotinas'}
          </p>
        </div>

        {!selectedStore && (
          <div className="animate-fade-in flex-1">
            <h2 className="text-xl font-bold text-slate-700 mb-6 flex items-center gap-2">
              <Store size={22} className="text-primary-500" /> Selecione sua Loja
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {stores.map((store, idx) => (
                <button key={store.id} onClick={() => handleSelectStore(store)}
                  className={`bg-gradient-to-br ${STORE_COLORS[idx % STORE_COLORS.length]} p-4 sm:p-6 rounded-2xl text-white font-bold text-base sm:text-lg text-left shadow-lg hover:shadow-2xl hover:brightness-110 active:scale-95 transition-all duration-200 flex items-center gap-4 min-h-[90px] border border-white/10 animate-slide-up cursor-pointer`}
                  style={{ animationDelay: `${idx * 80}ms` }}>
                  <div className="bg-white/20 rounded-xl p-3 shrink-0"><Store size={24} /></div>
                  <div>
                    <div className="leading-tight">{store.shortName || store.name}</div>
                    {store.InternalCode && <div className="text-[10px] font-normal text-white/60 mt-1">Cod: {store.InternalCode}</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedStore && !pinUser && (
          <div className="animate-fade-in flex-1">
            <button onClick={() => { setSelectedStore(null); setUsers([]); }}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-800 mb-6 text-sm font-medium transition-colors group">
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
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
                  <button key={user.id} onClick={() => handleUserSelect(user)} disabled={loading}
                    className="bg-white/95 backdrop-blur rounded-2xl p-3 sm:p-4 text-left flex items-center gap-3 min-h-[56px] shadow-md hover:shadow-xl hover:border-primary-400 active:scale-95 transition-all duration-200 border border-slate-200/50 animate-slide-up cursor-pointer disabled:opacity-50"
                    style={{ animationDelay: `${idx * 60}ms` }}>
                    <div className={`${AVATAR_COLORS[idx % AVATAR_COLORS.length]} w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
                      {getInitials(user.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 text-sm leading-tight truncate">{user.full_name}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{user.role?.name || 'Colaborador'}</div>
                    </div>
                    {user.pin_code && <KeyRound size={14} className="text-violet-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TELA PIN ── */}
        {pinUser && (
          <div className="animate-fade-in flex-1 flex flex-col items-center justify-center">
            <button onClick={() => { setPinUser(null); setPinValue(''); setPinError(false); }}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-800 mb-8 text-sm font-medium transition-colors group self-start">
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Voltar
            </button>

            <div className="text-center mb-8">
              <div className={`w-16 h-16 rounded-full ${AVATAR_COLORS[users.indexOf(pinUser) % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-xl mx-auto mb-3 shadow-lg`}>
                {getInitials(pinUser.full_name)}
              </div>
              <p className="font-bold text-slate-800 text-lg">{pinUser.full_name}</p>
              <p className="text-slate-400 text-sm mt-1 flex items-center gap-1 justify-center">
                <KeyRound size={14} /> Digite seu PIN
              </p>
            </div>

            {/* Indicadores de dígitos */}
            <div className="flex gap-4 mb-8">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                  pinError ? 'border-red-400 bg-red-400' :
                  i < pinValue.length ? 'border-primary-500 bg-primary-500' : 'border-slate-300 bg-transparent'
                }`} />
              ))}
            </div>
            {pinError && <p className="text-red-500 text-sm font-medium mb-4">PIN incorreto, tente novamente</p>}

            {/* Teclado numérico */}
            <div className="grid grid-cols-3 gap-3 w-64">
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, idx) => {
                if (key === '') return <div key={idx} />;
                if (key === '⌫') return (
                  <button key={idx} onClick={handlePinBackspace}
                    className="h-14 rounded-2xl bg-slate-200 text-slate-700 font-bold text-lg flex items-center justify-center active:scale-95 transition-all hover:bg-slate-300">
                    <Delete size={20} />
                  </button>
                );
                return (
                  <button key={idx} onClick={() => handlePinDigit(key)}
                    className="h-14 rounded-2xl bg-white shadow-md text-slate-800 font-bold text-xl active:scale-95 transition-all hover:bg-slate-50 border border-slate-100">
                    {key}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-auto pt-6 sm:pt-8 text-center pb-safe">
          <button onClick={() => navigate('/login')}
            className="text-slate-400 hover:text-slate-600 text-xs font-medium flex items-center gap-1.5 mx-auto px-4 py-3 rounded-lg hover:bg-slate-200 transition-colors min-h-[44px] cursor-pointer">
            <Lock size={12} /> Acesso Gerencial
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KIOSK ROUTE — Dashboard com proteção de sessão
// ═══════════════════════════════════════════════════════════════════════════════
function KioskRoute() {
  const navigate = useNavigate();
  const { orgSlug, groupSlug } = useParams();
  const stored      = sessionStorage.getItem('kiosk_user');
  const storedOrg   = sessionStorage.getItem('kiosk_org');
  const storedGroup = sessionStorage.getItem('kiosk_group') || null;

  const homeUrl = groupSlug ? `/${orgSlug}/${groupSlug}` : `/${orgSlug}`;

  if (!stored || storedOrg !== orgSlug) return <Navigate to={homeUrl} replace />;
  if (groupSlug && storedGroup !== groupSlug) return <Navigate to={homeUrl} replace />;

  const userData = JSON.parse(stored);
  return (
    <KioskArea
      user={userData}
      onLogout={() => {
        sessionStorage.removeItem('kiosk_user');
        sessionStorage.removeItem('kiosk_group');
        navigate(homeUrl);
      }}
    />
  );
}
