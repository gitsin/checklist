import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import {
  Store, User, Settings, ListChecks, BarChart3, Layers, Briefcase, ChevronRight, LogOut, Building2, FolderTree
} from "lucide-react";

import AdminStores from "./admin/AdminStores";
import AdminEmployees from "./admin/AdminEmployees";
import AdminTasks from "./admin/AdminTasks";
import AdminRoutines from "./admin/AdminRoutines";
import AdminReports from "./admin/AdminReports";
import AdminChecklistReport from "./admin/AdminChecklistReport";
import AdminOrganizations from "./admin/AdminOrganizations";
import AdminGroups from "./admin/AdminGroups";

export default function AdminArea() {
  const navigate = useNavigate();
  const { adminUser, orgId, isSuperAdmin, isHoldingOwner, signOut, orgName } = useAuth();

  const [screen, setScreen] = useState('menu');
  const [lojas, setLojas] = useState([]);
  const [roles, setRoles] = useState([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    buscarDadosGlobais();
  }, [orgId]);

  async function buscarDadosGlobais() {
    setLoading(true);

    let qLojas = supabase.from("stores").select("*").order('name');
    let qRoles = supabase.from("roles").select("*").order('name');

    if (orgId) {
      qLojas = qLojas.eq('organization_id', orgId);
      qRoles = qRoles.eq('organization_id', orgId);
    }

    const { data: l } = await qLojas;
    const { data: r } = await qRoles;
    setLojas(l || []);
    setRoles(r || []);
    setLoading(false);
  }

  const goBack = () => setScreen('menu');

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  const screenLabels = {
    lojas: 'Lojas',
    colaboradores: 'Equipe',
    cargos: 'Cargos',
    tarefas: 'Tarefas',
    rotinas: 'Rotinas',
    checklists: 'Checklists',
    relatorios: 'Painel BI',
    organizacoes: 'Organizações',
    grupos: 'Grupos',
  };

  return (
    <div className="p-3 sm:p-5 md:p-8 text-slate-800 bg-slate-100 min-h-screen font-sans pb-safe">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between gap-3 mb-6 sm:mb-8 border-b border-slate-300 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 flex-wrap">
              <Settings size={24} className="shrink-0" />
              <span>Administração</span>
              {screen !== 'menu' && (
                <>
                  <ChevronRight size={20} className="text-slate-300 shrink-0" />
                  <span className="text-primary-500">{screenLabels[screen]}</span>
                </>
              )}
            </h1>
            {orgName && (
              <p className="text-xs text-slate-400 mt-1 ml-8">
                {adminUser?.full_name} • {orgName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSignOut} className="text-slate-400 hover:text-slate-700 font-semibold text-sm sm:text-base min-h-[44px] flex items-center gap-2 group transition-colors cursor-pointer">
              <LogOut size={18} /> Sair
            </button>
          </div>
        </div>

        {/* MENU PRINCIPAL */}
        {screen === 'menu' && (
          <div className="animate-fade-in">
            {/* Cards de gestao da plataforma (super admin / holding owner) */}
            {(isSuperAdmin || isHoldingOwner) && (
              <div className="mb-6">
                <h2 className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-wide">Plataforma</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
                  {isSuperAdmin && (
                    <button onClick={() => setScreen('organizacoes')} className="bg-white p-5 sm:p-8 rounded-xl hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-sm hover:shadow-lg cursor-pointer duration-200 min-h-[100px] text-slate-700 hover:text-indigo-600">
                      <Building2 size={32} className="sm:w-10 sm:h-10" /> <span className="font-bold text-sm sm:text-base">Organizações</span>
                    </button>
                  )}
                  <button onClick={() => setScreen('grupos')} className="bg-white p-5 sm:p-8 rounded-xl hover:bg-violet-50 border border-slate-200 hover:border-violet-300 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-sm hover:shadow-lg cursor-pointer duration-200 min-h-[100px] text-slate-700 hover:text-violet-600">
                    <FolderTree size={32} className="sm:w-10 sm:h-10" /> <span className="font-bold text-sm sm:text-base">Grupos</span>
                  </button>
                </div>
              </div>
            )}

            <h2 className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-wide">Operação</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
              <button onClick={() => setScreen('lojas')} className="bg-white p-5 sm:p-8 rounded-xl hover:bg-blue-50 border border-slate-200 hover:border-blue-300 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-sm hover:shadow-lg cursor-pointer duration-200 min-h-[100px] text-slate-700 hover:text-blue-600">
                <Store size={32} className="sm:w-10 sm:h-10" /> <span className="font-bold text-sm sm:text-base">Lojas</span>
              </button>
              <button onClick={() => setScreen('colaboradores')} className="bg-white p-5 sm:p-8 rounded-xl hover:bg-green-50 border border-slate-200 hover:border-green-300 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-sm hover:shadow-lg cursor-pointer duration-200 min-h-[100px] text-slate-700 hover:text-green-600">
                <User size={32} className="sm:w-10 sm:h-10" /> <span className="font-bold text-sm sm:text-base">Equipe</span>
              </button>
              <button onClick={() => setScreen('cargos')} className="bg-white p-5 sm:p-8 rounded-xl hover:bg-amber-50 border border-slate-200 hover:border-amber-300 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-sm hover:shadow-lg cursor-pointer duration-200 min-h-[100px] text-slate-700 hover:text-amber-600">
                <Briefcase size={32} className="sm:w-10 sm:h-10" /> <span className="font-bold text-sm sm:text-base">Cargos</span>
              </button>
              <button onClick={() => setScreen('tarefas')} className="bg-white p-5 sm:p-8 rounded-xl hover:bg-purple-50 border border-slate-200 hover:border-purple-300 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-sm hover:shadow-lg cursor-pointer duration-200 min-h-[100px] text-slate-700 hover:text-purple-600">
                <ListChecks size={32} className="sm:w-10 sm:h-10" /> <span className="font-bold text-sm sm:text-base">Tarefas</span>
              </button>
              <button onClick={() => setScreen('rotinas')} className="bg-white p-5 sm:p-8 rounded-xl hover:bg-amber-50 border border-slate-200 hover:border-amber-300 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-sm hover:shadow-lg cursor-pointer duration-200 min-h-[100px] text-slate-700 hover:text-amber-600">
                <Layers size={32} className="sm:w-10 sm:h-10" /> <span className="font-bold text-sm sm:text-base">Rotinas</span>
              </button>
              <button onClick={() => setScreen('checklists')} className="bg-white p-5 sm:p-8 rounded-xl hover:bg-blue-50 border border-slate-200 hover:border-blue-300 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-sm hover:shadow-lg cursor-pointer duration-200 min-h-[100px] text-slate-700 hover:text-blue-600">
                <ListChecks size={32} className="sm:w-10 sm:h-10" /> <span className="font-bold text-sm sm:text-base">Checklists</span>
              </button>
              <button onClick={() => setScreen('relatorios')} className="bg-white p-5 sm:p-8 rounded-xl hover:bg-teal-50 border border-slate-200 hover:border-teal-300 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-sm hover:shadow-lg cursor-pointer duration-200 min-h-[100px] text-slate-700 hover:text-teal-600">
                <BarChart3 size={32} className="sm:w-10 sm:h-10" /> <span className="font-bold text-sm sm:text-base">Painel BI</span>
              </button>
            </div>
          </div>
        )}

        {screen === 'organizacoes' && isSuperAdmin && <AdminOrganizations goBack={goBack} />}
        {screen === 'grupos' && <AdminGroups goBack={goBack} orgId={orgId} isSuperAdmin={isSuperAdmin} />}

        {screen === 'lojas' && <AdminStores goBack={goBack} lojas={lojas} onUpdate={buscarDadosGlobais} orgId={orgId} />}
        {screen === 'colaboradores' && <AdminEmployees goBack={goBack} lojas={lojas} roles={roles} onUpdate={buscarDadosGlobais} initialTab="colaboradores" orgId={orgId} />}
        {screen === 'cargos' && <AdminEmployees goBack={goBack} lojas={lojas} roles={roles} onUpdate={buscarDadosGlobais} initialTab="cargos" orgId={orgId} />}
        {screen === 'tarefas' && <AdminTasks goBack={goBack} lojas={lojas} roles={roles} orgId={orgId} />}
        {screen === 'rotinas' && <AdminRoutines goBack={goBack} lojas={lojas} orgId={orgId} />}
        {screen === 'checklists' && <AdminChecklistReport goBack={goBack} lojas={lojas} allRoles={roles} />}
        {screen === 'relatorios' && <AdminReports goBack={goBack} lojas={lojas} />}

      </div>
    </div>
  );
}
