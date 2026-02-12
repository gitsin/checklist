import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import {
  BookOpen, Info, Shield, LogOut, Store, User, ArrowRight, ArrowLeft, Lock, X
} from "lucide-react";

// Importação dos Módulos
import AdminArea from "./components/AdminArea";
import UserManual from "./components/UserManual";
import KioskArea from "./components/KioskArea";

export default function App() {
  const navigate = useNavigate();

  // --- ESTADOS GERAIS ---
  const [loading, setLoading] = useState(false);

  // --- DADOS PARA LOGIN (HOME) ---
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);

  // --- DADOS DO USUÁRIO LOGADO ---
  const [currentUserData, setCurrentUserData] = useState(null);

  // --- CARGA INICIAL ---
  useEffect(() => {
    fetchStores();
  }, []);

  async function fetchStores() {
    const { data } = await supabase.from('stores').select('*').eq('active', true).order('name');
    setStores(data || []);
  }

  async function handleSelectStore(store) {
    setSelectedStore(store);
    const { data } = await supabase.from('employee').select('*, roles(name)').eq('store_id', store.id).eq('active', true).order('full_name');
    setUsers(data || []);
  }

  // --- LOGIN DIRETO (recebe o user clicado) ---
  function handleLogin(user) {
    setLoading(true);
    const userData = {
      ...user,
      store_name: selectedStore.name,
      role_name: user.roles?.name
    };
    setCurrentUserData(userData);
    setLoading(false);
    navigate('/kiosk');
  }

  // Sair do kiosk -> volta para seleção de funcionário (mantém loja)
  const handleLogout = () => {
    setCurrentUserData(null);
    navigate('/');
  };

  // Sair totalmente -> volta para seleção de loja
  const handleFullLogout = () => {
    setCurrentUserData(null);
    setSelectedStore(null);
    setUsers([]);
    navigate('/');
  };

  return (
    <Routes>
      <Route path="/" element={
        <Home
          stores={stores}
          users={users}
          selectedStore={selectedStore}
          loading={loading}
          handleSelectStore={handleSelectStore}
          handleLogin={handleLogin}
          navigate={navigate}
          onBack={() => { setSelectedStore(null); setUsers([]); }}
        />
      } />

      <Route path="/admin" element={<AdminArea onExit={() => navigate('/')} />} />
      <Route path="/manual" element={<UserManual onExit={() => navigate('/')} />} />

      <Route
        path="/kiosk"
        element={
          currentUserData ? (
            <KioskArea user={currentUserData} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  );
}

// =============================================================================
// CONSTANTES
// =============================================================================
const ADMIN_PASSWORD = "1234";

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
function Home({ stores, users, selectedStore, loading, handleSelectStore, handleLogin, navigate, onBack }) {
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const [pwdError, setPwdError] = useState(false);

  function tryAdminLogin() {
    if (adminPwd === ADMIN_PASSWORD) {
      setShowAdminModal(false);
      setAdminPwd("");
      setPwdError(false);
      navigate('/admin');
    } else {
      setPwdError(true);
      setTimeout(() => setPwdError(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans">

      {/* ---- BARRA TOPO ---- */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-slate-200 px-4 py-2 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-blue-500" />
            <span className="text-xs text-slate-500"><strong className="text-blue-600">Beta</strong> — Relate erros ao gerente</span>
          </div>
          <button
            onClick={() => navigate('/manual')}
            className="flex items-center gap-1 text-slate-500 hover:text-blue-600 text-xs font-medium px-2 py-1 rounded hover:bg-slate-200 transition-colors"
          >
            <BookOpen size={12} /> Manual
          </button>
        </div>
      </div>

      {/* ---- CONTEÚDO PRINCIPAL ---- */}
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-8 flex flex-col min-h-[90vh] pb-safe">

        {/* LOGO */}
        <div className="text-center mb-6 sm:mb-10 animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight mb-1">Niilu</h1>
          <p className="text-slate-400 text-xs sm:text-sm font-medium tracking-widest uppercase">Gestão de Rotinas</p>
        </div>

        {/* ====== ETAPA 1: SELEÇÃO DE LOJA ====== */}
        {!selectedStore && (
          <div className="animate-fade-in flex-1">
            <h2 className="text-xl font-bold text-slate-700 mb-6 flex items-center gap-2">
              <Store size={22} className="text-blue-500" /> Selecione sua Loja
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {stores.map((store, idx) => (
                <button
                  key={store.id}
                  onClick={() => handleSelectStore(store)}
                  className={`
                    bg-gradient-to-br ${STORE_COLORS[idx % STORE_COLORS.length]}
                    p-4 sm:p-6 rounded-2xl text-white font-bold text-base sm:text-lg text-left
                    shadow-lg hover:shadow-2xl hover:scale-[1.03]
                    active:scale-95 transition-all duration-200
                    flex items-center gap-4 min-h-[90px]
                    border border-white/10
                    animate-slide-up
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

        {/* ====== ETAPA 2: SELEÇÃO DE FUNCIONÁRIO ====== */}
        {selectedStore && (
          <div className="animate-fade-in flex-1">
            {/* Breadcrumb / Voltar */}
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-800 mb-6 text-sm font-medium transition-colors group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-slate-500">›</span>
              <span className="text-blue-600 font-bold">{selectedStore.shortName || selectedStore.name}</span>
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
                      shadow-md hover:shadow-xl hover:scale-[1.03]
                      active:scale-95 transition-all duration-200
                      border border-slate-200/50
                      animate-slide-up
                      disabled:opacity-50
                    `}
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    {/* Avatar com iniciais */}
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

        {/* ---- BOTÃO ADMIN (RODAPÉ) ---- */}
        <div className="mt-auto pt-6 sm:pt-8 text-center pb-safe">
          <button
            onClick={() => { setShowAdminModal(true); setAdminPwd(""); setPwdError(false); }}
            className="text-slate-400 hover:text-slate-600 text-xs font-medium flex items-center gap-1.5 mx-auto px-4 py-3 rounded-lg hover:bg-slate-200 transition-colors min-h-[44px]"
          >
            <Lock size={12} /> Acesso Admin
          </button>
        </div>
      </div>

      {/* ====== MODAL SENHA ADMIN ====== */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fade-in" onClick={() => setShowAdminModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 w-full sm:max-w-xs shadow-2xl pb-safe" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Shield size={20} className="text-blue-600" /> Área Admin
              </h3>
              <button onClick={() => setShowAdminModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Senha de Acesso</label>
            <input
              type="password"
              autoFocus
              className={`w-full border-2 p-4 rounded-xl text-center text-2xl font-mono tracking-[0.5em] focus:outline-none transition-colors ${pwdError
                ? 'border-red-400 bg-red-50 text-red-600 animate-[shake_0.3s_ease-in-out]'
                : 'border-slate-200 focus:border-blue-500 text-slate-800'
                }`}
              value={adminPwd}
              onChange={e => setAdminPwd(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && tryAdminLogin()}
              maxLength={10}
              placeholder="••••"
            />

            {pwdError && (
              <p className="text-red-500 text-xs font-bold mt-2 text-center animate-fade-in">Senha incorreta</p>
            )}

            <button
              onClick={tryAdminLogin}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mt-4 hover:bg-blue-700 active:scale-95 transition-all shadow-lg min-h-[48px]"
            >
              Entrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}