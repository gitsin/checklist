import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { ArrowLeft, ClipboardCheck, CheckCircle, RefreshCcw, Camera, X } from "lucide-react";

export default function ManagerArea({ usuarioAtual, lojaAtual, onBack }) {
  // --- ESTADOS ---
  const [tarefasParaRevisar, setTarefasParaRevisar] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estado para Devolução
  const [modalDevolverOpen, setModalDevolverOpen] = useState(false);
  const [tarefaParaDevolver, setTarefaParaDevolver] = useState(null);
  const [feedbackGestor, setFeedbackGestor] = useState("");

  // NOVO: Estado para Visualização de Foto
  const [fotoParaVisualizar, setFotoParaVisualizar] = useState(null);

  // --- EFEITOS ---
  useEffect(() => {
    buscarTarefasParaRevisar();
  }, []);

  // --- FUNÇÕES DE BUSCA ---
  async function buscarTarefasParaRevisar() {
    setLoading(true);
    const hoje = new Date().toISOString().split('T')[0];
    
    // Busca subordinados diretos
    const { data: subs } = await supabase.from('employee').select('id').eq('manager_id', usuarioAtual.id);
    const idsSubs = subs?.map(s => s.id) || [];

    if (idsSubs.length === 0) {
      setTarefasParaRevisar([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('checklist_items')
      .select(`*, template:task_templates!inner ( title, description ), employee:employee!completed_by_employee_id ( full_name )`)
      .in('completed_by_employee_id', idsSubs)
      .eq('status', 'WAITING_APPROVAL')
      .eq('scheduled_date', hoje);

    if (error) alert("Erro ao buscar tarefas: " + error.message);
    else setTarefasParaRevisar(data || []);
    setLoading(false);
  }

  // --- AÇÕES ---
  async function confirmarAprovacao(tarefa) {
    const { error } = await supabase.from('checklist_items').update({ 
      status: 'COMPLETED', 
      reviewed_at: new Date().toISOString(),
      reviewed_by_id: usuarioAtual.id
    }).eq('id', tarefa.id);
    
    if (error) alert(error.message);
    else buscarTarefasParaRevisar();
  }

  function abrirModalDevolver(tarefa) {
    setTarefaParaDevolver(tarefa);
    setFeedbackGestor("");
    setModalDevolverOpen(true);
  }

  async function confirmarDevolucao() {
    if (!feedbackGestor) return alert("Insira o motivo da devolução!");
    const { error } = await supabase.from('checklist_items').update({ 
      status: 'RETURNED', 
      manager_notes: feedbackGestor,
      reviewed_at: new Date().toISOString(),
      reviewed_by_id: usuarioAtual.id
    }).eq('id', tarefaParaDevolver.id);
    
    if (error) alert(error.message);
    else {
      setModalDevolverOpen(false);
      buscarTarefasParaRevisar();
    }
  }

  // --- RENDERIZAÇÃO ---
  return (
    <div className="w-full max-w-4xl animate-fade-in mx-auto mt-8 px-4">
      
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 font-black uppercase tracking-tighter hover:text-blue-600">
          <ArrowLeft /> Voltar ao Quiosque
        </button>
        <h2 className="text-3xl font-black flex items-center gap-3 text-slate-800">
          <ClipboardCheck className="text-amber-500" size={32}/> Revisão de Equipe
        </h2>
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border font-black text-blue-600 uppercase text-[10px] tracking-widest">
          {lojaAtual?.name}
        </div>
      </div>
      
      {/* LISTA DE TAREFAS */}
      <div className="bg-white rounded-3xl shadow-xl p-6 min-h-[500px]">
        {loading ? (
          <div className="text-center py-20 text-slate-400">Carregando tarefas para revisar...</div>
        ) : tarefasParaRevisar.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center gap-4 opacity-50">
            <CheckCircle size={60} className="text-green-500"/>
            <p className="text-xl font-bold">Nenhuma tarefa pendente de aprovação!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {tarefasParaRevisar.map(t => (
              <div key={t.id} className="p-6 rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-50">
                
                {/* INFO DA TAREFA */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Enviado por:</span>
                    <span className="font-bold text-slate-800 underline decoration-blue-200">{t.employee?.full_name}</span>
                  </div>
                  <h4 className="text-xl font-black text-slate-900 leading-tight">{t.template?.title}</h4>
                  <p className="text-slate-500 text-sm mt-1">{t.template?.description}</p>
                  
                  {/* NOVO: BOTÃO DE VER FOTO (SE HOUVER) */}
                  {t.evidence_image_url && (
                    <button 
                        onClick={() => setFotoParaVisualizar(t.evidence_image_url)}
                        className="mt-3 flex items-center gap-2 text-sm font-bold text-purple-600 bg-purple-50 px-3 py-2 rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors"
                    >
                        <Camera size={18} /> Ver Foto da Evidência
                    </button>
                  )}
                </div>

                {/* BOTÕES DE AÇÃO */}
                <div className="flex gap-3 w-full md:w-auto">
                  <button onClick={() => abrirModalDevolver(t)} className="flex-1 md:flex-none py-3 px-6 rounded-xl font-bold bg-white text-slate-600 hover:bg-orange-100 hover:text-orange-700 transition-all flex items-center justify-center gap-2 border border-slate-200 shadow-sm">
                    <RefreshCcw size={18}/> Devolver
                  </button>
                  <button onClick={() => confirmarAprovacao(t)} className="flex-1 md:flex-none py-3 px-6 rounded-xl font-black bg-green-600 text-white hover:bg-green-700 shadow-lg flex items-center justify-center gap-2 transition-all">
                    <CheckCircle size={18}/> Aprovar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DEVOLVER */}
      {modalDevolverOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
            <h3 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-2"><RefreshCcw className="text-orange-500"/> Devolver Tarefa</h3>
            <p className="text-slate-500 text-sm mb-6">Explique ao colaborador o motivo da devolução.</p>
            <textarea 
              className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl p-4 min-h-[150px] outline-none focus:border-orange-500 focus:bg-white transition-all text-slate-700 font-medium" 
              placeholder="Ex: O chão ainda está molhado..." 
              value={feedbackGestor} 
              onChange={(e) => setFeedbackGestor(e.target.value)} 
            />
            <div className="flex gap-4 mt-8">
              <button onClick={() => setModalDevolverOpen(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors">Cancelar</button>
              <button onClick={confirmarDevolucao} className="flex-1 py-4 bg-orange-500 text-white font-black rounded-2xl hover:bg-orange-600 shadow-lg transition-all">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* NOVO: MODAL VISUALIZAR FOTO */}
      {fotoParaVisualizar && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[60] backdrop-blur-sm animate-fade-in" onClick={() => setFotoParaVisualizar(null)}>
            <div className="relative max-w-4xl max-h-screen" onClick={(e) => e.stopPropagation()}>
                <button 
                    onClick={() => setFotoParaVisualizar(null)}
                    className="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors"
                >
                    <X size={32} />
                </button>
                <img 
                    src={fotoParaVisualizar} 
                    alt="Evidência" 
                    className="max-w-full max-h-[80vh] rounded-lg shadow-2xl border-4 border-white"
                />
                <div className="text-center mt-4">
                    <a 
                        href={fotoParaVisualizar} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-white underline text-sm hover:text-blue-300"
                    >
                        Abrir original em nova aba
                    </a>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}