import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { 
  Store, User, ArrowLeft, Calendar, 
  CheckCircle, Clock, XCircle, X, Settings, Plus, 
  Pencil, Save, ToggleLeft, ToggleRight, Briefcase, ListChecks, Filter, PlayCircle 
} from "lucide-react";

export default function App() {
  // --- ESTADOS GERAIS ---
  const [view, setView] = useState('kiosk'); // 'kiosk' ou 'admin'
  const [lojas, setLojas] = useState([]);
  const [roles, setRoles] = useState([]);
  const [lojaAtual, setLojaAtual] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [tarefas, setTarefas] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- ESTADOS DO ADMIN ---
  const [adminScreen, setAdminScreen] = useState('menu');
  
  // Admin: Lojas
  const [novaLojaNome, setNovaLojaNome] = useState(""); 
  const [modalEditarLojaOpen, setModalEditarLojaOpen] = useState(false);
  const [lojaEmEdicao, setLojaEmEdicao] = useState(null);
  const [editName, setEditName] = useState("");
  const [editShortName, setEditShortName] = useState("");
  const [editInternalCode, setEditInternalCode] = useState("");

  // Admin: Cargos
  const [novoCargoNome, setNovoCargoNome] = useState("");
  const [novoCargoNivel, setNovoCargoNivel] = useState("");
  const [modalEditarCargoOpen, setModalEditarCargoOpen] = useState(false);
  const [cargoEmEdicao, setCargoEmEdicao] = useState(null);
  const [editCargoNome, setEditCargoNome] = useState("");
  const [editCargoNivel, setEditCargoNivel] = useState("");

  // Admin: Colaboradores
  const [listaFuncionariosAdmin, setListaFuncionariosAdmin] = useState([]);
  const [filtroLojaFunc, setFiltroLojaFunc] = useState(""); 
  const [filtroRoleFunc, setFiltroRoleFunc] = useState(""); 
  const [modalNovoFuncionarioOpen, setModalNovoFuncionarioOpen] = useState(false);
  const [novoFuncNome, setNovoFuncNome] = useState("");
  const [novoFuncLoja, setNovoFuncLoja] = useState("");
  const [novoFuncRole, setNovoFuncRole] = useState("");
  const [modalEditarFuncionarioOpen, setModalEditarFuncionarioOpen] = useState(false);
  const [editFuncId, setEditFuncId] = useState(null);
  const [editFuncNome, setEditFuncNome] = useState("");
  const [editFuncLoja, setEditFuncLoja] = useState("");
  const [editFuncRole, setEditFuncRole] = useState("");

  // ADMIN: TAREFAS / CHECKLISTS
  const [listaTemplates, setListaTemplates] = useState([]);
  const [filtroLojaTemplate, setFiltroLojaTemplate] = useState(""); 
  const [filtroRoleTemplate, setFiltroRoleTemplate] = useState(""); 
  const [gerandoRotina, setGerandoRotina] = useState(false);
  const [modalNovaTarefaOpen, setModalNovaTarefaOpen] = useState(false);
  const [novaTarefaTitulo, setNovaTarefaTitulo] = useState("");
  const [novaTarefaDesc, setNovaTarefaDesc] = useState("");
  const [novaTarefaFreq, setNovaTarefaFreq] = useState("daily");
  const [novaTarefaLoja, setNovaTarefaLoja] = useState("");
  const [novaTarefaRole, setNovaTarefaRole] = useState("");
  const [modalEditarTarefaOpen, setModalEditarTarefaOpen] = useState(false);
  const [tarefaEmEdicao, setTarefaEmEdicao] = useState(null);
  const [editTarefaTitulo, setEditTarefaTitulo] = useState("");
  const [editTarefaDesc, setEditTarefaDesc] = useState("");
  const [editTarefaFreq, setEditTarefaFreq] = useState("");
  const [editTarefaLoja, setEditTarefaLoja] = useState("");
  const [editTarefaRole, setEditTarefaRole] = useState("");
  
  // --- ESTADOS AUXILIARES ---
  const [contagemLojas, setContagemLojas] = useState({});
  const [contagemCargos, setContagemCargos] = useState({});
  const [modalAdiarOpen, setModalAdiarOpen] = useState(false);
  const [tarefaParaAdiar, setTarefaParaAdiar] = useState(null);
  const [novaDataPrazo, setNovaDataPrazo] = useState("");
  const [modalCancelarOpen, setModalCancelarOpen] = useState(false);
  const [tarefaParaCancelar, setTarefaParaCancelar] = useState(null);
  const [justificativa, setJustificativa] = useState("");

  // --- INICIALIZAÇÃO ---
  useEffect(() => {
    buscarLojas();
    buscarRoles();
    atualizarContadoresGerais();
  }, []);

  async function buscarLojas() {
    const { data } = await supabase.from("stores").select("*").order('name');
    setLojas(data || []);
  }

  async function buscarRoles() {
    const { data } = await supabase.from("roles").select("*").order('access_level', { ascending: false });
    setRoles(data || []);
  }

  async function atualizarContadoresGerais() {
    if (view !== 'kiosk') return;
    const { data } = await supabase.rpc('get_store_pending_counts');
    if (data) {
      const mapa = {};
      data.forEach(item => { mapa[item.store_id] = item.total });
      setContagemLojas(mapa);
    }
  }

  // --- FUNÇÕES DO QUIOSQUE ---
  async function selecionarLoja(loja) {
    setLoading(true);
    setLojaAtual(loja);
    const { data } = await supabase.from("employee").select("*").eq("store_id", loja.id).eq("active", true);
    setFuncionarios(data || []);
    const { data: counts } = await supabase.rpc('get_role_pending_counts', { target_store_id: loja.id });
    if (counts) { const mapa = {}; counts.forEach(item => { mapa[item.role_id] = item.total }); setContagemCargos(mapa); }
    setLoading(false);
  }

  async function selecionarUsuario(funcionario) {
    setUsuarioAtual(funcionario);
    buscarTarefasDoDia(lojaAtual.id, funcionario.role_id);
  }

  async function buscarTarefasDoDia(storeId, roleId) {
    setLoading(true);
    const hoje = new Date().toISOString().split('T')[0];
    const roleParaBuscar = roleId || usuarioAtual?.role_id;
    if (!roleParaBuscar) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("checklist_items")
      .select(`*, template:task_templates!inner ( title, description, role_id )`)
      .eq("store_id", storeId).eq("scheduled_date", hoje).eq("template.role_id", roleParaBuscar).order("status", { ascending: false });
    if (error) alert("Erro: " + error.message); else setTarefas(data || []);
    setLoading(false);
  }

  // --- AÇÕES TAREFAS (Concluir, Adiar, Cancelar) ---
  async function handleConcluir(e, tarefa) {
    e.stopPropagation();
    const novoStatus = tarefa.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    await supabase.from("checklist_items").update({ 
        status: novoStatus, completed_by_employee_id: novoStatus === 'COMPLETED' ? usuarioAtual.id : null,
        completed_at: novoStatus === 'COMPLETED' ? new Date().toISOString() : null,
        cancelled_by_employee_id: null, cancellation_reason: null, postponed_by_employee_id: null
      }).eq("id", tarefa.id);
    buscarTarefasDoDia(lojaAtual.id, usuarioAtual.role_id); atualizarContadoresGerais(); 
  }
  function abrirModalAdiar(e, tarefa) { e.stopPropagation(); setTarefaParaAdiar(tarefa); setNovaDataPrazo(""); setModalAdiarOpen(true); }
  async function confirmarAdiamento() {
    if (!novaDataPrazo) return alert("Escolha data!");
    await supabase.from("checklist_items").update({ status: 'POSTPONED', postponed_to: new Date(novaDataPrazo).toISOString(), postponed_by_employee_id: usuarioAtual.id, postponed_at: new Date().toISOString() }).eq("id", tarefaParaAdiar.id);
    setModalAdiarOpen(false); buscarTarefasDoDia(lojaAtual.id, usuarioAtual.role_id); atualizarContadoresGerais();
  }
  function abrirModalCancelar(e, tarefa) { e.stopPropagation(); setTarefaParaCancelar(tarefa); setJustificativa(""); setModalCancelarOpen(true); }
  async function confirmarCancelamento() {
    if (!justificativa) return alert("Justifique!");
    await supabase.from("checklist_items").update({ status: 'CANCELED', cancellation_reason: justificativa, cancelled_by_employee_id: usuarioAtual.id, cancelled_at: new Date().toISOString() }).eq("id", tarefaParaCancelar.id);
    setModalCancelarOpen(false); buscarTarefasDoDia(lojaAtual.id, usuarioAtual.role_id); atualizarContadoresGerais();
  }
  function voltarParaLojas() { setLojaAtual(null); setFuncionarios([]); setUsuarioAtual(null); atualizarContadoresGerais(); }
  function voltarParaFuncionarios() { setUsuarioAtual(null); setTarefas([]); selecionarLoja(lojaAtual); }

  // --- MÓDULO ADMIN ---
  function entrarNoAdmin() {
    const senha = prompt("Digite a senha de administrador:");
    if (senha === "1234") { setView('admin'); setAdminScreen('menu'); } else { alert("Senha incorreta"); }
  }
  function sairDoAdmin() { 
    setView('kiosk'); 
    setAdminScreen('menu'); 
    buscarLojas(); 
    buscarRoles(); 
    setFiltroLojaFunc(""); setFiltroRoleFunc("");
    setFiltroLojaTemplate(""); setFiltroRoleTemplate("");
  }

  // ADMIN: LOJAS
  async function criarLoja() {
    if (!novaLojaNome) return alert("Digite o nome da loja");
    const { error } = await supabase.from("stores").insert({ name: novaLojaNome, timezone: 'America/Sao_Paulo', active: true });
    if (error) alert("Erro: " + error.message); else { setNovaLojaNome(""); buscarLojas(); }
  }
  async function toggleStatusLoja(loja) {
    const { error } = await supabase.from("stores").update({ active: !loja.active }).eq("id", loja.id);
    if (error) alert("Erro: " + error.message); else buscarLojas();
  }
  function abrirModalEditarLoja(loja) {
    setLojaEmEdicao(loja); setEditName(loja.name || ""); setEditShortName(loja.shortName || ""); setEditInternalCode(loja.InternalCode || ""); setModalEditarLojaOpen(true);
  }
  async function salvarEdicaoLoja() {
    if (!editName) return alert("Nome obrigatório");
    const { error } = await supabase.from("stores").update({ name: editName, "shortName": editShortName, "InternalCode": editInternalCode }).eq("id", lojaEmEdicao.id);
    if (error) alert("Erro: " + error.message); else { setModalEditarLojaOpen(false); buscarLojas(); }
  }

  // ADMIN: CARGOS
  async function criarCargo() {
    if (!novoCargoNome || !novoCargoNivel) return alert("Preencha Nome e Nível");
    const slugAuto = novoCargoNome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const { error } = await supabase.from("roles").insert({ name: novoCargoNome, slug: slugAuto, access_level: parseInt(novoCargoNivel), active: true });
    if (error) alert("Erro: " + error.message); else { setNovoCargoNome(""); setNovoCargoNivel(""); buscarRoles(); }
  }
  async function toggleStatusCargo(cargo) {
    const { error } = await supabase.from("roles").update({ active: !cargo.active }).eq("id", cargo.id);
    if (error) alert("Erro: " + error.message); else buscarRoles();
  }
  function abrirModalEditarCargo(cargo) {
    setCargoEmEdicao(cargo); setEditCargoNome(cargo.name || ""); setEditCargoNivel(cargo.access_level || ""); setModalEditarCargoOpen(true);
  }
  async function salvarEdicaoCargo() {
    if (!editCargoNome || !editCargoNivel) return alert("Campos obrigatórios");
    const { error } = await supabase.from("roles").update({ name: editCargoNome, access_level: parseInt(editCargoNivel) }).eq("id", cargoEmEdicao.id);
    if (error) alert("Erro: " + error.message); else { setModalEditarCargoOpen(false); buscarRoles(); }
  }

  // ADMIN: COLABORADORES
  async function abrirAdminColaboradores(lojaId = filtroLojaFunc, roleId = filtroRoleFunc) {
    setAdminScreen('colaboradores');
    let query = supabase.from("employee").select(`*, stores (name), roles (name)`).order('full_name');
    if (lojaId) query = query.eq('store_id', lojaId);
    if (roleId) query = query.eq('role_id', roleId);
    const { data, error } = await query;
    if (error) alert("Erro: " + error.message); 
    else setListaFuncionariosAdmin(data || []);
  }

  async function toggleStatusFuncionario(func) {
    const { error } = await supabase.from("employee").update({ active: !func.active }).eq("id", func.id);
    if (error) alert("Erro: " + error.message); else abrirAdminColaboradores();
  }
  function abrirModalNovoColaborador() { setNovoFuncNome(""); setNovoFuncLoja(""); setNovoFuncRole(""); setModalNovoFuncionarioOpen(true); }
  async function salvarNovoColaborador() {
    if (!novoFuncNome || !novoFuncLoja || !novoFuncRole) return alert("Preencha todos os campos!");
    const { error } = await supabase.from("employee").insert({ full_name: novoFuncNome, store_id: novoFuncLoja, role_id: novoFuncRole, active: true });
    if (error) alert("Erro: " + error.message); else { setModalNovoFuncionarioOpen(false); abrirAdminColaboradores(); }
  }
  function abrirModalEditarColaborador(func) { setEditFuncId(func.id); setEditFuncNome(func.full_name || ""); setEditFuncLoja(func.store_id || ""); setEditFuncRole(func.role_id || ""); setModalEditarFuncionarioOpen(true); }
  async function salvarEdicaoColaborador() {
    if (!editFuncNome || !editFuncLoja || !editFuncRole) return alert("Preencha todos os campos!");
    const { error } = await supabase.from("employee").update({ full_name: editFuncNome, store_id: editFuncLoja, role_id: editFuncRole }).eq("id", editFuncId);
    if (error) alert("Erro: " + error.message); else { setModalEditarFuncionarioOpen(false); abrirAdminColaboradores(); }
  }

  // ADMIN: TAREFAS
  async function abrirAdminTarefas() {
    setAdminScreen('tarefas');
    setListaTemplates([]); setFiltroLojaTemplate(""); setFiltroRoleTemplate("");
  }

  async function buscarTemplatesFiltrados(lojaId, roleId) {
    if (!lojaId) return;
    let query = supabase.from("task_templates").select(`*, stores(name), roles(name)`).eq("store_id", lojaId).order("created_at", { ascending: false });
    if (roleId) query = query.eq("role_id", roleId);
    const { data, error } = await query;
    if (error) alert("Erro: " + error.message); else setListaTemplates(data || []);
  }

  async function toggleStatusTemplate(template) {
    const { error } = await supabase.from("task_templates").update({ active: !template.active }).eq("id", template.id);
    if (error) alert("Erro: " + error.message); else buscarTemplatesFiltrados(filtroLojaTemplate, filtroRoleTemplate);
  }

  function abrirModalNovaTarefa() {
    if (!filtroLojaTemplate) return alert("Selecione uma loja no filtro primeiro!");
    setNovaTarefaLoja(filtroLojaTemplate); setNovaTarefaRole(filtroRoleTemplate);
    setNovaTarefaTitulo(""); setNovaTarefaDesc(""); setNovaTarefaFreq("daily"); setModalNovaTarefaOpen(true);
  }

  async function salvarNovaTarefa() {
    if (!novaTarefaTitulo || !novaTarefaLoja || !novaTarefaRole) return alert("Campos obrigatórios!");
    const { error } = await supabase.from("task_templates").insert({ title: novaTarefaTitulo, description: novaTarefaDesc, frequency_type: novaTarefaFreq, store_id: novaTarefaLoja, role_id: novaTarefaRole, active: true });
    if (error) alert("Erro: " + error.message); else { setModalNovaTarefaOpen(false); buscarTemplatesFiltrados(novaTarefaLoja, novaTarefaRole); }
  }

  function abrirModalEditarTarefa(template) {
    setTarefaEmEdicao(template); setEditTarefaTitulo(template.title || ""); setEditTarefaDesc(template.description || ""); setEditTarefaFreq(template.frequency_type || "daily"); setEditTarefaLoja(template.store_id); setEditTarefaRole(template.role_id); setModalEditarTarefaOpen(true);
  }

  async function salvarEdicaoTarefa() {
    if (!editTarefaTitulo || !editTarefaLoja || !editTarefaRole) return alert("Campos obrigatórios!");
    const { error } = await supabase.from("task_templates").update({ title: editTarefaTitulo, description: editTarefaDesc, frequency_type: editTarefaFreq, store_id: editTarefaLoja, role_id: editTarefaRole }).eq("id", tarefaEmEdicao.id);
    if (error) alert("Erro: " + error.message); else { setModalEditarTarefaOpen(false); buscarTemplatesFiltrados(filtroLojaTemplate, filtroRoleTemplate); }
  }

  async function gerarRotinaDoDia() {
    setGerandoRotina(true);
    const { data, error } = await supabase.rpc('generate_daily_checklist');
    setGerandoRotina(false);
    
    if (error) {
      alert("Erro ao gerar rotina: " + error.message);
    } else {
      alert("Sucesso! " + data);
      atualizarContadoresGerais(); 
    }
  }

  // --- RENDERIZAÇÃO ---
  if (view === 'admin') {
    return (
      <div className="min-h-screen bg-slate-800 text-white p-8 font-sans">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-10 border-b border-slate-700 pb-4">
            <h1 className="text-3xl font-bold flex items-center gap-2"><Settings /> Administração</h1>
            <button onClick={sairDoAdmin} className="text-slate-400 hover:text-white underline">Sair / Voltar ao Quiosque</button>
          </div>

          {/* MENU */}
          {adminScreen === 'menu' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <button onClick={() => setAdminScreen('lojas')} className="bg-slate-700 p-8 rounded-xl hover:bg-blue-600 transition-all text-xl font-bold border border-slate-600 flex flex-col items-center gap-4"><Store size={40} /> Lojas</button>
              <button onClick={() => setAdminScreen('cargos')} className="bg-slate-700 p-8 rounded-xl hover:bg-blue-600 transition-all text-xl font-bold border border-slate-600 flex flex-col items-center gap-4"><Briefcase size={40} /> Cargos</button>
              <button onClick={() => abrirAdminColaboradores()} className="bg-slate-700 p-8 rounded-xl hover:bg-blue-600 transition-all text-xl font-bold border border-slate-600 flex flex-col items-center gap-4"><User size={40} /> Colaboradores</button>
              <button onClick={abrirAdminTarefas} className="bg-slate-700 p-8 rounded-xl hover:bg-purple-600 transition-all text-xl font-bold border border-slate-600 flex flex-col items-center gap-4"><ListChecks size={40} /> Tarefas</button>
              {/* O BOTÃO RELATÓRIOS FOI REMOVIDO AQUI */}
            </div>
          )}

          {/* TELA LOJAS */}
          {adminScreen === 'lojas' && (
            <div className="animate-fade-in">
              <button onClick={() => setAdminScreen('menu')} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft /> Voltar ao Menu</button>
              <div className="bg-slate-700 p-6 rounded-xl mb-8 border border-slate-600"><h3 className="text-xl font-bold mb-4">Adicionar Nova Loja</h3><div className="flex gap-4"><input type="text" placeholder="Nome da Loja" className="flex-1 p-3 rounded bg-slate-800 border border-slate-600 text-white outline-none focus:border-blue-500" value={novaLojaNome} onChange={(e) => setNovaLojaNome(e.target.value)} /><button onClick={criarLoja} className="bg-blue-600 px-6 py-3 rounded hover:bg-blue-500 font-bold flex items-center gap-2"><Plus size={20}/> Criar</button></div></div>
              <div className="grid gap-4 md:grid-cols-2">{lojas.map(loja => (<div key={loja.id} className={`p-4 rounded-lg flex justify-between items-center shadow-sm border-l-8 ${loja.active ? 'bg-white border-green-500' : 'bg-slate-300 border-slate-500'}`}><div className="text-slate-800"><span className="font-bold text-lg block">{loja.name}</span><span className="text-xs text-slate-500">Cod: {loja.InternalCode || '-'} | Res: {loja.shortName || '-'}</span></div><div className="flex gap-2 items-center"><button onClick={() => toggleStatusLoja(loja)} className="flex items-center gap-2 px-3 py-2 rounded font-bold text-sm transition-colors" style={{ backgroundColor: loja.active ? '#dcfce7' : '#f1f5f9', color: loja.active ? '#166534' : '#64748b' }}>{loja.active ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}</button><button onClick={() => abrirModalEditarLoja(loja)} className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded bg-white border border-blue-100"><Pencil size={20} /></button></div></div>))}</div>
            </div>
          )}

          {/* TELA CARGOS */}
          {adminScreen === 'cargos' && (
            <div className="animate-fade-in">
              <button onClick={() => setAdminScreen('menu')} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft /> Voltar ao Menu</button>
              <div className="bg-slate-700 p-6 rounded-xl mb-8 border border-slate-600"><h3 className="text-xl font-bold mb-4">Adicionar Novo Cargo</h3><div className="flex gap-4"><input type="text" placeholder="Nome (ex: Cozinheiro)" className="flex-1 p-3 rounded bg-slate-800 border border-slate-600 text-white outline-none focus:border-blue-500" value={novoCargoNome} onChange={(e) => setNovoCargoNome(e.target.value)} /><input type="number" placeholder="Nível" className="w-32 p-3 rounded bg-slate-800 border border-slate-600 text-white outline-none focus:border-blue-500" value={novoCargoNivel} onChange={(e) => setNovoCargoNivel(e.target.value)} /><button onClick={criarCargo} className="bg-blue-600 px-6 py-3 rounded hover:bg-blue-500 font-bold flex items-center gap-2"><Plus size={20}/> Criar</button></div></div>
              <div className="grid gap-4 md:grid-cols-2">{roles.map(cargo => (<div key={cargo.id} className={`p-4 rounded-lg flex justify-between items-center shadow-sm border-l-8 ${cargo.active ? 'bg-white border-green-500' : 'bg-slate-300 border-slate-500'}`}><div className="text-slate-800"><span className="font-bold text-lg block">{cargo.name}</span><span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded mr-2">Nível: {cargo.access_level}</span></div><div className="flex gap-2 items-center"><button onClick={() => toggleStatusCargo(cargo)} className="flex items-center gap-2 px-3 py-2 rounded font-bold text-sm transition-colors" style={{ backgroundColor: cargo.active ? '#dcfce7' : '#f1f5f9', color: cargo.active ? '#166534' : '#64748b' }}>{cargo.active ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}</button><button onClick={() => abrirModalEditarCargo(cargo)} className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded bg-white border border-blue-100"><Pencil size={20} /></button></div></div>))}</div>
            </div>
          )}

          {/* TELA COLABORADORES */}
          {adminScreen === 'colaboradores' && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setAdminScreen('menu')} className="flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft /> Voltar ao Menu</button>
                <button onClick={abrirModalNovoColaborador} className="bg-blue-600 px-4 py-2 rounded font-bold hover:bg-blue-500 flex items-center gap-2"><Plus size={20} /> Novo Colaborador</button>
              </div>
              <div className="bg-slate-700 p-4 rounded-xl mb-6 border border-slate-600 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full"><label className="block text-sm text-slate-400 mb-1 flex items-center gap-2"><Store size={14}/> Filtrar por Loja</label><select className="w-full p-2 rounded bg-slate-800 border border-slate-500 text-white outline-none" value={filtroLojaFunc} onChange={(e) => { setFiltroLojaFunc(e.target.value); abrirAdminColaboradores(e.target.value, filtroRoleFunc); }}><option value="">Todas as lojas</option>{lojas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                <div className="flex-1 w-full"><label className="block text-sm text-slate-400 mb-1 flex items-center gap-2"><Briefcase size={14}/> Filtrar por Cargo</label><select className="w-full p-2 rounded bg-slate-800 border border-slate-500 text-white outline-none" value={filtroRoleFunc} onChange={(e) => { setFiltroRoleFunc(e.target.value); abrirAdminColaboradores(filtroLojaFunc, e.target.value); }}><option value="">Todos os cargos</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">{listaFuncionariosAdmin.map(func => (<div key={func.id} className={`p-4 rounded-lg flex flex-col md:flex-row justify-between items-center shadow-sm border-l-8 ${func.active ? 'bg-white border-green-500' : 'bg-slate-300 border-slate-500'}`}><div className="flex items-center gap-4 mb-4 md:mb-0 w-full md:w-auto">{func.avatar_url ? <img src={func.avatar_url} className="w-12 h-12 rounded-full object-cover border-2 border-slate-200" /> : <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500"><User size={24} /></div>}<div className="text-slate-800"><span className="font-bold text-lg block">{func.full_name}</span><div className="text-sm text-slate-500 flex items-center gap-2"><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">{func.stores?.name || 'Sem Loja'}</span><span>•</span><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">{func.roles?.name || 'Sem Cargo'}</span></div></div></div><div className="flex gap-2 items-center w-full md:w-auto justify-end"><button onClick={() => toggleStatusFuncionario(func)} className="flex items-center gap-2 px-3 py-2 rounded font-bold text-sm transition-colors" style={{ backgroundColor: func.active ? '#dcfce7' : '#f1f5f9', color: func.active ? '#166534' : '#64748b' }}>{func.active ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}</button><button onClick={() => abrirModalEditarColaborador(func)} className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded bg-white border border-blue-100"><Pencil size={20} /></button></div></div>))}</div>
            </div>
          )}

          {/* TELA TAREFAS */}
          {adminScreen === 'tarefas' && (
            <div className="animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <button onClick={() => setAdminScreen('menu')} className="flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft /> Voltar ao Menu</button>
                <div className="flex gap-4">
                  <button onClick={gerarRotinaDoDia} disabled={gerandoRotina} className="bg-green-600 px-4 py-2 rounded font-bold hover:bg-green-500 flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-wait"><PlayCircle size={20} /> {gerandoRotina ? "Gerando..." : "Gerar Rotina do Dia"}</button>
                  <button onClick={abrirModalNovaTarefa} className="bg-purple-600 px-4 py-2 rounded font-bold hover:bg-purple-500 flex items-center gap-2 shadow-lg"><Plus size={20} /> Nova Tarefa</button>
                </div>
              </div>
              <div className="bg-slate-700 p-4 rounded-xl mb-6 border border-slate-600 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full"><label className="block text-sm text-slate-400 mb-1 flex items-center gap-2"><Store size={14}/> Filtrar por Loja (Obrigatório)</label><select className="w-full p-2 rounded bg-slate-800 border border-slate-500 text-white outline-none" value={filtroLojaTemplate} onChange={(e) => { setFiltroLojaTemplate(e.target.value); buscarTemplatesFiltrados(e.target.value, filtroRoleTemplate); }}><option value="">Selecione uma loja...</option>{lojas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                <div className="flex-1 w-full"><label className="block text-sm text-slate-400 mb-1 flex items-center gap-2"><Briefcase size={14}/> Filtrar por Cargo</label><select className="w-full p-2 rounded bg-slate-800 border border-slate-500 text-white outline-none" value={filtroRoleTemplate} onChange={(e) => { setFiltroRoleTemplate(e.target.value); buscarTemplatesFiltrados(filtroLojaTemplate, e.target.value); }}><option value="">Todos os cargos</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
              </div>
              {!filtroLojaTemplate ? (<div className="text-center py-20 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl"><Filter className="mx-auto mb-2 opacity-50" size={48} /><p>Selecione uma loja acima para ver e gerenciar as tarefas.</p></div>) : (<div className="grid gap-3"><div className="text-sm text-slate-400 mb-2">{listaTemplates.length} tarefas encontradas.</div>{listaTemplates.map(task => (<div key={task.id} className={`p-4 rounded-lg flex flex-col md:flex-row justify-between items-center shadow-sm border-l-8 ${task.active ? 'bg-white border-green-500' : 'bg-slate-300 border-slate-500'}`}><div className="flex-1 text-slate-800 mb-2 md:mb-0"><span className="font-bold text-lg block">{task.title}</span><p className="text-sm text-slate-500 mb-1">{task.description}</p><div className="flex gap-2 text-xs font-bold uppercase tracking-wide"><span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded">{task.frequency_type}</span><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{task.roles?.name}</span></div></div><div className="flex gap-2 items-center"><button onClick={() => toggleStatusTemplate(task)} className="flex items-center gap-2 px-3 py-2 rounded font-bold text-sm transition-colors" style={{ backgroundColor: task.active ? '#dcfce7' : '#f1f5f9', color: task.active ? '#166534' : '#64748b' }}>{task.active ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}</button><button onClick={() => abrirModalEditarTarefa(task)} className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded bg-white border border-blue-100"><Pencil size={20} /></button></div></div>))}</div>)}
            </div>
          )}
        </div>

        {/* MODAIS DE ADMINISTRAÇÃO */}
        {modalEditarLojaOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md text-slate-800 animate-fade-in"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold flex items-center gap-2"><Pencil className="text-blue-500"/> Editar Loja</h3><button onClick={() => setModalEditarLojaOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button></div><div className="space-y-4"><div><label className="block text-sm font-bold text-slate-600 mb-1">Nome</label><input type="text" className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" value={editName} onChange={(e) => setEditName(e.target.value)} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1">Nome resumido</label><input type="text" className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" value={editShortName} onChange={(e) => setEditShortName(e.target.value)} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1">Código Interno ERP</label><input type="text" className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" value={editInternalCode} onChange={(e) => setEditInternalCode(e.target.value)} /></div></div><div className="flex gap-3 mt-8"><button onClick={() => setModalEditarLojaOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button><button onClick={salvarEdicaoLoja} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md flex justify-center items-center gap-2"><Save size={18} /> Salvar</button></div></div></div>)}
        {modalEditarCargoOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md text-slate-800 animate-fade-in"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold flex items-center gap-2"><Pencil className="text-blue-500"/> Editar Cargo</h3><button onClick={() => setModalEditarCargoOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button></div><div className="space-y-4"><div><label className="block text-sm font-bold text-slate-600 mb-1">Nome do Cargo</label><input type="text" className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" value={editCargoNome} onChange={(e) => setEditCargoNome(e.target.value)} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1">Nível</label><input type="number" className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" value={editCargoNivel} onChange={(e) => setEditCargoNivel(e.target.value)} /></div></div><div className="flex gap-3 mt-8"><button onClick={() => setModalEditarCargoOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button><button onClick={salvarEdicaoCargo} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md flex justify-center items-center gap-2"><Save size={18} /> Salvar</button></div></div></div>)}
        {modalNovoFuncionarioOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md text-slate-800 animate-fade-in"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold flex items-center gap-2"><Plus className="text-blue-600"/> Novo Colaborador</h3><button onClick={() => setModalNovoFuncionarioOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button></div><div className="space-y-4"><div><label className="block text-sm font-bold text-slate-600 mb-1">Nome Completo</label><input type="text" className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" placeholder="Ex: João da Silva" value={novoFuncNome} onChange={(e) => setNovoFuncNome(e.target.value)} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1">Loja de Atuação</label><select className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500 bg-white" value={novoFuncLoja} onChange={(e) => setNovoFuncLoja(e.target.value)}><option value="">Selecione uma loja...</option>{lojas.map(loja => (<option key={loja.id} value={loja.id}>{loja.name}</option>))}</select></div><div><label className="block text-sm font-bold text-slate-600 mb-1">Cargo / Função</label><select className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500 bg-white" value={novoFuncRole} onChange={(e) => setNovoFuncRole(e.target.value)}><option value="">Selecione um cargo...</option>{roles.map(role => (<option key={role.id} value={role.id}>{role.name}</option>))}</select></div></div><div className="flex gap-3 mt-8"><button onClick={() => setModalNovoFuncionarioOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button><button onClick={salvarNovoColaborador} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md flex justify-center items-center gap-2"><Save size={18} /> Salvar</button></div></div></div>)}
        {modalEditarFuncionarioOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md text-slate-800 animate-fade-in"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold flex items-center gap-2"><Pencil className="text-blue-500"/> Editar Colaborador</h3><button onClick={() => setModalEditarFuncionarioOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button></div><div className="space-y-4"><div><label className="block text-sm font-bold text-slate-600 mb-1">Nome Completo</label><input type="text" className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" value={editFuncNome} onChange={(e) => setEditFuncNome(e.target.value)} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1">Loja de Atuação</label><select className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500 bg-white" value={editFuncLoja} onChange={(e) => setEditFuncLoja(e.target.value)}><option value="">Selecione uma loja...</option>{lojas.map(loja => (<option key={loja.id} value={loja.id}>{loja.name}</option>))}</select></div><div><label className="block text-sm font-bold text-slate-600 mb-1">Cargo / Função</label><select className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500 bg-white" value={editFuncRole} onChange={(e) => setEditFuncRole(e.target.value)}><option value="">Selecione um cargo...</option>{roles.map(role => (<option key={role.id} value={role.id}>{role.name}</option>))}</select></div></div><div className="flex gap-3 mt-8"><button onClick={() => setModalEditarFuncionarioOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button><button onClick={salvarEdicaoColaborador} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md flex justify-center items-center gap-2"><Save size={18} /> Salvar</button></div></div></div>)}
        {modalNovaTarefaOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg text-slate-800 animate-fade-in"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold flex items-center gap-2"><Plus className="text-purple-600"/> Nova Tarefa</h3><button onClick={() => setModalNovaTarefaOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button></div><div className="space-y-4"><div><label className="block text-sm font-bold text-slate-600 mb-1">Título</label><input type="text" className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-purple-500" placeholder="Ex: Verificar temperatura freezers" value={novaTarefaTitulo} onChange={(e) => setNovaTarefaTitulo(e.target.value)} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1">Descrição</label><textarea className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-purple-500 h-24" placeholder="Detalhes..." value={novaTarefaDesc} onChange={(e) => setNovaTarefaDesc(e.target.value)} /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-slate-600 mb-1">Frequência</label><select className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-purple-500 bg-white" value={novaTarefaFreq} onChange={(e) => setNovaTarefaFreq(e.target.value)}><option value="daily">Diária</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select></div><div><label className="block text-sm font-bold text-slate-600 mb-1">Cargo</label><select className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-purple-500 bg-white" value={novaTarefaRole} onChange={(e) => setNovaTarefaRole(e.target.value)}><option value="">Selecione...</option>{roles.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}</select></div></div><div><label className="block text-sm font-bold text-slate-600 mb-1">Loja</label><select className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-purple-500 bg-white" value={novaTarefaLoja} onChange={(e) => setNovaTarefaLoja(e.target.value)}><option value="">Selecione...</option>{lojas.map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}</select></div></div><div className="flex gap-3 mt-8"><button onClick={() => setModalNovaTarefaOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button><button onClick={salvarNovaTarefa} className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-md flex justify-center items-center gap-2"><Save size={18} /> Salvar</button></div></div></div>)}
        {modalEditarTarefaOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg text-slate-800 animate-fade-in"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold flex items-center gap-2"><Pencil className="text-purple-600"/> Editar Tarefa</h3><button onClick={() => setModalEditarTarefaOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button></div><div className="space-y-4"><div><label className="block text-sm font-bold text-slate-600 mb-1">Título</label><input type="text" className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-purple-500" value={editTarefaTitulo} onChange={(e) => setEditTarefaTitulo(e.target.value)} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1">Descrição</label><textarea className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-purple-500 h-24" value={editTarefaDesc} onChange={(e) => setEditTarefaDesc(e.target.value)} /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-slate-600 mb-1">Frequência</label><select className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-purple-500 bg-white" value={editTarefaFreq} onChange={(e) => setEditTarefaFreq(e.target.value)}><option value="daily">Diária</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select></div><div><label className="block text-sm font-bold text-slate-600 mb-1">Cargo</label><select className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-purple-500 bg-white" value={editTarefaRole} onChange={(e) => setEditTarefaRole(e.target.value)}><option value="">Selecione...</option>{roles.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}</select></div></div><div><label className="block text-sm font-bold text-slate-600 mb-1">Loja</label><select className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-purple-500 bg-white" value={editTarefaLoja} onChange={(e) => setEditTarefaLoja(e.target.value)}><option value="">Selecione...</option>{lojas.map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}</select></div></div><div className="flex gap-3 mt-8"><button onClick={() => setModalEditarTarefaOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button><button onClick={salvarEdicaoTarefa} className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-md flex justify-center items-center gap-2"><Save size={18} /> Salvar</button></div></div></div>)}

        {/* MODAIS QUIOSQUE */}
        {modalAdiarOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"><h3 className="text-xl font-bold text-slate-800 mb-4">Adiar Tarefa</h3><input type="datetime-local" className="w-full border-2 border-slate-200 rounded-lg p-3 text-lg mb-6" value={novaDataPrazo} onChange={(e) => setNovaDataPrazo(e.target.value)} /><div className="flex gap-3"><button onClick={() => setModalAdiarOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Voltar</button><button onClick={confirmarAdiamento} className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 shadow-md">Confirmar</button></div></div></div>)}
        {modalCancelarOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"><h3 className="text-xl font-bold text-slate-800 mb-4">Cancelar Tarefa</h3><textarea className="w-full border-2 border-slate-200 rounded-lg p-3 mb-6 min-h-[100px]" placeholder="Motivo..." value={justificativa} onChange={(e) => setJustificativa(e.target.value)} /><div className="flex gap-3"><button onClick={() => setModalCancelarOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Voltar</button><button onClick={confirmarCancelamento} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 shadow-md">Confirmar</button></div></div></div>)}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800">
      {/* HEADER QUIOSQUE (Inclui botão Admin) */}
      <header className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50 shadow-sm">
        <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2"><ListChecks /> Dashboard Operacional</h1>
        <button onClick={entrarNoAdmin} className="text-slate-500 hover:text-blue-600 text-sm flex items-center gap-1">
          <Settings size={18} /> Admin
        </button>
      </header>

      {/* TELA DE SELEÇÃO DE LOJA */}
      {!lojaAtual && (
        <div className="p-8">
          <h2 className="text-xl font-semibold mb-6">Selecione a Loja:</h2>
          {lojas.length === 0 ? (
            <div className="text-center py-10 text-slate-500">Nenhuma loja cadastrada.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {lojas
                .filter(l => l.active)
                .map(loja => (
                  <button
                    key={loja.id}
                    onClick={() => selecionarLoja(loja)}
                    className="bg-blue-600 text-white p-6 rounded-xl shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-[1.02] flex flex-col items-center justify-center relative"
                  >
                    <Store size={36} className="mb-2" />
                    <span className="font-bold text-lg">{loja.name}</span>
                    {contagemLojas[loja.id] > 0 && (
                      <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">{contagemLojas[loja.id]}</span>
                    )}
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TELA DE SELEÇÃO DE FUNCIONÁRIO */}
      {lojaAtual && !usuarioAtual && (
        <div className="p-8">
          <button onClick={voltarParaLojas} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-blue-600">
            <ArrowLeft size={20} /> Voltar para Lojas
          </button>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Store size={24} className="text-blue-600"/> {lojaAtual.name} - Selecione seu Perfil
          </h2>
          {loading ? (
            <div className="text-center py-10 text-slate-500">Carregando perfis...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {funcionarios
                .sort((a, b) => {
                    const roleA = roles.find(r => r.id === a.role_id);
                    const roleB = roles.find(r => r.id === b.role_id);
                    const levelA = roleA ? roleA.access_level : 0;
                    const levelB = roleB ? roleB.access_level : 0;
                    if (levelA !== levelB) return levelB - levelA; // Maior nível primeiro
                    return a.full_name.localeCompare(b.full_name);
                })
                .map(funcionario => {
                const role = roles.find(r => r.id === funcionario.role_id);
                const roleName = role ? role.name : 'Sem Cargo';
                const pendingCount = contagemCargos[funcionario.role_id] || 0;
                
                return (
                  <button
                    key={funcionario.id}
                    onClick={() => selecionarUsuario(funcionario)}
                    className="bg-slate-100 p-4 rounded-xl shadow-md hover:bg-blue-50 transition-colors flex flex-col items-center text-center relative border-b-4 border-blue-400"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-2">
                      <User size={24} />
                    </div>
                    <span className="font-semibold text-sm line-clamp-2">{funcionario.full_name}</span>
                    <span className="text-xs text-slate-500 mt-1 bg-white px-2 py-0.5 rounded-full border border-slate-200">{roleName}</span>
                    {pendingCount > 0 && (
                        <span className="absolute top-[-8px] right-[-8px] bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-lg">{pendingCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TELA DE CHECKLIST DIÁRIO */}
      {lojaAtual && usuarioAtual && (
        <div className="p-8">
          <button onClick={voltarParaFuncionarios} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-blue-600">
            <ArrowLeft size={20} /> Voltar para Perfis
          </button>
          <div className="flex justify-between items-start mb-6 border-b pb-4">
            <div>
              <h2 className="text-3xl font-bold text-blue-600 mb-1">Checklist Diário</h2>
              <p className="text-lg text-slate-600">
                <Store size={18} className="inline mr-1" /> **{lojaAtual.name}** | 
                <User size={18} className="inline ml-3 mr-1" /> {usuarioAtual.full_name} ({roles.find(r => r.id === usuarioAtual.role_id)?.name || 'Cargo Desconhecido'})
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-slate-500 block">Data de Hoje</span>
              <span className="text-xl font-bold text-slate-800 flex items-center gap-1"><Calendar size={20} /> {new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-slate-500">Carregando tarefas do dia...</div>
          ) : tarefas.length === 0 ? (
            <div className="text-center py-20 text-slate-500 border-2 border-dashed border-slate-300 rounded-xl">
              <CheckCircle className="mx-auto mb-2 opacity-50" size={48} />
              <p>Parabéns! Nenhuma tarefa pendente para o seu cargo hoje, ou o cronograma ainda não foi gerado pelo Administrador.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tarefas.map(tarefa => (
                <div 
                  key={tarefa.id} 
                  className={`p-5 rounded-xl shadow-lg flex items-center justify-between transition-all duration-300 ${
                    tarefa.status === 'COMPLETED' ? 'bg-green-50 border-l-8 border-green-500 opacity-80' : 
                    tarefa.status === 'CANCELED' ? 'bg-red-50 border-l-8 border-red-500 opacity-60' :
                    tarefa.status === 'POSTPONED' ? 'bg-amber-50 border-l-8 border-amber-500 opacity-80' :
                    'bg-white border-l-8 border-blue-500'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className={`text-xl font-bold mb-1 ${tarefa.status === 'COMPLETED' ? 'line-through text-green-700' : 'text-slate-800'}`}>
                      {tarefa.template.title}
                    </h3>
                    <p className="text-slate-500 text-sm mb-2 line-clamp-2">{tarefa.template.description}</p>
                    <div className="text-xs font-semibold uppercase flex items-center space-x-3">
                        <span className={`px-2 py-0.5 rounded-full ${
                            tarefa.status === 'COMPLETED' ? 'bg-green-200 text-green-800' : 
                            tarefa.status === 'CANCELED' ? 'bg-red-200 text-red-800' :
                            tarefa.status === 'POSTPONED' ? 'bg-amber-200 text-amber-800' :
                            'bg-blue-200 text-blue-800'
                        }`}>
                            {tarefa.status}
                        </span>
                        {tarefa.status === 'POSTPONED' && (
                            <span className="text-amber-700 flex items-center gap-1">
                                <Clock size={14} /> Adiado para: {new Date(tarefa.postponed_to).toLocaleDateString('pt-BR')}
                            </span>
                        )}
                        {tarefa.status === 'CANCELED' && (
                            <span className="text-red-700 italic">
                                Motivo: {tarefa.cancellation_reason}
                            </span>
                        )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {tarefa.status === 'PENDING' && (
                      <>
                        <button onClick={(e) => abrirModalAdiar(e, tarefa)} className="text-amber-500 hover:bg-amber-100 p-3 rounded-full transition-colors" title="Adiar Tarefa"><Clock size={24} /></button>
                        <button onClick={(e) => abrirModalCancelar(e, tarefa)} className="text-red-500 hover:bg-red-100 p-3 rounded-full transition-colors" title="Cancelar Tarefa"><XCircle size={24} /></button>
                      </>
                    )}
                    <button 
                      onClick={(e) => handleConcluir(e, tarefa)}
                      className={`p-4 rounded-full transition-colors shadow-md ${
                        tarefa.status === 'COMPLETED' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                      title={tarefa.status === 'COMPLETED' ? 'Marcar como Pendente' : 'Marcar como Concluída'}
                      disabled={tarefa.status === 'CANCELED' || tarefa.status === 'POSTPONED'}
                    >
                      {tarefa.status === 'COMPLETED' ? <X size={24} /> : <CheckCircle size={24} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}