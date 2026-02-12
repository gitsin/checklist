import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  Store, User, Settings, ListChecks, BarChart3, Layers, Briefcase
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

  return (
    <div className="p-3 sm:p-5 md:p-8 text-white bg-slate-800 min-h-screen font-sans pb-safe">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between gap-3 mb-6 sm:mb-8 border-b border-slate-700 pb-4">
          <h1 className="text-2xl sm:text-3xl font-bold flex gap-2 items-center"><Settings size={24} /> Administração</h1>
          <button onClick={onExit} className="text-slate-400 hover:text-white underline text-sm sm:text-base min-h-[44px] flex items-center">← Sair</button>
        </div>

        {/* MENU PRINCIPAL (RESTAUROU O BOTÃO DE CARGOS) */}
        {screen === 'menu' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6 animate-fade-in">
            <button onClick={() => setScreen('lojas')} className="bg-slate-700 p-5 sm:p-8 rounded-xl hover:bg-blue-600 border border-slate-600 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-lg hover:scale-105 transform duration-200 min-h-[100px]">
              <Store size={32} className="sm:w-10 sm:h-10" /> <span className="font-bold text-sm sm:text-base">Lojas</span>
            </button>
            <button onClick={() => setScreen('colaboradores')} className="bg-slate-700 p-5 sm:p-8 rounded-xl hover:bg-blue-600 border border-slate-600 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-lg hover:scale-105 transform duration-200 min-h-[100px]">
              <User size={32} className="sm:w-10 sm:h-10" /> <span className="font-bold text-sm sm:text-base">Equipe</span>
            </button>

            {/* CARD DE CARGOS (RESTAURADO) */}
            <button onClick={() => setScreen('cargos')} className="bg-slate-700 p-5 sm:p-8 rounded-xl hover:bg-blue-600 border border-slate-600 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-lg hover:scale-105 transform duration-200 min-h-[100px]">
              <Briefcase size={32} className="sm:w-10 sm:h-10" /> <span className="font-bold text-sm sm:text-base">Cargos</span>
            </button>

            <button onClick={() => setScreen('tarefas')} className="bg-slate-700 p-5 sm:p-8 rounded-xl hover:bg-purple-600 border border-slate-600 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-lg hover:scale-105 transform duration-200 min-h-[100px]">
              <ListChecks size={32} className="sm:w-10 sm:h-10" /> <span className="font-bold text-sm sm:text-base">Tarefas</span>
            </button>
            <button onClick={() => setScreen('rotinas')} className="bg-slate-700 p-5 sm:p-8 rounded-xl hover:bg-amber-600 border border-slate-600 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-lg hover:scale-105 transform duration-200 min-h-[100px]">
              <Layers size={32} className="sm:w-10 sm:h-10" /> <span className="font-bold text-sm sm:text-base">Rotinas</span>
            </button>
            <button onClick={() => setScreen('relatorios')} className="bg-slate-700 p-5 sm:p-8 rounded-xl hover:bg-teal-600 border border-slate-600 flex flex-col items-center gap-2 sm:gap-4 transition-all shadow-lg hover:scale-105 transform duration-200 min-h-[100px]">
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