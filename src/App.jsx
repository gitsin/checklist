import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { 
  Store, User, ArrowLeft, CheckCircle, Clock, XCircle, Settings, 
  ClipboardCheck, AlertTriangle, RefreshCcw, MessageSquare, Camera, UploadCloud, CalendarClock, AlertCircle 
} from "lucide-react";
import ManagerArea from "./components/ManagerArea";
import AdminArea from "./components/AdminArea";

export default function App() {
  const [view, setView] = useState('kiosk');
  const [lojas, setLojas] = useState([]);
  const [lojaAtual, setLojaAtual] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isGestor, setIsGestor] = useState(false);
  
  const [now, setNow] = useState(new Date());
  const [contagemLojas, setContagemLojas] = useState({});
  const [contagemCargos, setContagemCargos] = useState({});

  const [modalAdiarOpen, setModalAdiarOpen] = useState(false);
  const [modalCancelarOpen, setModalCancelarOpen] = useState(false);
  const [modalFotoOpen, setModalFotoOpen] = useState(false);
  
  const [tarefaParaAcao, setTarefaParaAcao] = useState(null);
  const [novaDataPrazo, setNovaDataPrazo] = useState("");
  const [justificativa, setJustificativa] = useState("");
  
  const [arquivoFoto, setArquivoFoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const mapaDiasSemana = {
    1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb", 7: "Dom"
  };

  useEffect(() => {
    buscarLojas();
    atualizarContadoresGerais();
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  function getDataLocal() {
    return new Date().toLocaleDateString('en-CA');
  }

  async function buscarLojas() {
    const { data } = await supabase.from("stores").select("*").eq("active", true).order('name');
    setLojas(data || []);
  }

  async function atualizarContadoresGerais() {
    // CORREÇÃO: Passa a data local para a função SQL
    const { data } = await supabase.rpc('get_store_pending_counts', { filter_date: getDataLocal() });
    if (data) {
      const mapa = {};
      data.forEach(item => { mapa[item.store_id] = item.total });
      setContagemLojas(mapa);
    }
  }

  async function selecionarLoja(loja) {
    setLoading(true); setLojaAtual(loja);
    const { data } = await supabase.from("employee").select("*").eq("store_id", loja.id).eq("active", true);
    setFuncionarios(data || []);
    
    // CORREÇÃO: Passa a data local para a função SQL
    const { data: counts } = await supabase.rpc('get_role_pending_counts', { 
        target_store_id: loja.id,
        filter_date: getDataLocal()
    });
    
    if (counts) { const mapa = {}; counts.forEach(item => { mapa[item.role_id] = item.total }); setContagemCargos(mapa); }
    setLoading(false);
  }

  async function selecionarUsuario(funcionario) {
    setUsuarioAtual(funcionario);
    const { count } = await supabase.from('employee').select('*', { count: 'exact', head: true }).eq('manager_id', funcionario.id);
    setIsGestor(count > 0);
    buscarTarefasDoDia(lojaAtual.id, funcionario.role_id);
  }

  function voltarParaLojas() {
    setLojaAtual(null); setFuncionarios([]); setUsuarioAtual(null); setView('kiosk'); atualizarContadoresGerais();
  }

  function voltarParaFuncionarios() {
    setUsuarioAtual(null); setTarefas([]); setView('kiosk'); selecionarLoja(lojaAtual);
  }

  function entrarNoAdmin() {
    if (prompt("Senha:") === "1234") setView('admin'); else alert("Senha incorreta");
  }

  async function buscarTarefasDoDia(storeId, roleId) {
    setLoading(true);
    const hoje = getDataLocal();
    const { data } = await supabase.from("checklist_items")
      .select(`*, template:task_templates!inner ( title, description, requires_photo_evidence, frequency_type, specific_day_of_week, specific_day_of_month, due_time )`)
      .eq("store_id", storeId)
      .eq("scheduled_date", hoje) 
      .eq("template.role_id", roleId);
    
    const ordensStatus = { 'RETURNED': 1, 'PENDING': 2, 'POSTPONED': 2, 'WAITING_APPROVAL': 3, 'COMPLETED': 5, 'CANCELED': 6 };
    
    const tarefasOrdenadas = (data || []).sort((a, b) => {
        const sA = ordensStatus[a.status] || 99;
        const sB = ordensStatus[b.status] || 99;
        if (sA !== sB) return sA - sB;
        
        const getEffectiveTime = (item) => {
            if (item.status === 'POSTPONED' && item.postponed_to) return new Date(item.postponed_to).toTimeString().slice(0,5); 
            return item.template.due_time || "23:59";
        }
        return getEffectiveTime(a).localeCompare(getEffectiveTime(b));
    });
    
    setTarefas(tarefasOrdenadas);
    setLoading(false);
  }

  function verificarAtraso(tarefa) {
    if (['COMPLETED', 'WAITING_APPROVAL', 'RETURNED', 'CANCELED'].includes(tarefa.status)) return false;

    if (tarefa.status === 'POSTPONED' && tarefa.postponed_to) {
        return now > new Date(tarefa.postponed_to);
    }

    const hojeStr = getDataLocal();
    const tarefaData = tarefa.scheduled_date;

    if (tarefaData < hojeStr) return true; 
    if (tarefaData > hojeStr) return false; 

    const dueTimeStr = tarefa.template.due_time || "23:59";
    const currentTimeStr = now.toTimeString().slice(0, 5);
    
    return currentTimeStr > dueTimeStr;
  }

  function handleConcluirClick(tarefa) {
    if (tarefa.template.requires_photo_evidence && (tarefa.status === 'PENDING' || tarefa.status === 'RETURNED' || tarefa.status === 'POSTPONED')) {
      setTarefaParaAcao(tarefa);
      setArquivoFoto(null);
      setPreviewUrl(null);
      setModalFotoOpen(true);
    } else {
      executarConclusao(tarefa, null);
    }
  }

  async function confirmarFotoEConcluir() {
    if (!arquivoFoto) return alert("Por favor, tire uma foto.");
    setUploading(true);
    try {
      const fileExt = arquivoFoto.name.split('.').pop();
      const fileName = `${lojaAtual.id}_${tarefaParaAcao.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('task-evidence').upload(fileName, arquivoFoto);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('task-evidence').getPublicUrl(fileName);
      await executarConclusao(tarefaParaAcao, urlData.publicUrl);
      setModalFotoOpen(false);
    } catch (error) {
      alert("Erro: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function executarConclusao(tarefa, fotoUrl) {
    let novoStatus = (tarefa.status === 'PENDING' || tarefa.status === 'RETURNED' || tarefa.status === 'POSTPONED') 
      ? (usuarioAtual.manager_id ? 'WAITING_APPROVAL' : 'COMPLETED') 
      : 'PENDING';

    const updateData = {
      status: novoStatus,
      completed_by_employee_id: novoStatus !== 'PENDING' ? usuarioAtual.id : null,
      completed_at: new Date().toISOString()
    };
    if (fotoUrl) updateData.evidence_image_url = fotoUrl;
    await supabase.from("checklist_items").update(updateData).eq("id", tarefa.id);
    buscarTarefasDoDia(lojaAtual.id, usuarioAtual.role_id);
    atualizarContadoresGerais();
  }

  function handleFileChange(e) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setArquivoFoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  function formatarDataAdiada(isoString) {
    if (!isoString) return "";
    const data = new Date(isoString);
    return `${data.getDate().toString().padStart(2,'0')}/${(data.getMonth()+1).toString().padStart(2,'0')} ${data.getHours().toString().padStart(2,'0')}:${data.getMinutes().toString().padStart(2,'0')}`;
  }

  function abrirModalAdiar(tarefa) {
    setTarefaParaAcao(tarefa);
    const now = new Date();
    setNovaDataPrazo(new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    setModalAdiarOpen(true);
  }

  async function confirmarAdiamento() {
    if (!novaDataPrazo) return;
    await supabase.from("checklist_items").update({ status: 'POSTPONED', postponed_to: new Date(novaDataPrazo).toISOString() }).eq("id", tarefaParaAcao.id);
    setModalAdiarOpen(false); 
    setTimeout(() => buscarTarefasDoDia(lojaAtual.id, usuarioAtual.role_id), 200);
  }

  async function confirmarCancelamento() {
    if (!justificativa) return;
    const novoStatus = usuarioAtual.manager_id ? 'WAITING_APPROVAL' : 'CANCELED';
    await supabase.from("checklist_items").update({ 
        status: novoStatus, 
        cancellation_reason: justificativa,
        completed_by_employee_id: usuarioAtual.id
    }).eq("id", tarefaParaAcao.id);
    setModalCancelarOpen(false); 
    buscarTarefasDoDia(lojaAtual.id, usuarioAtual.role_id);
  }

  if (view === 'admin') return <AdminArea onExit={() => setView('kiosk')} />;
  if (view === 'manager') return <ManagerArea usuarioAtual={usuarioAtual} lojaAtual={lojaAtual} onBack={() => setView('kiosk')} />;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-6 px-3 font-sans text-slate-800">
      
      {!lojaAtual && (
        <div className="w-full max-w-5xl animate-fade-in pt-4">
            <button onClick={entrarNoAdmin} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-3"><Settings size={24}/></button>
            <h1 className="text-2xl font-bold text-center mb-6 text-slate-700">Selecione a Unidade</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{lojas.map(l => (
                <button key={l.id} onClick={() => selecionarLoja(l)} className="relative bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:scale-[1.02] transition-all flex flex-col items-center gap-3 active:scale-95">
                    {contagemLojas[l.id] > 0 && <div className="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md border-2 border-white text-sm animate-bounce">{contagemLojas[l.id]}</div>}
                    <div className="p-3 bg-blue-50 rounded-full"><Store size={32} className="text-blue-600" /></div>
                    <span className="text-lg font-bold text-slate-700">{l.name}</span>
                </button>
            ))}</div>
        </div>
      )}

      {lojaAtual && !usuarioAtual && (
        <div className="w-full max-w-6xl animate-fade-in pt-4">
            <button onClick={voltarParaLojas} className="mb-4 flex gap-2 text-slate-500 font-bold hover:text-blue-600 items-center text-sm"><ArrowLeft size={18}/> Trocar de Unidade</button>
            <h2 className="text-2xl font-bold text-center mb-6 text-slate-700">Quem é você?</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{funcionarios.filter(f => f.active).map(f => {
                const qtd = contagemCargos[f.role_id] || 0;
                return (
                    <button key={f.id} onClick={() => selecionarUsuario(f)} className="relative bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center gap-3 active:scale-95">
                        {qtd > 0 && <div className="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md border-2 border-white text-sm z-10">{qtd}</div>}
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden">
                            {f.avatar_url ? <img src={f.avatar_url} className="w-full h-full object-cover"/> : <User size={28} className="text-slate-400"/>}
                        </div>
                        <div className="text-center">
                            <span className="font-bold text-sm block text-slate-700 leading-tight">{f.full_name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 block">{f.roles?.name}</span>
                        </div>
                    </button>
                )
            })}</div>
        </div>
      )}

      {usuarioAtual && (
        <div className="w-full max-w-lg animate-fade-in pb-24">
            <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg flex justify-between items-center mb-4 sticky top-2 z-20">
                <div className="flex gap-3 items-center overflow-hidden">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-lg">{usuarioAtual.full_name[0]}</div>
                    <div className="min-w-0">
                        <h2 className="text-base font-bold truncate">{usuarioAtual.full_name}</h2>
                        <p className="text-xs text-blue-100 truncate">{lojaAtual.name}</p>
                    </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    {isGestor && <button onClick={() => setView('manager')} className="bg-amber-400 text-amber-900 p-2 rounded-lg font-bold hover:bg-amber-300 active:scale-95"><ClipboardCheck size={20}/></button>}
                    <button onClick={voltarParaFuncionarios} className="bg-white/10 px-3 py-2 rounded-lg text-xs font-bold hover:bg-white/20 active:scale-95">Sair</button>
                </div>
            </div>
            
            <div className="space-y-3">
                {loading ? <div className="text-center py-10 text-slate-400">Carregando...</div> : tarefas.length === 0 ? 
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200"><CheckCircle className="mx-auto text-slate-300 mb-2" size={40} /><p className="text-slate-500 font-medium text-sm">Tudo limpo por hoje!</p></div> : 
                    (<>
                        {tarefas.map(t => {
                            const isCompleted = t.status === 'COMPLETED';
                            const isWaiting = t.status === 'WAITING_APPROVAL';
                            const isReturned = t.status === 'RETURNED';
                            const isCanceled = t.status === 'CANCELED';
                            const isPostponed = t.status === 'POSTPONED';
                            const isOverdue = verificarAtraso(t);

                            let cardClass = "border-slate-100 bg-white";
                            if (isCompleted) cardClass = "border-green-200 bg-green-50/50 opacity-75";
                            if (isCanceled) cardClass = "border-slate-200 bg-slate-100 opacity-60"; 
                            if (isWaiting) cardClass = "border-blue-200 bg-blue-50 opacity-90";
                            if (isReturned) cardClass = "border-orange-300 bg-orange-50 shadow-md";
                            if (isPostponed) cardClass = "border-purple-200 bg-purple-50 shadow-sm";
                            if (isOverdue) cardClass = "border-red-300 bg-red-50 shadow-md ring-1 ring-red-100";

                            return (
                                <div key={t.id} className={`p-3 rounded-2xl border-2 transition-all ${cardClass}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`font-bold text-base flex-1 mr-2 leading-tight flex items-center gap-2 ${isCompleted || isCanceled ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                            {isReturned && <AlertTriangle className="text-orange-600 flex-shrink-0" size={18} />}
                                            {isPostponed && <CalendarClock className="text-purple-600 flex-shrink-0" size={18} />}
                                            {isOverdue && <AlertCircle className="text-red-600 animate-pulse flex-shrink-0" size={18} />}
                                            {t.template.requires_photo_evidence && !isCompleted && !isCanceled && <Camera size={18} className="text-purple-600 flex-shrink-0" />}
                                            {t.template.title}
                                        </h4>
                                        <div className="flex flex-col items-end gap-1">
                                            {isCompleted && <span className="bg-green-100 text-green-800 text-[9px] px-2 py-0.5 rounded font-black border border-green-200 whitespace-nowrap">APROVADA</span>}
                                            {isCanceled && <span className="bg-slate-200 text-slate-600 text-[9px] px-2 py-0.5 rounded font-black border border-slate-300 whitespace-nowrap">CANCELADA</span>}
                                            {isWaiting && <span className="bg-blue-100 text-blue-800 text-[9px] px-2 py-0.5 rounded font-black whitespace-nowrap">EM REVISÃO</span>}
                                            {isReturned && <span className="bg-orange-100 text-orange-800 text-[9px] px-2 py-0.5 rounded font-black border border-orange-200 whitespace-nowrap">DEVOLVIDA</span>}
                                            {isPostponed && <span className="bg-purple-100 text-purple-800 text-[9px] px-2 py-0.5 rounded font-black border border-purple-200 whitespace-nowrap">ADIADA</span>}
                                            {isOverdue && <span className="bg-red-100 text-red-800 text-[9px] px-2 py-0.5 rounded font-black border border-red-200 flex items-center gap-1 whitespace-nowrap"><AlertCircle size={8}/> ATRASADA</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {isPostponed ? (
                                            <span className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.5 rounded border border-purple-200 font-bold flex items-center gap-1"><Clock size={10}/> {formatarDataAdiada(t.postponed_to)}</span>
                                        ) : (
                                            <>
                                                {t.template.frequency_type === 'daily' && <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase ${isOverdue ? 'bg-red-100 text-red-800 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>Diária • {t.template.due_time ? `Até ${t.template.due_time.slice(0,5)}` : 'Dia todo'}</span>}
                                                {t.template.frequency_type === 'weekly' && <span className="bg-orange-50 text-orange-700 text-[10px] px-1.5 py-0.5 rounded border border-orange-100 font-bold uppercase">{mapaDiasSemana[t.template.specific_day_of_week]}</span>}
                                                {t.template.frequency_type === 'monthly' && <span className="bg-pink-50 text-pink-700 text-[10px] px-1.5 py-0.5 rounded border border-pink-100 font-bold uppercase">Dia {t.template.specific_day_of_month}</span>}
                                            </>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mb-3 leading-relaxed">{t.template.description}</p>
                                    {isReturned && t.manager_notes && (<div className="mb-3 p-2 bg-orange-50 border border-orange-100 rounded text-xs text-orange-900 italic flex gap-2"><MessageSquare size={14}/><span>{t.manager_notes}</span></div>)}
                                    {!isCompleted && !isWaiting && !isCanceled && (
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => {setTarefaParaAcao(t); setModalCancelarOpen(true)}} className="p-3 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 active:scale-95 transition-colors border border-slate-200" title="Cancelar"><XCircle size={20}/></button>
                                            <button onClick={() => abrirModalAdiar(t)} className="p-3 rounded-xl bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-600 active:scale-95 transition-colors border border-slate-200" title="Adiar"><Clock size={20}/></button>
                                            <button onClick={() => handleConcluirClick(t)} className={`flex-1 py-3 px-4 rounded-xl font-bold flex justify-center items-center gap-2 text-sm text-white shadow-sm active:scale-95 transition-all ${isReturned ? 'bg-orange-500' : 'bg-slate-800'}`}>{t.template.requires_photo_evidence ? <Camera size={18}/> : (isReturned ? <RefreshCcw size={18}/> : <CheckCircle size={18}/>)} {isReturned ? 'Reenviar' : 'Concluir'}</button>
                                        </div>
                                    )}
                                    {isWaiting && <div className="text-xs text-blue-600 font-bold italic text-center mt-2 bg-blue-50 p-1.5 rounded">Aguardando aprovação...</div>}
                                </div>
                            )
                        })}
                    </>)
                }
            </div>
        </div>
      )}

      {modalAdiarOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="bg-white p-5 rounded-2xl w-full max-w-sm shadow-2xl relative">
                    <h3 className="font-bold text-lg mb-4 text-slate-800">Adiar para quando?</h3>
                    <input type="datetime-local" className="w-full border-2 p-3 rounded-xl mb-6 text-base outline-none focus:border-amber-500" value={novaDataPrazo} onChange={e => setNovaDataPrazo(e.target.value)} />
                    <div className="flex gap-3">
                        <button onClick={() => setModalAdiarOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl active:scale-95">Cancelar</button>
                        <button onClick={confirmarAdiamento} className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95">Confirmar</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {modalCancelarOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="bg-white p-5 rounded-2xl w-full max-w-sm shadow-2xl relative">
                    <h3 className="font-bold text-lg mb-4 text-red-600">Cancelar Tarefa</h3>
                    <p className="text-xs text-slate-500 mb-2">Informe o motivo para seu gestor:</p>
                    <textarea className="w-full border-2 p-3 rounded-xl mb-6 min-h-[100px] text-sm outline-none focus:border-red-500" placeholder="Motivo..." onChange={e => setJustificativa(e.target.value)} />
                    <div className="flex gap-3">
                        <button onClick={() => setModalCancelarOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl active:scale-95">Voltar</button>
                        <button onClick={confirmarCancelamento} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95">Confirmar</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {modalFotoOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto backdrop-blur-sm">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="bg-white p-5 rounded-3xl w-full max-w-md shadow-2xl relative">
                    <h3 className="font-bold text-lg mb-2 text-slate-800 flex items-center gap-2"><Camera className="text-purple-600"/> Evidência</h3>
                    <p className="text-slate-500 text-sm mb-4">Tire uma foto para comprovar.</p>
                    <div className="mb-4 w-full h-64 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative">
                        {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <div className="text-center text-slate-400"><Camera size={40} className="mx-auto mb-2 opacity-30"/><p className="text-xs">Toque para fotografar</p></div>}
                        <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer"/>
                    </div>
                    <div className="flex flex-col gap-3">
                        <button className="w-full py-3 bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2 pointer-events-none"><Camera size={20}/> {previewUrl ? "Tirar Outra" : "Tirar Foto"}</button>
                        <div className="flex gap-3 mt-1">
                            <button onClick={() => setModalFotoOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl active:scale-95" disabled={uploading}>Cancelar</button>
                            <button onClick={confirmarFotoEConcluir} disabled={!previewUrl || uploading} className={`flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg active:scale-95 ${!previewUrl || uploading ? 'bg-slate-300' : 'bg-purple-600 hover:bg-purple-700'}`}>{uploading ? "Enviando..." : <><UploadCloud size={20}/> Enviar</>}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}