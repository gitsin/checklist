import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { 
  Store, User, ArrowLeft, CheckCircle, Clock, XCircle, Settings, 
  ClipboardCheck, AlertTriangle, RefreshCcw, MessageSquare, Camera, UploadCloud 
} from "lucide-react";
import ManagerArea from "./components/ManagerArea";
import AdminArea from "./components/AdminArea";

export default function App() {
  // --- ESTADOS DE NAVEGAÇÃO E DADOS ---
  const [view, setView] = useState('kiosk'); // 'kiosk', 'admin', 'manager'
  const [lojas, setLojas] = useState([]);
  const [lojaAtual, setLojaAtual] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isGestor, setIsGestor] = useState(false);

  // --- ESTADOS DE CONTAGEM ---
  const [contagemLojas, setContagemLojas] = useState({});
  const [contagemCargos, setContagemCargos] = useState({});

  // --- ESTADOS DE MODAIS E AÇÕES ---
  const [modalAdiarOpen, setModalAdiarOpen] = useState(false);
  const [modalCancelarOpen, setModalCancelarOpen] = useState(false);
  const [modalFotoOpen, setModalFotoOpen] = useState(false); // Novo Modal de Foto
  
  const [tarefaParaAcao, setTarefaParaAcao] = useState(null); // Tarefa sendo manipulada (adiar/cancelar/foto)
  const [novaDataPrazo, setNovaDataPrazo] = useState("");
  const [justificativa, setJustificativa] = useState("");
  
  // --- ESTADOS DE FOTO ---
  const [arquivoFoto, setArquivoFoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  // --- INICIALIZAÇÃO ---
  useEffect(() => {
    buscarLojas();
    atualizarContadoresGerais();
  }, []);

  async function buscarLojas() {
    const { data } = await supabase.from("stores").select("*").order('name');
    setLojas(data || []);
  }

  async function atualizarContadoresGerais() {
    const { data } = await supabase.rpc('get_store_pending_counts');
    if (data) {
      const mapa = {};
      data.forEach(item => { mapa[item.store_id] = item.total });
      setContagemLojas(mapa);
    }
  }

  // --- NAVEGAÇÃO ---
  async function selecionarLoja(loja) {
    setLoading(true); setLojaAtual(loja);
    const { data } = await supabase.from("employee").select("*").eq("store_id", loja.id).eq("active", true);
    setFuncionarios(data || []);
    const { data: counts } = await supabase.rpc('get_role_pending_counts', { target_store_id: loja.id });
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

  // --- LÓGICA DE TAREFAS ---
  async function buscarTarefasDoDia(storeId, roleId) {
    setLoading(true);
    const hoje = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from("checklist_items")
      .select(`*, template:task_templates!inner ( title, description, requires_photo_evidence )`)
      .eq("store_id", storeId).eq("scheduled_date", hoje).eq("template.role_id", roleId);
    
    const ordens = { 'RETURNED': 1, 'PENDING': 2, 'WAITING_APPROVAL': 3, 'POSTPONED': 4, 'COMPLETED': 5, 'CANCELED': 6 };
    setTarefas((data || []).sort((a, b) => (ordens[a.status] || 99) - (ordens[b.status] || 99)));
    setLoading(false);
  }

  // 1. O clique inicial no botão "Concluir"
  function handleConcluirClick(tarefa) {
    // Se exige foto e ainda não tem (ou está pendente/devolvida), abre modal
    if (tarefa.template.requires_photo_evidence && (tarefa.status === 'PENDING' || tarefa.status === 'RETURNED')) {
      setTarefaParaAcao(tarefa);
      setArquivoFoto(null);
      setPreviewUrl(null);
      setModalFotoOpen(true);
    } else {
      // Se não exige foto, conclui direto
      executarConclusao(tarefa, null);
    }
  }

  // 2. Processa a foto e faz o upload (Se necessário)
  async function confirmarFotoEConcluir() {
    if (!arquivoFoto) return alert("Por favor, tire uma foto para comprovar a tarefa.");
    setUploading(true);

    try {
      const fileExt = arquivoFoto.name.split('.').pop();
      // Nome único: lojaID_tarefaID_timestamp.ext
      const fileName = `${lojaAtual.id}_${tarefaParaAcao.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('task-evidence').upload(fileName, arquivoFoto);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('task-evidence').getPublicUrl(fileName);
      
      // Chama a conclusão passando a URL da foto
      await executarConclusao(tarefaParaAcao, urlData.publicUrl);
      setModalFotoOpen(false);
    
    } catch (error) {
      alert("Erro ao enviar foto: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  // 3. Executa a atualização no Banco de Dados
  async function executarConclusao(tarefa, fotoUrl) {
    let novoStatus = (tarefa.status === 'PENDING' || tarefa.status === 'RETURNED') 
      ? (usuarioAtual.manager_id ? 'WAITING_APPROVAL' : 'COMPLETED') 
      : 'PENDING';

    const updateData = {
      status: novoStatus,
      completed_by_employee_id: novoStatus !== 'PENDING' ? usuarioAtual.id : null,
      completed_at: new Date().toISOString()
    };

    // Se tiver foto, adiciona ao update
    if (fotoUrl) updateData.evidence_image_url = fotoUrl;

    await supabase.from("checklist_items").update(updateData).eq("id", tarefa.id);
    buscarTarefasDoDia(lojaAtual.id, usuarioAtual.role_id);
    atualizarContadoresGerais();
  }

  // --- PREPARAÇÃO DE ARQUIVO (INPUT CHANGE) ---
  function handleFileChange(e) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setArquivoFoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  // --- OUTRAS AÇÕES (ADIAR/CANCELAR) ---
  function abrirModalAdiar(tarefa) {
    setTarefaParaAcao(tarefa);
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    setNovaDataPrazo(localDate.toISOString().slice(0, 16));
    setModalAdiarOpen(true);
  }

  async function confirmarAdiamento() {
    if (!novaDataPrazo) return;
    await supabase.from("checklist_items").update({ status: 'POSTPONED', postponed_to: new Date(novaDataPrazo).toISOString() }).eq("id", tarefaParaAcao.id);
    setModalAdiarOpen(false); buscarTarefasDoDia(lojaAtual.id, usuarioAtual.role_id);
  }

  async function confirmarCancelamento() {
    if (!justificativa) return;
    await supabase.from("checklist_items").update({ status: 'CANCELED', cancellation_reason: justificativa }).eq("id", tarefaParaAcao.id);
    setModalCancelarOpen(false); buscarTarefasDoDia(lojaAtual.id, usuarioAtual.role_id);
  }

  // --- ROTEAMENTO ---
  if (view === 'admin') return <AdminArea onExit={() => setView('kiosk')} />;
  if (view === 'manager') return <ManagerArea usuarioAtual={usuarioAtual} lojaAtual={lojaAtual} onBack={() => setView('kiosk')} />;
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-8 px-4 font-sans text-slate-800">
      
      {/* TELA 1: LOJAS */}
      {!lojaAtual && (
        <div className="w-full max-w-4xl animate-fade-in">
            <button onClick={entrarNoAdmin} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2"><Settings /></button>
            <h1 className="text-3xl font-bold text-center mb-8">Selecione a Unidade</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">{lojas.map(l => (
                <button key={l.id} onClick={() => selecionarLoja(l)} className="relative bg-white p-8 rounded-2xl shadow-lg hover:scale-105 transition-all flex flex-col items-center gap-4 group">
                    {contagemLojas[l.id] > 0 && <div className="absolute -top-3 -right-3 bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-md border-4 border-slate-100 text-lg animate-bounce">{contagemLojas[l.id]}</div>}
                    <div className="p-4 bg-blue-50 rounded-full group-hover:bg-blue-100"><Store size={48} className="text-blue-600" /></div>
                    <span className="text-2xl font-bold text-slate-700">{l.name}</span>
                </button>
            ))}</div>
        </div>
      )}

      {/* TELA 2: COLABORADORES */}
      {lojaAtual && !usuarioAtual && (
        <div className="w-full max-w-5xl animate-fade-in">
            <button onClick={voltarParaLojas} className="mb-6 flex gap-2 text-slate-500 font-bold hover:text-blue-600"><ArrowLeft /> Trocar de Unidade</button>
            <h2 className="text-3xl font-bold text-center mb-10">Quem é você?</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">{funcionarios.filter(f => f.active).map(f => {
                const qtd = contagemCargos[f.role_id] || 0;
                return (
                    <button key={f.id} onClick={() => selecionarUsuario(f)} className="relative bg-white p-6 rounded-3xl shadow-md flex flex-col items-center gap-4 hover:shadow-xl hover:-translate-y-2 transition-all group border border-slate-100">
                        {qtd > 0 && <div className="absolute -top-3 -right-3 bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-md border-4 border-slate-100 text-lg z-10">{qtd}</div>}
                        <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                            {f.avatar_url ? <img src={f.avatar_url} className="w-full h-full rounded-full object-cover"/> : <User size={40} className="text-slate-400 group-hover:text-blue-400"/>}
                        </div>
                        <span className="font-bold text-lg text-center leading-tight text-slate-700">{f.full_name}</span>
                        <span className="text-xs font-bold text-slate-400 uppercase">{f.roles?.name}</span>
                    </button>
                )
            })}</div>
        </div>
      )}

      {/* TELA 3: LISTA DE TAREFAS */}
      {usuarioAtual && (
        <div className="w-full max-w-3xl animate-fade-in">
            <div className="bg-blue-600 text-white p-6 rounded-t-3xl shadow-lg flex justify-between items-center sticky top-0 z-10">
                <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center font-bold text-xl">{usuarioAtual.full_name[0]}</div>
                    <div><h2 className="text-xl font-bold">{usuarioAtual.full_name}</h2><p className="text-sm text-blue-200">{lojaAtual.name}</p></div>
                </div>
                <div className="flex gap-2">
                    {isGestor && <button onClick={() => setView('manager')} className="bg-amber-400 text-amber-900 px-4 py-2 rounded-lg font-bold flex gap-2 items-center hover:bg-amber-300"><ClipboardCheck size={18}/> Equipe</button>}
                    <button onClick={voltarParaFuncionarios} className="bg-white/10 px-4 py-2 rounded-lg text-sm hover:bg-white/20">Sair</button>
                </div>
            </div>
            
            <div className="bg-white p-4 rounded-b-3xl shadow-lg min-h-[500px]">
                {loading ? <div className="text-center py-20 text-slate-400">Carregando...</div> : tarefas.length === 0 ? 
                    <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200 m-4"><CheckCircle className="mx-auto text-slate-300 mb-2" size={48} /><p className="text-slate-500 font-medium text-lg">Tudo limpo por hoje!</p></div> : 
                    (<div className="space-y-4">
                        {tarefas.map(t => {
                            const isCompleted = t.status === 'COMPLETED';
                            const isWaiting = t.status === 'WAITING_APPROVAL';
                            const isReturned = t.status === 'RETURNED';
                            let cardClass = "border-slate-100 bg-white";
                            if (isCompleted) cardClass = "border-green-200 bg-green-50 opacity-75";
                            if (isWaiting) cardClass = "border-blue-200 bg-blue-50 opacity-90";
                            if (isReturned) cardClass = "border-orange-300 bg-orange-50 shadow-md";

                            return (
                                <div key={t.id} className={`p-4 rounded-xl border-2 transition-all ${cardClass}`}>
                                    <div className="mb-3">
                                        <h4 className={`font-bold text-lg flex items-center gap-2 ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                            {isReturned && <AlertTriangle className="text-orange-600" size={20} />}
                                            {/* ÍCONE DE CÂMERA SE EXIGIR FOTO */}
                                            {t.template.requires_photo_evidence && !isCompleted && <Camera size={20} className="text-purple-600" />}
                                            {t.template.title}
                                            {isWaiting && <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-1 rounded-full uppercase font-black">Em Revisão</span>}
                                            {isReturned && <span className="bg-orange-100 text-orange-800 text-[10px] px-2 py-1 rounded-full uppercase font-black border border-orange-200">Devolvida</span>}
                                        </h4>
                                        <p className="text-sm text-slate-500 mt-1">{t.template.description}</p>
                                        {isReturned && t.manager_notes && (<div className="mt-3 p-3 bg-orange-100 border border-orange-200 rounded-lg text-sm text-orange-900 italic flex gap-2"><MessageSquare size={16}/><span><strong>Feedback:</strong> {t.manager_notes}</span></div>)}
                                    </div>
                                    
                                    {!isCompleted && !isWaiting && (
                                        <div className="flex flex-col gap-3 mt-4">
                                            <button onClick={() => handleConcluirClick(t)} className={`w-full py-4 rounded-xl font-bold flex justify-center items-center gap-2 text-lg transition-all active:scale-95 shadow-sm ${isReturned ? 'bg-orange-500 text-white shadow-orange-200' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                                                {/* MUDA O ÍCONE E TEXTO SE PRECISAR DE FOTO */}
                                                {t.template.requires_photo_evidence ? <Camera size={20}/> : (isReturned ? <RefreshCcw size={20}/> : <CheckCircle size={20}/>)} 
                                                {isReturned ? 'Reenviar' : t.template.requires_photo_evidence ? 'Tirar Foto e Concluir' : 'Concluir Tarefa'}
                                            </button>
                                            <div className="flex gap-3">
                                                <button onClick={() => abrirModalAdiar(t)} className="flex-1 bg-slate-100 py-3 rounded-xl text-slate-600 font-semibold hover:bg-amber-100 hover:text-amber-700 flex items-center justify-center gap-2"><Clock size={18}/> Fazer depois</button>
                                                <button onClick={() => {setTarefaParaAcao(t); setModalCancelarOpen(true)}} className="flex-1 bg-slate-100 py-3 rounded-xl text-slate-600 font-semibold hover:bg-red-100 hover:text-red-700 flex items-center justify-center gap-2"><XCircle size={18}/> Cancelar Tarefa</button>
                                            </div>
                                        </div>
                                    )}
                                    {isWaiting && <div className="text-xs text-blue-600 font-bold italic flex gap-1 items-center mt-2 bg-blue-50 p-2 rounded-lg justify-center"><Clock size={14}/> Aguardando aprovação do seu gestor...</div>}
                                </div>
                            )
                        })}
                    </div>)
                }
            </div>
        </div>
      )}

      {/* MODAL ADIAR */}
      {modalAdiarOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                <h3 className="font-bold text-xl mb-4 text-slate-800">Adiar para quando?</h3>
                <input type="datetime-local" className="w-full border-2 p-3 rounded-xl mb-6 text-lg outline-none focus:border-amber-500" value={novaDataPrazo} onChange={e => setNovaDataPrazo(e.target.value)} />
                <div className="flex gap-3">
                    <button onClick={() => setModalAdiarOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                    <button onClick={confirmarAdiamento} className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold shadow-lg">Confirmar</button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL CANCELAR */}
      {modalCancelarOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                <h3 className="font-bold text-xl mb-4 text-red-600">Cancelar Tarefa</h3>
                <textarea className="w-full border-2 p-3 rounded-xl mb-6 min-h-[100px] outline-none focus:border-red-500" placeholder="Motivo..." onChange={e => setJustificativa(e.target.value)} />
                <div className="flex gap-3">
                    <button onClick={() => setModalCancelarOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Voltar</button>
                    <button onClick={confirmarCancelamento} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold shadow-lg">Confirmar</button>
                </div>
            </div>
        </div>
      )}

      {/* NOVO MODAL: CÂMERA/FOTO */}
      {modalFotoOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className="bg-white p-6 rounded-3xl w-full max-w-md shadow-2xl">
                <h3 className="font-bold text-xl mb-2 text-slate-800 flex items-center gap-2"><Camera className="text-purple-600"/> Evidência Fotográfica</h3>
                <p className="text-slate-500 text-sm mb-6">Esta tarefa exige uma foto para ser concluída.</p>
                
                {/* ÁREA DE PREVIEW DA FOTO */}
                <div className="mb-6 w-full h-64 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative">
                    {previewUrl ? (
                        <img src={previewUrl} className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-center text-slate-400">
                            <Camera size={48} className="mx-auto mb-2 opacity-30"/>
                            <p className="text-xs">Nenhuma foto capturada</p>
                        </div>
                    )}
                    
                    {/* INPUT INVISÍVEL COBRINDO A ÁREA (OU BOTÃO DEDICADO) */}
                    <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" // FORÇA ABRIR CÂMERA TRASEIRA NO MOBILE
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                </div>

                <div className="flex flex-col gap-3">
                    {/* BOTÃO FAKE PARA O USUÁRIO SABER ONDE CLICAR */}
                    <button className="w-full py-3 bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2 pointer-events-none">
                        <Camera size={20}/> {previewUrl ? "Tirar Outra Foto" : "Tirar Foto"}
                    </button>

                    <div className="flex gap-3 mt-2">
                        <button onClick={() => setModalFotoOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl" disabled={uploading}>Cancelar</button>
                        <button 
                            onClick={confirmarFotoEConcluir} 
                            disabled={!previewUrl || uploading}
                            className={`flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg ${!previewUrl || uploading ? 'bg-slate-300' : 'bg-purple-600 hover:bg-purple-700'}`}
                        >
                            {uploading ? "Enviando..." : <><UploadCloud size={20}/> Enviar e Concluir</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}