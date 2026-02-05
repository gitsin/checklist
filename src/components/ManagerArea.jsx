import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { 
  ArrowLeft, ClipboardCheck, CheckCircle, RefreshCcw, Camera, X, 
  AlertCircle, Clock, CalendarClock, Users 
} from "lucide-react";

export default function ManagerArea({ usuarioAtual, lojaAtual, onBack }) {
  // --- ESTADOS ---
  const [abaAtiva, setAbaAtiva] = useState('revisao'); // 'revisao' ou 'atrasadas'
  
  const [tarefasRevisao, setTarefasRevisao] = useState([]);
  const [tarefasAtrasadas, setTarefasAtrasadas] = useState([]);
  const [mapaResponsaveis, setMapaResponsaveis] = useState({}); // Mapeia RoleID -> [Nomes]
  
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date()); 
  
  // Modais
  const [modalDevolverOpen, setModalDevolverOpen] = useState(false);
  const [tarefaParaDevolver, setTarefaParaDevolver] = useState(null);
  const [feedbackGestor, setFeedbackGestor] = useState("");
  const [fotoParaVisualizar, setFotoParaVisualizar] = useState(null);

  // --- EFEITOS ---
  useEffect(() => {
    buscarDadosGestao();
    const timer = setInterval(() => {
        setNow(new Date());
        buscarDadosGestao(); 
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // --- FUNÇÕES DE BUSCA ---
  async function buscarDadosGestao() {
    setLoading(true);
    const hoje = new Date().toISOString().split('T')[0];
    
    // 1. Busca subordinados E seus cargos para mapeamento
    const { data: subs } = await supabase
        .from('employee')
        .select('id, full_name, role_id')
        .eq('manager_id', usuarioAtual.id)
        .eq('active', true);
        
    const idsSubs = subs?.map(s => s.id) || [];

    // Cria mapa: RoleID -> "João, Maria"
    const mapa = {};
    subs?.forEach(s => {
        if (!mapa[s.role_id]) mapa[s.role_id] = [];
        mapa[s.role_id].push(s.full_name.split(' ')[0]); // Pega só o primeiro nome para economizar espaço
    });
    setMapaResponsaveis(mapa);

    if (idsSubs.length === 0) {
      setTarefasRevisao([]);
      setTarefasAtrasadas([]);
      setLoading(false);
      return;
    }

    // 2. Busca TUDO do dia
    // Importante: Trazemos role_id do template para saber quem cobrar no atraso
    const { data, error } = await supabase
      .from('checklist_items')
      .select(`
        *, 
        template:task_templates!inner ( title, description, due_time, role_id ), 
        employee:employee!completed_by_employee_id ( full_name )
      `) 
      .eq('store_id', lojaAtual.id)
      .eq('scheduled_date', hoje); 

    if (error) {
        alert("Erro: " + error.message);
        setLoading(false);
        return;
    }

    // 3. Processamento
    const listaRevisao = [];
    const listaAtrasadas = [];
    const horaAtualStr = new Date().toTimeString().slice(0, 5);

    data.forEach(item => {
        // REVISÃO: Status WAITING_APPROVAL
        if (item.status === 'WAITING_APPROVAL' && idsSubs.includes(item.completed_by_employee_id)) {
            listaRevisao.push(item);
        }

        // ATRASO: Status Pendente/Adiado/Devolvido
        const isPendente = ['PENDING', 'POSTPONED', 'RETURNED'].includes(item.status);
        
        const horaLimite = item.status === 'POSTPONED' && item.postponed_to 
            ? new Date(item.postponed_to).toTimeString().slice(0,5) 
            : item.template.due_time;

        // Se tem hora limite definida E hora atual já passou
        if (isPendente && horaLimite && horaAtualStr > horaLimite) {
            // Só adiciona se o cargo da tarefa pertencer a algum subordinado meu
            // (Para evitar ver tarefas de outros setores se a query trouxe tudo)
            if (mapa[item.template.role_id]) {
                listaAtrasadas.push({ ...item, horaLimiteEfetiva: horaLimite });
            }
        }
    });

    setTarefasRevisao(listaRevisao);
    setTarefasAtrasadas(listaAtrasadas);
    setLoading(false);
  }

  // --- AÇÕES ---
  async function confirmarAprovacao(tarefa) {
    const { error } = await supabase.from('checklist_items').update({ 
      status: 'COMPLETED', reviewed_at: new Date().toISOString(), reviewed_by_id: usuarioAtual.id
    }).eq('id', tarefa.id);
    if (error) alert(error.message); else buscarDadosGestao();
  }

  async function confirmarDevolucao() {
    if (!feedbackGestor) return alert("Insira o motivo!");
    const { error } = await supabase.from('checklist_items').update({ 
      status: 'RETURNED', manager_notes: feedbackGestor, reviewed_at: new Date().toISOString(), reviewed_by_id: usuarioAtual.id
    }).eq('id', tarefaParaDevolver.id);
    if (error) alert(error.message); else { setModalDevolverOpen(false); buscarDadosGestao(); }
  }

  // --- RENDERIZAÇÃO ---
  return (
    <div className="w-full max-w-5xl animate-fade-in mx-auto mt-4 px-2 md:px-4 font-sans text-slate-800 pb-20">
      
      {/* CABEÇALHO COMPACTO */}
      <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-slate-400 hover:text-blue-600"><ArrowLeft size={20}/></button>
            <h2 className="text-lg font-black flex items-center gap-2 text-slate-700"><ClipboardCheck className="text-blue-600" size={20}/> Gestão</h2>
        </div>
        <div className="bg-slate-100 px-3 py-1 rounded-lg font-bold text-blue-700 text-xs uppercase tracking-wider">{lojaAtual?.name}</div>
      </div>

      {/* ABAS (DASHBOARD) */}
      <div className="flex gap-3 mb-6">
          <button onClick={() => setAbaAtiva('revisao')} className={`flex-1 p-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 shadow-sm ${abaAtiva === 'revisao' ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-200' : 'border-slate-200 bg-white text-slate-400'}`}>
            <div className="flex items-center gap-1.5"><CheckCircle size={18}/><span className="font-bold text-xs uppercase">Revisão</span></div>
            <span className="text-2xl font-black">{tarefasRevisao.length}</span>
          </button>

          <button onClick={() => setAbaAtiva('atrasadas')} className={`flex-1 p-3 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 shadow-sm ${abaAtiva === 'atrasadas' ? 'border-red-500 bg-red-50 text-red-800 ring-2 ring-red-200' : 'border-slate-200 bg-white text-slate-400'}`}>
            <div className="flex items-center gap-1.5"><AlertCircle size={18}/><span className="font-bold text-xs uppercase">Atrasadas</span></div>
            <span className={`text-2xl font-black ${tarefasAtrasadas.length > 0 ? 'text-red-600 animate-pulse' : ''}`}>{tarefasAtrasadas.length}</span>
          </button>
      </div>
      
      {/* LISTA COMPACTA */}
      <div className="space-y-3">
        {loading && <div className="text-center py-10 text-slate-400 text-sm">Carregando dados...</div>}
        
        {!loading && abaAtiva === 'revisao' && (
            tarefasRevisao.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center gap-2 opacity-40">
                    <CheckCircle size={40} className="text-green-500"/>
                    <p className="font-bold text-sm">Tudo revisado!</p>
                </div>
            ) : (
                tarefasRevisao.map(t => (
                    <div key={t.id} className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm flex flex-col gap-2 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <div className="pl-3 flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-slate-800 truncate">{t.template?.title}</h4>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Feito por:</span>
                                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-1.5 rounded">{t.employee?.full_name}</span>
                                </div>
                            </div>
                            {t.evidence_image_url && (
                                <button onClick={() => setFotoParaVisualizar(t.evidence_image_url)} className="ml-2 text-purple-600 bg-purple-50 p-1.5 rounded-lg hover:bg-purple-100">
                                    <Camera size={16} />
                                </button>
                            )}
                        </div>
                        <div className="pl-3 flex gap-2 mt-1">
                            <button onClick={() => {setTarefaParaDevolver(t); setFeedbackGestor(""); setModalDevolverOpen(true)}} className="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200">Devolver</button>
                            <button onClick={() => confirmarAprovacao(t)} className="flex-1 py-1.5 rounded-lg bg-green-600 text-xs font-bold text-white hover:bg-green-700 shadow-sm">Aprovar</button>
                        </div>
                    </div>
                ))
            )
        )}

        {!loading && abaAtiva === 'atrasadas' && (
            tarefasAtrasadas.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center gap-2 opacity-40">
                    <Clock size={40} className="text-slate-400"/>
                    <p className="font-bold text-sm">Sem atrasos.</p>
                </div>
            ) : (
                tarefasAtrasadas.map(t => {
                    const responsaveis = mapaResponsaveis[t.template.role_id] || ['N/A'];
                    return (
                        <div key={t.id} className="bg-white p-3 rounded-xl border border-red-100 shadow-sm flex flex-col gap-2 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                            
                            <div className="pl-3 flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm text-slate-800 truncate">{t.template?.title}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        {/* TAG DE HORÁRIO */}
                                        <span className="flex items-center gap-1 bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded font-black uppercase">
                                            {t.status === 'POSTPONED' ? <CalendarClock size={10}/> : <Clock size={10}/>} 
                                            {t.horaLimiteEfetiva}
                                        </span>
                                        {/* TAG DE STATUS */}
                                        {t.status === 'POSTPONED' && <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1 rounded border border-purple-100">ADIADA</span>}
                                        {t.status === 'RETURNED' && <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1 rounded border border-orange-100">DEVOLVIDA</span>}
                                    </div>
                                </div>
                            </div>

                            {/* QUEM ESTÁ DEVENDO? */}
                            <div className="pl-3 bg-slate-50 p-2 rounded-lg flex items-start gap-2">
                                <Users size={14} className="text-slate-400 mt-0.5"/>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">Responsáveis:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {responsaveis.map((nome, idx) => (
                                            <span key={idx} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">
                                                {nome}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })
            )
        )}
      </div>

      {/* MODAL DEVOLVER (MANTIDO) */}
      {modalDevolverOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-lg text-slate-900 mb-2">Devolver Tarefa</h3>
            <textarea className="w-full border p-3 rounded-xl mb-4 h-24 text-sm" placeholder="Motivo da devolução..." value={feedbackGestor} onChange={(e) => setFeedbackGestor(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={() => setModalDevolverOpen(false)} className="flex-1 py-2.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl text-sm">Cancelar</button>
              <button onClick={confirmarDevolucao} className="flex-1 py-2.5 bg-orange-500 text-white font-bold rounded-xl shadow-md text-sm">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOTO (MANTIDO) */}
      {fotoParaVisualizar && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[60] backdrop-blur-sm animate-fade-in" onClick={() => setFotoParaVisualizar(null)}>
            <div className="relative max-w-full max-h-screen" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setFotoParaVisualizar(null)} className="absolute -top-10 right-0 text-white"><X size={24} /></button>
                <img src={fotoParaVisualizar} className="max-w-full max-h-[80vh] rounded-lg border-2 border-white"/>
            </div>
        </div>
      )}
    </div>
  );
}