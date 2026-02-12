import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  LogOut, Camera, X, CheckCircle, Clock,
  Calendar, AlertTriangle, AlertCircle, ArrowDownCircle,
  Hourglass, UserCheck, CornerUpLeft, MessageSquare
} from "lucide-react";

export default function KioskArea({ user, onLogout }) {
  // --- ESTADOS GERAIS ---
  const [tasks, setTasks] = useState([]);
  const [reviewTasks, setReviewTasks] = useState([]); // Tarefas específicas para revisão do gestor
  const [activeTab, setActiveTab] = useState('todo'); // 'todo', 'review', 'done'
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- ESTADOS DOS MODAIS ---
  const [modalCancelOpen, setModalCancelOpen] = useState(false);
  const [modalLaterOpen, setModalLaterOpen] = useState(false);
  const [modalReturnOpen, setModalReturnOpen] = useState(false); // Modal de Devolução (Gestor)

  const [taskToInteract, setTaskToInteract] = useState(null);
  const [interactionReason, setInteractionReason] = useState(""); // Usado para input de texto (Motivo/Hora)
  const [postponeDate, setPostponeDate] = useState(""); // Data para adiar tarefa

  // Relógio em tempo real (atualiza a cada minuto para verificar atrasos)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    fetchData(); // Carrega dados iniciais
    return () => clearInterval(timer);
  }, [activeTab]); // Recarrega se mudar de aba

  // Função para pegar data local correta (evita bug de fuso horário à noite)
  function getLocalDate() {
    const date = new Date();
    const offset = date.getTimezoneOffset();
    date.setMinutes(date.getMinutes() - offset);
    return date.toISOString().split('T')[0];
  }

  // Verifica se o usuário logado tem permissão de Gestor
  function isManager() {
    const role = user.role_name?.toLowerCase() || "";
    return role.includes("gerente") || role.includes("diretor") || role.includes("admin") || role.includes("gestão") || role.includes("lider");
  }

  // --- BUSCA DE DADOS ---
  async function fetchData() {
    setLoading(true);
    const today = getLocalDate();

    // 1. BUSCA TAREFAS DO PRÓPRIO USUÁRIO (Aba A Fazer e Finalizadas)
    const { data: myItems, error: err1 } = await supabase
      .from('checklist_items')
      .select(`
        *, 
        template:task_templates (
          title, description, frequency_type, due_time, requires_photo_evidence, role_id, role:roles (name)
        )
      `)
      .eq('store_id', user.store_id)
      .eq('scheduled_date', today);

    if (!err1 && myItems) {
      // Filtra tarefas: Mostra se for GERAL (role_id null) OU do cargo do usuário
      const filtered = myItems.filter(item => {
        if (!item.template) return false;
        return item.template.role_id === null || item.template.role_id === user.role_id;
      });

      // ORDENAÇÃO INTELIGENTE
      const sorted = filtered.sort((a, b) => {
        // Prioridade 1: Devolvidas (RETURNED) aparecem no topo
        if (a.status === 'RETURNED' && b.status !== 'RETURNED') return -1;
        if (a.status !== 'RETURNED' && b.status === 'RETURNED') return 1;

        // Prioridade 2: Aguardando Aprovação (WAITING_APPROVAL) vai para o fundo da lista "A Fazer"
        if (a.status === 'WAITING_APPROVAL' && b.status !== 'WAITING_APPROVAL') return 1;
        if (a.status !== 'WAITING_APPROVAL' && b.status === 'WAITING_APPROVAL') return -1;

        // Prioridade 3: Ordena por Horário Limite
        const timeA = a.template?.due_time || '23:59';
        const timeB = b.template?.due_time || '23:59';
        return timeA.localeCompare(timeB);
      });
      setTasks(sorted);
    }

    // 2. BUSCA TAREFAS PARA REVISÃO (Apenas se for Gestor)
    // Busca todas as tarefas da loja que estão 'WAITING_APPROVAL'
    if (isManager()) {
      const { data: reviewItems, error: err2 } = await supabase
        .from('checklist_items')
        .select(`
            *, 
            template:task_templates (title, description, requires_photo_evidence),
            worker:completed_by (full_name) 
        `)
        .eq('store_id', user.store_id)
        .eq('scheduled_date', today)
        .eq('status', 'WAITING_APPROVAL');

      if (!err2) setReviewTasks(reviewItems || []);
    }

    setLoading(false);
  }

  // --- AÇÕES DO OPERADOR ---

  async function handleComplete(taskId) {
    // Muda status para AGUARDANDO APROVAÇÃO
    const { error } = await supabase.from('checklist_items').update({
      status: 'WAITING_APPROVAL',
      completed_at: new Date().toISOString(),
      completed_by: user.id
    }).eq('id', taskId);

    if (error) alert("Erro ao concluir: " + error.message);
    else fetchData();
  }

  // Abre modal de cancelar
  function openCancelModal(item) {
    setTaskToInteract(item);
    setInteractionReason("");
    setModalCancelOpen(true);
  }

  // Confirma cancelamento
  async function confirmCancel() {
    if (!interactionReason.trim()) return alert("O motivo é obrigatório.");
    const { error } = await supabase.from('checklist_items').update({
      status: 'CANCELED', completed_at: new Date().toISOString(), completed_by: user.id, notes: interactionReason
    }).eq('id', taskToInteract.id);

    if (!error) { setModalCancelOpen(false); fetchData(); }
    else alert("Erro: " + error.message);
  }

  // Abre modal de adiar
  function openLaterModal(item) {
    setTaskToInteract(item);
    // Sugere hora atual + 1 hora
    const now = new Date();
    now.setMinutes(now.getMinutes() + 60);
    setInteractionReason(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    setPostponeDate(getLocalDate()); // Data padrão: hoje
    setModalLaterOpen(true);
  }

  // Confirma adiar
  async function confirmLater() {
    if (!interactionReason) return alert("Informe o horário.");
    if (!postponeDate) return alert("Informe a data.");
    // Formata a data para exibição (DD/MM/AAAA)
    const [year, month, day] = postponeDate.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    const { error } = await supabase.from('checklist_items').update({
      notes: `Adiado para ${formattedDate} às ${interactionReason}`
    }).eq('id', taskToInteract.id);

    if (!error) {
      // Atualiza localmente para feedback instantâneo
      fetchData();
      setModalLaterOpen(false);
    } else alert("Erro: " + error.message);
  }

  // --- AÇÕES DO GESTOR (REVISÃO) ---

  async function handleManagerApprove(taskId) {
    // Aprovar finaliza a tarefa como COMPLETED
    if (!confirm("Confirmar aprovação desta tarefa?")) return;
    const { error } = await supabase.from('checklist_items').update({
      status: 'COMPLETED'
    }).eq('id', taskId);

    if (!error) fetchData();
    else alert("Erro: " + error.message);
  }

  function openReturnModal(item) {
    setTaskToInteract(item);
    setInteractionReason("");
    setModalReturnOpen(true);
  }

  async function confirmReturn() {
    if (!interactionReason.trim()) return alert("Escreva uma instrução para o funcionário saber o que corrigir.");

    // Atualiza status para RETURNED
    const { error } = await supabase.from('checklist_items').update({
      status: 'RETURNED',
      notes: interactionReason
    }).eq('id', taskToInteract.id);

    if (!error) {
      setModalReturnOpen(false);
      fetchData();
    } else {
      alert("Erro ao devolver: " + error.message + "\n\n(Verifique se você rodou o script SQL para permitir o status 'RETURNED')");
    }
  }

  // --- HELPERS VISUAIS ---
  function isLate(dueTime) {
    if (!dueTime) return false;
    const nowStr = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return nowStr > dueTime.slice(0, 5);
  }

  // Filtra quais tarefas aparecem na lista principal
  const visibleTasks = tasks.filter(t => {
    if (activeTab === 'todo') return ['PENDING', 'WAITING_APPROVAL', 'RETURNED'].includes(t.status);
    if (activeTab === 'done') return ['COMPLETED', 'CANCELED'].includes(t.status);
    return false;
  });

  // --- RENDERIZAÇÃO ---
  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans pb-safe">

      {/* HEADER FIXO */}
      <div className="bg-white p-3 sm:p-4 border-b sticky top-0 z-10 shadow-sm pt-safe">
        <div className="max-w-3xl mx-auto flex justify-between items-center gap-2">
          <div>
            <h2 className="font-black text-lg sm:text-xl text-slate-800 truncate">Olá, {user.full_name.split(' ')[0]}</h2>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-slate-200">{user.store_name}</span>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-blue-100">{user.role_name}</span>
            </div>
          </div>
          <button onClick={onLogout} className="flex flex-col items-center text-red-500 hover:text-red-700 font-bold text-xs gap-1 shrink-0 min-w-[44px] min-h-[44px] justify-center">
            <LogOut size={18} /> Sair
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-3 sm:p-4">

        {/* ABAS DE NAVEGAÇÃO */}
        <div className="flex bg-white p-1 rounded-lg border border-slate-200 mb-4 sm:mb-6 shadow-sm overflow-x-auto scrollbar-hide">

          <button onClick={() => setActiveTab('todo')} className={`flex-1 py-2.5 px-3 sm:px-4 whitespace-nowrap rounded-md font-bold text-xs sm:text-sm flex justify-center items-center gap-1.5 sm:gap-2 transition-all min-h-[44px] ${activeTab === 'todo' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
            <Clock size={16} /> A Fazer
            <span className="ml-1 bg-white/20 text-white text-xs px-2 rounded-full">
              {tasks.filter(t => ['PENDING', 'RETURNED'].includes(t.status)).length}
            </span>
          </button>

          {/* ABA REVISÃO (VISÍVEL APENAS PARA GESTORES) */}
          {isManager() && (
            <button onClick={() => setActiveTab('review')} className={`flex-1 py-2.5 px-3 sm:px-4 whitespace-nowrap rounded-md font-bold text-xs sm:text-sm flex justify-center items-center gap-1.5 sm:gap-2 transition-all min-h-[44px] ${activeTab === 'review' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
              <UserCheck size={16} /> Revisão
              {reviewTasks.length > 0 && <span className="ml-1 bg-white text-amber-600 font-black text-xs px-2 rounded-full animate-pulse">{reviewTasks.length}</span>}
            </button>
          )}

          <button onClick={() => setActiveTab('done')} className={`flex-1 py-2.5 px-3 sm:px-4 whitespace-nowrap rounded-md font-bold text-xs sm:text-sm flex justify-center items-center gap-1.5 sm:gap-2 transition-all min-h-[44px] ${activeTab === 'done' ? 'bg-green-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
            <CheckCircle size={16} /> Finalizadas
          </button>
        </div>

        {/* ========================================================== */}
        {/* LISTA DE TAREFAS (A FAZER / FINALIZADAS) */}
        {/* ========================================================== */}
        {activeTab !== 'review' && (
          <div className="space-y-4">
            {!loading && visibleTasks.length === 0 && (
              <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                <CheckCircle size={40} className="mx-auto mb-2 opacity-20" />
                <p className="font-medium">Nenhuma tarefa encontrada.</p>
              </div>
            )}

            {visibleTasks.map(item => {
              const isReturned = item.status === 'RETURNED';
              const isWaiting = item.status === 'WAITING_APPROVAL';
              const isLateTask = !isWaiting && !isReturned && activeTab === 'todo' && isLate(item.template?.due_time);
              const done = item.status === 'COMPLETED';
              const canceled = item.status === 'CANCELED';

              // Lógica de Cores da Borda Lateral
              let borderColor = 'border-blue-500';
              if (isReturned) borderColor = 'border-orange-500'; // Prioridade Visual: Devolvida
              else if (isWaiting) borderColor = 'border-amber-400';
              else if (isLateTask) borderColor = 'border-red-500';
              else if (done) borderColor = 'border-green-500';
              else if (canceled) borderColor = 'border-slate-400';

              return (
                <div key={item.id} className={`bg-white rounded-xl shadow-sm border-l-[6px] ${borderColor} border-t border-r border-b border-slate-200 relative overflow-hidden transition-all ${isWaiting ? 'bg-amber-50/40' : ''}`}>

                  {/* ETIQUETA: ATRASADO (Canto Superior Direito) */}
                  {isLateTask && (
                    <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl shadow-sm z-10 flex items-center gap-1 animate-pulse">
                      <AlertCircle size={12} /> Atrasado
                    </div>
                  )}
                  {/* ETIQUETA: DEVOLVIDA (Canto Superior Direito) */}
                  {isReturned && (
                    <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl shadow-sm z-10 flex items-center gap-1">
                      <CornerUpLeft size={12} /> Devolvida
                    </div>
                  )}

                  <div className="p-3 sm:p-5 pt-5 sm:pt-6">
                    {/* CAIXA DE MENSAGEM DO GESTOR (Se Devolvida) */}
                    {isReturned && (
                      <div className="mb-3 bg-orange-50 border border-orange-100 rounded-lg p-3 text-orange-900 text-sm">
                        <div className="font-bold flex items-center gap-2 mb-1 text-orange-700"><MessageSquare size={14} /> Instruções do Gestor:</div>
                        <p className="italic">"{item.notes}"</p>
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-2 pr-4">
                      <h3 className="font-bold text-lg text-slate-800 leading-snug">
                        {item.template?.title}
                      </h3>
                    </div>
                    <p className="text-slate-500 text-sm mb-4 line-clamp-2">{item.template?.description}</p>

                    {/* TAGS (Cargo, Frequência, Hora) */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wide bg-slate-100 text-slate-600 border border-slate-200">
                        {item.template?.role?.name || "Geral"}
                      </span>
                      {item.template?.due_time && (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${isLateTask ? 'text-red-600 bg-red-50 border-red-100' : 'text-slate-500 bg-slate-100 border-slate-200'}`}>
                          <Clock size={10} /> Até {item.template.due_time.slice(0, 5)}
                        </span>
                      )}
                    </div>

                    {/* BOTÕES DE AÇÃO DO OPERADOR */}
                    {(item.status === 'PENDING' || isReturned) && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {/* Botão Concluir (Ocupa 2 espaços) */}
                        <button onClick={() => handleComplete(item.id)} className="col-span-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-lg shadow-sm h-12 sm:h-10 flex items-center justify-center gap-2 text-sm transition-all min-h-[44px]">
                          {item.template?.requires_photo_evidence && <Camera size={16} />}
                          {isReturned ? 'Corrigir e Enviar' : 'Concluir'}
                        </button>

                        {/* Botão Depois */}
                        <button onClick={() => openLaterModal(item)} className="col-span-1 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold rounded-lg border border-amber-200 h-12 sm:h-10 flex flex-col items-center justify-center text-[10px] leading-tight transition-colors min-h-[44px]">
                          <Clock size={16} className="mb-0.5" /> Depois
                        </button>

                        {/* Botão Cancelar */}
                        <button onClick={() => openCancelModal(item)} className="col-span-1 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-500 font-bold rounded-lg border border-slate-200 hover:border-red-100 h-12 sm:h-10 flex flex-col items-center justify-center text-[10px] leading-tight transition-colors min-h-[44px]">
                          <X size={16} className="mb-0.5" /> Cancelar
                        </button>
                      </div>
                    )}

                    {/* STATUS: AGUARDANDO APROVAÇÃO */}
                    {isWaiting && (
                      <div className="mt-2 w-full bg-amber-100 border border-amber-200 text-amber-800 p-3 rounded-lg flex items-center justify-center gap-2 font-black text-xs uppercase shadow-inner">
                        <Hourglass size={16} className="animate-pulse" /> Aguardando Aprovação
                      </div>
                    )}

                    {/* STATUS: FINALIZADA / CANCELADA */}
                    {done && <div className="mt-2 text-xs font-bold text-green-700 bg-green-50 border border-green-100 p-2 rounded-lg flex items-center gap-2 w-full"><CheckCircle size={16} /> Concluído</div>}
                    {canceled && <div className="mt-2 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 p-2 rounded-lg flex items-center gap-2 w-full"><AlertTriangle size={16} /> Cancelado: {item.notes}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================== */}
        {/* ABA DE REVISÃO DO GESTOR (APENAS GESTORES) */}
        {/* ========================================================== */}
        {activeTab === 'review' && isManager() && (
          <div className="space-y-4">
            {!loading && reviewTasks.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <UserCheck size={40} className="mx-auto mb-2 opacity-20" />
                <p className="font-medium">Tudo revisado! Nenhuma pendência.</p>
              </div>
            )}
            {reviewTasks.map(item => (
              <div key={item.id} className="bg-white rounded-xl shadow-lg border border-amber-200 overflow-hidden">
                <div className="bg-amber-50 px-5 py-3 border-b border-amber-100 flex justify-between items-center">
                  <span className="text-xs font-black text-amber-600 uppercase tracking-wide">Aprovação Necessária</span>
                  <span className="text-xs font-bold text-slate-500">{new Date(item.completed_at).toLocaleTimeString().slice(0, 5)}</span>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg text-slate-800 mb-1">{item.template?.title}</h3>
                  <p className="text-sm text-slate-500 mb-4">{item.template?.description}</p>

                  {/* QUEM FEZ A TAREFA */}
                  <div className="flex items-center gap-3 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="bg-blue-100 p-2 rounded-full text-blue-600"><UserCheck size={20} /></div>
                    <div>
                      <span className="block font-bold text-slate-700 text-sm">{item.worker?.full_name || "Funcionário"}</span>
                      <span className="text-xs text-slate-400">Solicitou aprovação</span>
                    </div>
                  </div>

                  {/* PLACEHOLDER DE FOTO (SE HOUVER) */}
                  {item.template?.requires_photo_evidence && (
                    <div className="mb-4 p-4 bg-slate-100 rounded border border-slate-200 text-center text-slate-400 text-xs">
                      <Camera size={24} className="mx-auto mb-1 opacity-50" />
                      Evidência fotográfica anexada
                    </div>
                  )}

                  {/* AÇÕES DE GESTÃO: DEVOLVER / APROVAR */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <button onClick={() => openReturnModal(item)} className="flex-1 py-3 bg-white border-2 border-orange-100 text-orange-600 font-bold rounded-lg hover:bg-orange-50 flex items-center justify-center gap-2 transition-colors min-h-[48px]">
                      <CornerUpLeft size={18} /> Devolver
                    </button>
                    <button onClick={() => handleManagerApprove(item.id)} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md flex items-center justify-center gap-2 transition-colors min-h-[48px]">
                      <CheckCircle size={18} /> Aprovar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ========================================================== */}
      {/* MODAIS (CANCELAR / ADIAR / DEVOLVER) */}
      {/* ========================================================== */}

      {/* 1. Modal Cancelar (Operador) */}
      {modalCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full sm:max-w-sm rounded-t-xl sm:rounded-xl overflow-hidden shadow-2xl max-h-[90dvh] overflow-y-auto pb-safe">
            <div className="bg-red-50 p-4 text-center border-b border-red-100"><h3 className="font-bold text-red-900">Cancelar Tarefa</h3></div>
            <div className="p-4"><textarea className="w-full border p-3 rounded h-24 resize-none" placeholder="Motivo..." value={interactionReason} onChange={e => setInteractionReason(e.target.value)} autoFocus /></div>
            <div className="flex p-4 gap-2 bg-slate-50"><button onClick={() => setModalCancelOpen(false)} className="flex-1 py-3 bg-slate-200 font-bold text-slate-600 rounded min-h-[48px]">Voltar</button><button onClick={confirmCancel} className="flex-1 py-3 bg-red-600 font-bold text-white rounded min-h-[48px]">Confirmar</button></div>
          </div>
        </div>
      )}

      {/* 2. Modal Adiar (Operador) */}
      {modalLaterOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full sm:max-w-sm rounded-t-xl sm:rounded-xl overflow-hidden shadow-2xl max-h-[90dvh] overflow-y-auto pb-safe">
            <div className="bg-amber-50 p-4 text-center border-b border-amber-100"><h3 className="font-bold text-amber-900">Adiar Tarefa</h3></div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1"><Calendar size={12} className="inline mr-1" />Data</label>
                <input type="date" className="w-full border border-slate-200 p-2 rounded-lg text-center text-base font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400" value={postponeDate} onChange={e => setPostponeDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1"><Clock size={12} className="inline mr-1" />Horário</label>
                <input type="time" className="w-full border border-slate-200 p-2 rounded-lg text-center text-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400" value={interactionReason} onChange={e => setInteractionReason(e.target.value)} />
              </div>
            </div>
            <div className="flex p-4 gap-2 bg-slate-50"><button onClick={() => setModalLaterOpen(false)} className="flex-1 py-3 bg-slate-200 font-bold text-slate-600 rounded min-h-[48px]">Cancelar</button><button onClick={confirmLater} className="flex-1 py-3 bg-amber-500 font-bold text-white rounded min-h-[48px]">Agendar</button></div>
          </div>
        </div>
      )}

      {/* 3. Modal DEVOLVER (Gestor) */}
      {modalReturnOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full sm:max-w-sm rounded-t-xl sm:rounded-xl overflow-hidden shadow-2xl max-h-[90dvh] overflow-y-auto pb-safe">
            <div className="bg-orange-50 p-5 text-center border-b border-orange-100">
              <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-orange-600"><CornerUpLeft size={24} /></div>
              <h3 className="font-bold text-orange-900 text-lg">Devolver Tarefa</h3>
              <p className="text-xs text-orange-700 mt-1">Explique o que precisa ser corrigido.</p>
            </div>
            <div className="p-5">
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Instruções para o funcionário</label>
              <textarea
                className="w-full border-2 border-slate-200 rounded-lg p-3 text-slate-700 focus:outline-none focus:border-orange-400 h-32 resize-none"
                placeholder="Ex: A foto ficou escura, refazer limpeza..."
                value={interactionReason}
                onChange={e => setInteractionReason(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex p-4 sm:p-5 gap-2 sm:gap-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalReturnOpen(false)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors min-h-[48px]">Cancelar</button>
              <button onClick={confirmReturn} className="flex-1 py-3 font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-md transition-colors min-h-[48px]">Confirmar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}