import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  Store, User, Settings, ListChecks, BarChart3, Layers, Briefcase, ArrowLeft, ChevronRight
} from "lucide-react";

import AdminStores from "./admin/AdminStores";
import AdminEmployees from "./admin/AdminEmployees";
import AdminTasks from "./admin/AdminTasks";
import AdminRoutines from "./admin/AdminRoutines";
import AdminReports from "./admin/AdminReports";

export default function AdminArea({ onExit }) {
  const [screen, setScreen] = useState('menu');
  const [lojas, setLojas] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    buscarDadosGlobais();
  }, []);

  async function buscarDadosGlobais() {
    setLoading(true);
    const { data: l } = await supabase.from("stores").select("*").order('name');
    const { data: r } = await supabase.from("roles").select("*").order('access_level');
    setLojas(l || []);
    setRoles(r || []);
    setLoading(false);
  }

  const goBack = () => setScreen('menu');

  const screenLabels = {
    lojas: 'Lojas',
    colaboradores: 'Equipe',
    cargos: 'Cargos',
    tarefas: 'Tarefas',
    rotinas: 'Rotinas',
    relatorios: 'Relatórios',
  };

  return (
    <div className="p-3 sm:p-5 md:p-8 text-slate-800 bg-slate-100 min-h-screen font-sans pb-safe">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between gap-3 mb-6 sm:mb-8 border-b border-slate-300 pb-4">
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
          <button onClick={onExit} className="text-slate-400 hover:text-slate-700 font-semibold text-sm sm:text-base min-h-[44px] flex items-center gap-2 group transition-colors"><ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform sm:hidden" />← Sair</button>
        </div>

        {/* MENU PRINCIPAL (RESTAUROU O BOTÃO DE CARGOS) */}
        {screen === 'menu' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6 animate-fade-in">
            <button onClick={() => setScreen('lojas')} className="bg-white p-5 sm:p-8 rounded-xl hover:bg-blue-50 border border-slate-200 hover:border-blue-300 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-sm hover:shadow-lg cursor-pointer duration-200 min-h-[100px] text-slate-700 hover:text-blue-600">
              <Store size={32} className="sm:w-10 sm:h-10" /> <span className="font-bold text-sm sm:text-base">Lojas</span>
            </button>
            <button onClick={() => setScreen('colaboradores')} className="bg-white p-5 sm:p-8 rounded-xl hover:bg-green-50 border border-slate-200 hover:border-green-300 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-sm hover:shadow-lg cursor-pointer duration-200 min-h-[100px] text-slate-700 hover:text-green-600">
              <User size={32} className="sm:w-10 sm:h-10" /> <span className="font-bold text-sm sm:text-base">Equipe</span>
            </button>

            {/* CARD DE CARGOS (RESTAURADO) */}
            <button onClick={() => setScreen('cargos')} className="bg-white p-5 sm:p-8 rounded-xl hover:bg-amber-50 border border-slate-200 hover:border-amber-300 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-sm hover:shadow-lg cursor-pointer duration-200 min-h-[100px] text-slate-700 hover:text-amber-600">
              <Briefcase size={32} className="sm:w-10 sm:h-10" /> <span className="font-bold text-sm sm:text-base">Cargos</span>
            </button>

            <button onClick={() => setScreen('tarefas')} className="bg-white p-5 sm:p-8 rounded-xl hover:bg-purple-50 border border-slate-200 hover:border-purple-300 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-sm hover:shadow-lg cursor-pointer duration-200 min-h-[100px] text-slate-700 hover:text-purple-600">
              <ListChecks size={32} className="sm:w-10 sm:h-10" /> <span className="font-bold text-sm sm:text-base">Tarefas</span>
            </button>
            <button onClick={() => setScreen('rotinas')} className="bg-white p-5 sm:p-8 rounded-xl hover:bg-amber-50 border border-slate-200 hover:border-amber-300 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-sm hover:shadow-lg cursor-pointer duration-200 min-h-[100px] text-slate-700 hover:text-amber-600">
              <Layers size={32} className="sm:w-10 sm:h-10" /> <span className="font-bold text-sm sm:text-base">Rotinas</span>
            </button>
            <button onClick={() => setScreen('relatorios')} className="bg-white p-5 sm:p-8 rounded-xl hover:bg-teal-50 border border-slate-200 hover:border-teal-300 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-sm hover:shadow-lg cursor-pointer duration-200 min-h-[100px] text-slate-700 hover:text-teal-600">
              <BarChart3 size={32} className="sm:w-10 sm:h-10" /> <span className="font-bold text-sm sm:text-base">Relatórios</span>
            </button>
          </div>
        )}

        {screen === 'lojas' && <AdminStores goBack={goBack} lojas={lojas} onUpdate={buscarDadosGlobais} />}

        {/* LÓGICA: Se clicou em Cargos, abre AdminEmployees na aba 'cargos'. Se Equipe, abre na aba 'colaboradores' */}
        {screen === 'colaboradores' && <AdminEmployees goBack={goBack} lojas={lojas} roles={roles} onUpdate={buscarDadosGlobais} initialTab="colaboradores" />}
        {screen === 'cargos' && <AdminEmployees goBack={goBack} lojas={lojas} roles={roles} onUpdate={buscarDadosGlobais} initialTab="cargos" />}

        {screen === 'tarefas' && <AdminTasks goBack={goBack} lojas={lojas} roles={roles} />}
        {screen === 'rotinas' && <AdminRoutines goBack={goBack} lojas={lojas} />}
        {screen === 'relatorios' && <AdminReports goBack={goBack} lojas={lojas} />}

      </div>
    </div>
  );
}