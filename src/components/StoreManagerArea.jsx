import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabaseClient";
import {
  Store, LogOut, CheckSquare, Users, BarChart2, ChevronRight,
  ClipboardList, ArrowLeft, User, ListChecks, Layers,
} from "lucide-react";
import KioskArea from "./KioskArea";
import AdminReports from "./admin/AdminReports";
import AdminChecklistReport from "./admin/AdminChecklistReport";
import AdminTasks from "./admin/AdminTasks";
import AdminRoutines from "./admin/AdminRoutines";

const AVATAR_COLORS = [
  "bg-blue-500","bg-emerald-500","bg-violet-500","bg-amber-500",
  "bg-rose-500","bg-cyan-500","bg-indigo-500","bg-teal-500",
];
function getInitials(name) {
  if (!name) return "?";
  const p = name.trim().split(" ");
  return p.length > 1 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0][0].toUpperCase();
}

export default function StoreManagerArea() {
  const { userProfile, signOut, storeId } = useAuth();
  const navigate = useNavigate();
  const [activeScreen, setActiveScreen] = useState(null);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    async function loadRoles() {
      if (!userProfile?.organization_id) return;
      const { data } = await supabase.from("roles").select("*")
        .eq("organization_id", userProfile.organization_id).order("name");
      setRoles(data || []);
    }
    loadRoles();
  }, [userProfile?.organization_id]);

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  const storeName = userProfile?.store?.shortName || userProfile?.store?.name || "Minha Loja";
  const lojas = userProfile?.store
    ? [{ id: userProfile.store.id, name: userProfile.store.name, shortName: userProfile.store.shortName, active: true }]
    : [];

  // Monta o user no formato que KioskArea espera
  const kioskUser = userProfile ? {
    id:              userProfile.id,
    full_name:       userProfile.full_name,
    store_id:        userProfile.store_id,
    organization_id: userProfile.organization_id,
    role_id:         userProfile.role_id,
    store_name:      storeName,
    role_name:       userProfile.role?.name,
  } : null;

  // ── Tela ativa ───────────────────────────────────────────────────────────
  if (activeScreen === "tasks" && kioskUser) {
    return <KioskArea user={kioskUser} onLogout={() => setActiveScreen(null)} />;
  }

  if (activeScreen === "team") {
    return <EquipeScreen storeId={storeId} onBack={() => setActiveScreen(null)} storeName={storeName} />;
  }

  if (activeScreen === "bi") {
    return (
      <div className="min-h-screen bg-slate-100 font-sans p-3 sm:p-5 md:p-8 pb-safe">
        <div className="max-w-6xl mx-auto">
          <AdminReports goBack={() => setActiveScreen(null)} lojas={lojas} />
        </div>
      </div>
    );
  }

  if (activeScreen === "checklist") {
    return (
      <div className="min-h-screen bg-slate-100 font-sans p-3 sm:p-5 md:p-8 pb-safe">
        <div className="max-w-6xl mx-auto">
          <AdminChecklistReport
            goBack={() => setActiveScreen(null)}
            lojas={lojas}
            allRoles={roles}
          />
        </div>
      </div>
    );
  }

  if (activeScreen === "admin-tarefas") {
    return (
      <div className="min-h-screen bg-slate-100 font-sans p-3 sm:p-5 md:p-8 pb-safe">
        <div className="max-w-6xl mx-auto">
          <AdminTasks
            goBack={() => setActiveScreen(null)}
            lojas={lojas}
            roles={roles}
            orgId={userProfile?.organization_id}
          />
        </div>
      </div>
    );
  }

  if (activeScreen === "admin-rotinas") {
    return (
      <div className="min-h-screen bg-slate-100 font-sans p-3 sm:p-5 md:p-8 pb-safe">
        <div className="max-w-6xl mx-auto">
          <AdminRoutines
            goBack={() => setActiveScreen(null)}
            lojas={lojas}
            orgId={userProfile?.organization_id}
          />
        </div>
      </div>
    );
  }

  // ── Hub principal ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary-50 rounded-xl p-2">
              <Store size={20} className="text-primary-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Gerente</p>
              <p className="font-bold text-slate-800 leading-tight">{storeName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-slate-400 hover:text-red-500 text-sm font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer min-h-[44px]"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">
            Olá, {userProfile?.full_name?.split(" ")[0] || "Gerente"} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">O que você precisa gerenciar hoje?</p>
        </div>

        <div className="flex flex-col gap-4">

          {/* Tarefas — card primário */}
          <button
            onClick={() => setActiveScreen("tasks")}
            className="bg-white rounded-2xl p-5 text-left flex items-center gap-4 shadow-sm border border-slate-200 hover:shadow-md hover:border-primary-200 active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="bg-gradient-to-br from-primary-500 to-emerald-600 p-3 rounded-xl shrink-0">
              <CheckSquare size={22} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800">Tarefas & Aprovações</p>
              <p className="text-sm text-slate-400 mt-0.5">Acompanhe e aprove as tarefas da sua loja</p>
            </div>
            <ChevronRight size={18} className="text-slate-300 shrink-0" />
          </button>

          {/* Equipe */}
          <button
            onClick={() => setActiveScreen("team")}
            className="bg-white rounded-2xl p-5 text-left flex items-center gap-4 shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-200 active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shrink-0">
              <Users size={22} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800">Equipe</p>
              <p className="text-sm text-slate-400 mt-0.5">Visualize os colaboradores da sua loja</p>
            </div>
            <ChevronRight size={18} className="text-slate-300 shrink-0" />
          </button>

          {/* Configuração — Tarefas e Rotinas */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setActiveScreen("admin-tarefas")}
              className="bg-white rounded-2xl p-4 text-left flex flex-col gap-3 shadow-sm border border-slate-200 hover:shadow-md hover:border-teal-200 active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-2.5 rounded-xl w-fit">
                <ListChecks size={20} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">Config. Tarefas</p>
                <p className="text-xs text-slate-400 mt-0.5">Criar e editar tarefas</p>
              </div>
            </button>

            <button
              onClick={() => setActiveScreen("admin-rotinas")}
              className="bg-white rounded-2xl p-4 text-left flex flex-col gap-3 shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-200 active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-2.5 rounded-xl w-fit">
                <Layers size={20} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">Config. Rotinas</p>
                <p className="text-xs text-slate-400 mt-0.5">Criar e editar rotinas</p>
              </div>
            </button>
          </div>

          {/* BI + Checklist — 2 cards lado a lado */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setActiveScreen("bi")}
              className="bg-white rounded-2xl p-4 text-left flex flex-col gap-3 shadow-sm border border-slate-200 hover:shadow-md hover:border-violet-200 active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 rounded-xl w-fit">
                <BarChart2 size={20} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">BI</p>
                <p className="text-xs text-slate-400 mt-0.5">Métricas e performance</p>
              </div>
            </button>

            <button
              onClick={() => setActiveScreen("checklist")}
              className="bg-white rounded-2xl p-4 text-left flex flex-col gap-3 shadow-sm border border-slate-200 hover:shadow-md hover:border-amber-200 active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-2.5 rounded-xl w-fit">
                <ClipboardList size={20} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">Checklist</p>
                <p className="text-xs text-slate-400 mt-0.5">Resumo mensal</p>
              </div>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Tela Equipe ──────────────────────────────────────────────────────────────
function EquipeScreen({ storeId, onBack, storeName }) {
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("user_profiles")
        .select("id, full_name, role:roles(name), user_type, active")
        .eq("store_id", storeId)
        .in("user_type", ["colaborador", "store_manager"])
        .eq("active", true)
        .order("full_name");
      setColaboradores(data || []);
      setLoading(false);
    }
    if (storeId) load();
  }, [storeId]);

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer min-h-[44px] flex items-center gap-1"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-xl">
            <Users size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-800 leading-tight">Equipe</p>
            <p className="text-xs text-slate-400">{storeName}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : colaboradores.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <User size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium">Nenhum colaborador ativo</p>
          </div>
        ) : (
          <>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              {colaboradores.length} colaborador{colaboradores.length !== 1 ? "es" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {colaboradores.map((c, idx) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-slate-200"
                >
                  <div className={`${AVATAR_COLORS[idx % AVATAR_COLORS.length]} w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                    {getInitials(c.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm leading-tight truncate">{c.full_name}</p>
                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mt-0.5">
                      {c.role?.name || (c.user_type === "store_manager" ? "Gerente" : "Colaborador")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
