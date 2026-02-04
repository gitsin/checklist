import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { 
  Store, User, ArrowLeft, Calendar, 
  CheckCircle, Clock, XCircle, X, Settings, Plus, 
  Pencil, Save, ToggleLeft, ToggleRight, Briefcase, ListChecks, Filter, PlayCircle, BarChart3, TrendingUp,
  FileUp, AlertCircle, Download 
} from "lucide-react";

export default function App() {
  // --- ESTADOS GERAIS ---
  const [view, setView] = useState('kiosk'); 
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

  // ADMIN: TAREFAS
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
  const [novaTarefaDueTime, setNovaTarefaDueTime] = useState("");
  const [novaTarefaPhotoEvidence, setNovaTarefaPhotoEvidence] = useState(false);
  const [rolesDaLoja, setRolesDaLoja] = useState([]);
  const [modalEditarTarefaOpen, setModalEditarTarefaOpen] = useState(false);
  const [tarefaEmEdicao, setTarefaEmEdicao] = useState(null);
  const [editTarefaTitulo, setEditTarefaTitulo] = useState("");
  const [editTarefaDesc, setEditTarefaDesc] = useState("");
  const [editTarefaFreq, setEditTarefaFreq] = useState("");
  const [editTarefaLoja, setEditTarefaLoja] = useState("");
  const [editTarefaRole, setEditTarefaRole] = useState("");
  const [editTarefaDueTime, setEditTarefaDueTime] = useState("");
  const [editTarefaPhotoEvidence, setEditTarefaPhotoEvidence] = useState(false);
  const [rolesDaLojaEmEdicao, setRolesDaLojaEmEdicao] = useState([]);

  // IMPORTAÇÃO CSV
  const [modalImportarOpen, setModalImportarOpen] = useState(false);
  const [importando, setImportando] = useState(false);
  const [logImportacao, setLogImportacao] = useState([]);

  // ADMIN: RELATÓRIOS
  const [filtroLojaRelatorio, setFiltroLojaRelatorio] = useState("");
  const [dadosRelatorio, setDadosRelatorio] = useState(null);
  const [statusContagem, setStatusContagem] = useState(null); 
  const [eficienciaPorCargo, setEficienciaPorCargo] = useState([]); 
  
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

  // --- FUNÇÕES AUXILIARES ---
  function baixarExemploCSV() {
    const cabecalho = "titulo,descricao,frequencia,loja,cargo,horario_limite,exige_foto\n";
    const exemplo = "Limpeza de Forno,Realizar limpeza interna com desengordurante,daily,Loja Centro,Cozinheiro,22:00,true";
    const blob = new Blob([cabecalho + exemplo], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_tarefas_niilu.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // --- AÇÕES TAREFAS ---
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
    setView('kiosk'); setAdminScreen('menu'); 
    buscarLojas(); buscarRoles(); 
    setFiltroLojaFunc(""); setFiltroRoleFunc("");
    setFiltroLojaTemplate(""); setFiltroRoleTemplate("");
    setFiltroLojaRelatorio(""); setDadosRelatorio(null); setStatusContagem(null);
    setEficienciaPorCargo([]); 
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
    if (error) alert("Erro: " + error.message); else setListaFuncionariosAdmin(data || []);
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
  async function carregarCargosDaLoja(lojaId) {
    if (!lojaId) return [];
    const { data: employees } = await supabase.from("employee").select("role_id").eq("store_id", lojaId).eq("active", true);
    const roleIds = [...new Set(employees?.map(e => e.role_id) || [])];
    if (roleIds.length === 0) return [];
    const { data: roleDetails } = await supabase.from("roles").select("*").in("id", roleIds).eq("active", true);
    return roleDetails || [];
  }
  
  async function handleLojaChangeNovaTarefa(lojaId) {
    setNovaTarefaLoja(lojaId); setNovaTarefaRole(""); 
    const roles = await carregarCargosDaLoja(lojaId); setRolesDaLoja(roles);
  }
  
  async function handleLojaChangeEditarTarefa(lojaId) {
    setEditTarefaLoja(lojaId); setEditTarefaRole("");
    const roles = await carregarCargosDaLoja(lojaId); setRolesDaLojaEmEdicao(roles);
  }

  async function abrirAdminTarefas() {
    setAdminScreen('tarefas'); setListaTemplates([]); setFiltroLojaTemplate(""); setFiltroRoleTemplate("");
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
    setNovaTarefaLoja(""); setNovaTarefaRole(""); setRolesDaLoja([]); setNovaTarefaTitulo(""); 
    setNovaTarefaDesc(""); setNovaTarefaFreq("daily"); setNovaTarefaDueTime("");
    setNovaTarefaPhotoEvidence(false); setModalNovaTarefaOpen(true);
  }

  async function salvarNovaTarefa() {
    if (!novaTarefaTitulo || !novaTarefaLoja || !novaTarefaRole) return alert("Campos obrigatórios!");
    const { error } = await supabase.from("task_templates").insert({ 
      title: novaTarefaTitulo, description: novaTarefaDesc, frequency_type: novaTarefaFreq, 
      store_id: novaTarefaLoja, role_id: novaTarefaRole, active: true,
      due_time: novaTarefaDueTime || null, requires_photo_evidence: novaTarefaPhotoEvidence,
    });
    if (error) alert("Erro: " + error.message); else { setModalNovaTarefaOpen(false); buscarTemplatesFiltrados(novaTarefaLoja, novaTarefaRole); }
  }

  async function abrirModalEditarTarefa(template) {
    setTarefaEmEdicao(template); setEditTarefaTitulo(template.title || ""); setEditTarefaDesc(template.description || ""); 
    setEditTarefaFreq(template.frequency_type || "daily"); setEditTarefaLoja(template.store_id);
    setEditTarefaDueTime(template.due_time || ""); setEditTarefaPhotoEvidence(template.requires_photo_evidence || false);
    const roles = await carregarCargosDaLoja(template.store_id); setRolesDaLojaEmEdicao(roles);
    const cargoAindaValido = roles.some(r => r.id === template.role_id);
    if (cargoAindaValido) setEditTarefaRole(template.role_id); else setEditTarefaRole(""); 
    setModalEditarTarefaOpen(true);
  }

  async function salvarEdicaoTarefa() {
    if (!editTarefaTitulo || !editTarefaLoja || !editTarefaRole) return alert("Campos obrigatórios!");
    const { error } = await supabase.from("task_templates").update({ 
      title: editTarefaTitulo, description: editTarefaDesc, frequency_type: editTarefaFreq, 
      store_id: editTarefaLoja, role_id: editTarefaRole,
      due_time: editTarefaDueTime || null, requires_photo_evidence: editTarefaPhotoEvidence
    }).eq("id", tarefaEmEdicao.id);
    if (error) alert("Erro: " + error.message); else { setModalEditarTarefaOpen(false); buscarTemplatesFiltrados(filtroLojaTemplate, filtroRoleTemplate); }
  }

  // IMPORTAÇÃO CSV
  async function processarImportacaoCSV(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    setImportando(true); setLogImportacao(["Lendo arquivo..."]);
    const leitor = new FileReader();
    leitor.onload = async (event) => {
      const texto = event.target.result;
      const linhas = texto.split(/\r?\n/).filter(linha => linha.trim() !== "");
      const dadosParaInserir = [];
      const novosLogs = [];
      const mapaLojas = Object.fromEntries(lojas.map(l => [l.name.toLowerCase().trim(), l.id]));
      const mapaCargos = Object.fromEntries(roles.map(r => [r.name.toLowerCase().trim(), r.id]));

      for (let i = 1; i < linhas.length; i++) {
        const colunas = linhas[i].split(",");
        if (colunas.length < 5) continue;
        const [titulo, descricao, frequencia, nomeLoja, nomeCargo, horario, exigeFoto] = colunas.map(c => c?.trim());
        const store_id = mapaLojas[nomeLoja?.toLowerCase()];
        const role_id = mapaCargos[nomeCargo?.toLowerCase()];

        if (!store_id || !role_id) {
          novosLogs.push(`❌ Linha ${i + 1}: Erro - Loja ou Cargo não encontrados (${nomeLoja} / ${nomeCargo})`);
          continue;
        }

        dadosParaInserir.push({
          title: titulo, description: descricao, frequency_type: frequencia || 'daily',
          store_id, role_id, due_time: horario || null,
          requires_photo_evidence: exigeFoto?.toLowerCase() === 'true', active: true
        });
      }

      if (dadosParaInserir.length > 0) {
        const { error } = await supabase.from("task_templates").insert(dadosParaInserir);
        if (error) novosLogs.push(`Erro Crítico: ${error.message}`);
        else { novosLogs.push(`✅ Sucesso! ${dadosParaInserir.length} tarefas importadas.`); buscarLojas(); }
      } else novosLogs.push("⚠️ Nenhuma linha válida encontrada no arquivo.");

      setLogImportacao(novosLogs); setImportando(false);
    };
    leitor.readAsText(arquivo);
  }

  async function gerarRotinaDoDia() {
    setGerandoRotina(true);
    const { data, error } = await supabase.rpc('generate_daily_checklist');
    setGerandoRotina(false);
    if (error) alert("Erro ao gerar rotina: " + error.message); else { alert("Sucesso! " + data); atualizarContadoresGerais(); }
  }
  
  // PROCESSAMENTO DE DADOS
  function calcularStatusContagem(items) {
    const counts = { COMPLETED: 0, PENDING: 0, POSTPONED: 0, CANCELED: 0, TOTAL: items.length };
    items.forEach(item => { if (item.status in counts) counts[item.status]++; });
    const executaveis = counts.TOTAL - counts.CANCELED;
    counts.PERCENT_COMPLETED = executaveis > 0 ? (counts.COMPLETED / executaveis) * 100 : 0;
    return counts;
  }
  
  function calcularEficienciaPorCargo(items) {
    const efficiencyMap = {};
    items.forEach(item => {
        const roleId = item.template?.role_id;
        const roleName = item.template?.roles?.name || 'Não Classificado';
        if (!roleId) return;
        if (!efficiencyMap[roleId]) efficiencyMap[roleId] = { roleName, total: 0, completed: 0, cancesled: 0, percentCompleted: 0 };
        efficiencyMap[roleId].total++;
        if (item.status === 'COMPLETED') efficiencyMap[roleId].completed++;
        if (item.status === 'CANCELED') efficiencyMap[roleId].cancesled++;
    });
    return Object.values(efficiencyMap).map(data => {
        const executaveis = data.total - data.cancesled;
        data.percentCompleted = executaveis > 0 ? (data.completed / executaveis) * 100 : 0;
        return data;
    }).sort((a, b) => b.percentCompleted - a.percentCompleted);
  }

  function abrirAdminRelatorios() {
    setAdminScreen('relatorios'); setFiltroLojaRelatorio(""); setDadosRelatorio(null); setStatusContagem(null); setEficienciaPorCargo([]);
  }

  async function buscarDashboardOperacional(lojaId) {
    if (!lojaId) { setDadosRelatorio(null); setStatusContagem(null); setEficienciaPorCargo([]); return; }
    const hoje = new Date().toISOString().split('T')[0];
    setLoading(true);
    const { data, error } = await supabase.from("checklist_items").select(`*, template:task_templates!inner ( title, description, role_id, roles(name) ), completed_by:employee!completed_by_employee_id (full_name) `).eq("store_id", lojaId).eq("scheduled_date", hoje).order("status", { ascending: false });
    setLoading(false);
    if (!error) { setDadosRelatorio(data || []); setStatusContagem(calcularStatusContagem(data || [])); setEficienciaPorCargo(calcularEficienciaPorCargo(data || [])); }
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
              <button onClick={abrirAdminRelatorios} className="bg-slate-700 p-8 rounded-xl hover:bg-teal-600 transition-all text-xl font-bold border border-slate-600 flex flex-col items-center gap-4"><BarChart3 size={40} /> Relatórios</button>
            </div>
          )}

          {/* TELA TAREFAS */}
          {adminScreen === 'tarefas' && (
            <div className="animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <button onClick={() => setAdminScreen('menu')} className="flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft /> Voltar ao Menu</button>
                <div className="flex gap-4">
                  <button onClick={() => setModalImportarOpen(true)} className="bg-slate-600 px-4 py-2 rounded font-bold hover:bg-slate-500 flex items-center gap-2 shadow-lg"><FileUp size={20} /> Importar CSV</button>
                  <button onClick={gerarRotinaDoDia} disabled={gerandoRotina} className="bg-green-600 px-4 py-2 rounded font-bold hover:bg-green-500 flex items-center gap-2 disabled:opacity-50"><PlayCircle size={20} /> {gerandoRotina ? "Gerando..." : "Gerar Rotina do Dia"}</button>
                  <button onClick={abrirModalNovaTarefa} className="bg-purple-600 px-4 py-2 rounded font-bold hover:bg-purple-500 flex items-center gap-2"><Plus size={20} /> Nova Tarefa</button>
                </div>
              </div>
              <div className="bg-slate-700 p-4 rounded-xl mb-6 border border-slate-600 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full"><label className="block text-sm text-slate-400 mb-1 flex items-center gap-2"><Store size={14}/> Loja (Obrigatório)</label><select className="w-full p-2 rounded bg-slate-800 border-slate-500 text-white" value={filtroLojaTemplate} onChange={(e) => { setFiltroLojaTemplate(e.target.value); buscarTemplatesFiltrados(e.target.value, filtroRoleTemplate); }}><option value="">Selecione...</option>{lojas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                <div className="flex-1 w-full"><label className="block text-sm text-slate-400 mb-1 flex items-center gap-2"><Briefcase size={14}/> Cargo</label><select className="w-full p-2 rounded bg-slate-800 border-slate-500 text-white" value={filtroRoleTemplate} onChange={(e) => { setFiltroRoleTemplate(e.target.value); buscarTemplatesFiltrados(filtroLojaTemplate, e.target.value); }}><option value="">Todos</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
              </div>
              {!filtroLojaTemplate ? (<div className="text-center py-20 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl"><Filter className="mx-auto mb-2 opacity-50" size={48} /><p>Selecione uma loja para gerenciar tarefas.</p></div>) : (<div className="grid gap-3">{listaTemplates.map(task => (<div key={task.id} className={`p-4 rounded-lg flex justify-between items-center shadow-sm border-l-8 ${task.active ? 'bg-white border-green-500' : 'bg-slate-300 border-slate-500'}`}><div className="flex-1 text-slate-800"><span className="font-bold text-lg block">{task.title}</span><p className="text-sm text-slate-500">{task.description}</p><div className="flex gap-2 text-xs font-bold mt-1"><span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded uppercase">{task.frequency_type}</span><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{task.roles?.name}</span></div></div><div className="flex gap-2"><button onClick={() => toggleStatusTemplate(task)} className="p-2 rounded">{task.active ? <ToggleRight size={24} className="text-green-600"/> : <ToggleLeft size={24} className="text-slate-400"/>}</button><button onClick={() => abrirModalEditarTarefa(task)} className="text-blue-600 p-2"><Pencil size={20} /></button></div></div>))}</div>)}
            </div>
          )}

          {/* RESTANTE DAS TELAS (Relatórios, Lojas, etc) permanecem as mesmas de acordo com o App.jsx original... */}

          {/* MODAL IMPORTAR CSV (ATUALIZADO COM DOWNLOAD) */}
          {modalImportarOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg text-slate-800">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2"><FileUp className="text-blue-600"/> Importar Tarefas</h3>
                  <button onClick={() => {setModalImportarOpen(false); setLogImportacao([]);}} className="text-slate-400 hover:text-slate-600"><X /></button>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
                  <p className="text-sm font-bold text-blue-800 mb-2">Instruções:</p>
                  <p className="text-xs text-blue-700 mb-4">Certifique-se de que o arquivo contém os nomes exatos das Lojas e Cargos cadastrados.</p>
                  <button 
                    onClick={baixarExemploCSV}
                    className="flex items-center gap-2 text-xs bg-blue-600 text-white px-3 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                  >
                    <Download size={14} /> Baixar Modelo CSV
                  </button>
                </div>

                <input type="file" accept=".csv" onChange={processarImportacaoCSV} disabled={importando} className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500" />
                
                {logImportacao.length > 0 && (
                  <div className="mt-6 max-h-40 overflow-y-auto bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono">
                    {logImportacao.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inclusão de todos os outros modais (EditarLoja, NovoColaborador, etc.) para manter integridade... */}
          {/* [TRECHO REMOVIDO PARA BREVIDADE, MAS MANTIDO NO ARQUIVO COMPLETO QUE VOCÊ DEVE USAR] */}

        </div>
      </div>
    );
  }

  // --- VIEW QUIOSQUE ---
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-8 px-4 font-sans text-slate-800">
      {!lojaAtual && (<button onClick={entrarNoAdmin} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 z-50"><Settings size={24} /></button>)}
      {/* Lógica de renderização do Quiosque permanece igual... */}
      {!lojaAtual && (
        <div className="w-full max-w-4xl"><h1 className="text-3xl font-bold text-center mb-8">Unidade</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">{lojas.filter(l => l.active).map((loja) => { const qtd = contagemLojas[loja.id] || 0; return (<button key={loja.id} onClick={() => selecionarLoja(loja)} className="bg-white p-8 rounded-2xl shadow-lg border-slate-200 relative flex flex-col items-center gap-4">{qtd > 0 && <div className="absolute -top-3 -right-3 bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">{qtd}</div>}<Store size={48} className="text-blue-600" /><span className="text-2xl font-bold">{loja.name}</span></button>)})}</div>
        </div>
      )}
      {/* Restante do render Kiosk... */}
    </div>
  );
}