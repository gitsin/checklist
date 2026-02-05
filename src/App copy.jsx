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

  // --- IMPORTAÇÃO CSV ---
  const [modalImportarOpen, setModalImportarOpen] = useState(false);
  const [importando, setImportando] = useState(false);
  const [logImportacao, setLogImportacao] = useState([]);

  // ADMIN: RELATÓRIOS
  const [filtroLojaRelatorio, setFiltroLojaRelatorio] = useState("");
  const [dadosRelatorio, setDadosRelatorio] = useState(null);
  const [statusContagem, setStatusContagem] = useState(null); 
  const [eficienciaPorCargo, setEficienciaPorCargo] = useState([]); 
  
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

  // --- FUNÇÃO PARA MODELO CSV ---
  function baixarExemploCSV() {
    const cabecalho = "titulo,descricao,frequencia,loja,cargo,horario_limite,exige_foto\n";
    const exemplo = "Limpeza de Forno,Realizar limpeza profunda do forno combinado,daily,Unidade Centro,Cozinheiro,22:00,true";
    const blob = new Blob([cabecalho + exemplo], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_importacao_niilu.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- FUNÇÕES DE IMPORTAÇÃO ---
  async function processarImportacaoCSV(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    setImportando(true);
    setLogImportacao(["Lendo arquivo..."]);
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
        else {
          novosLogs.push(`✅ Sucesso! ${dadosParaInserir.length} tarefas importadas.`);
          if (filtroLojaTemplate) buscarTemplatesFiltrados(filtroLojaTemplate, filtroRoleTemplate);
        }
      } else novosLogs.push("⚠️ Nenhuma linha válida encontrada no arquivo.");
      setLogImportacao(novosLogs);
      setImportando(false);
    };
    leitor.readAsText(arquivo);
  }

  // --- FUNÇÕES DO QUIOSQUE ---
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
    if (!novaLojaNome) return alert("Digite o nome");
    const { error } = await supabase.from("stores").insert({ name: novaLojaNome, timezone: 'America/Sao_Paulo', active: true });
    if (error) alert(error.message); else { setNovaLojaNome(""); buscarLojas(); }
  }
  async function toggleStatusLoja(loja) {
    const { error } = await supabase.from("stores").update({ active: !loja.active }).eq("id", loja.id);
    if (error) alert(error.message); else buscarLojas();
  }
  function abrirModalEditarLoja(loja) {
    setLojaEmEdicao(loja); setEditName(loja.name || ""); setEditShortName(loja.shortName || ""); setEditInternalCode(loja.InternalCode || ""); setModalEditarLojaOpen(true);
  }
  async function salvarEdicaoLoja() {
    const { error } = await supabase.from("stores").update({ name: editName, shortName: editShortName, InternalCode: editInternalCode }).eq("id", lojaEmEdicao.id);
    if (error) alert(error.message); else { setModalEditarLojaOpen(false); buscarLojas(); }
  }

  // ADMIN: CARGOS
  async function criarCargo() {
    if (!novoCargoNome || !novoCargoNivel) return alert("Preencha campos");
    const slugAuto = novoCargoNome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const { error } = await supabase.from("roles").insert({ name: novoCargoNome, slug: slugAuto, access_level: parseInt(novoCargoNivel), active: true });
    if (error) alert(error.message); else { setNovoCargoNome(""); setNovoCargoNivel(""); buscarRoles(); }
  }
  async function toggleStatusCargo(cargo) {
    const { error } = await supabase.from("roles").update({ active: !cargo.active }).eq("id", cargo.id);
    if (error) alert(error.message); else buscarRoles();
  }
  function abrirModalEditarCargo(cargo) {
    setCargoEmEdicao(cargo); setEditCargoNome(cargo.name || ""); setEditCargoNivel(cargo.access_level || ""); setModalEditarCargoOpen(true);
  }
  async function salvarEdicaoCargo() {
    const { error } = await supabase.from("roles").update({ name: editCargoNome, access_level: parseInt(editCargoNivel) }).eq("id", cargoEmEdicao.id);
    if (error) alert(error.message); else { setModalEditarCargoOpen(false); buscarRoles(); }
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
    await supabase.from("employee").update({ active: !func.active }).eq("id", func.id);
    abrirAdminColaboradores();
  }
  function abrirModalNovoColaborador() { setNovoFuncNome(""); setNovoFuncLoja(""); setNovoFuncRole(""); setModalNovoFuncionarioOpen(true); }
  async function salvarNovoColaborador() {
    if (!novoFuncNome || !novoFuncLoja || !novoFuncRole) return alert("Preencha todos os campos!");
    const { error } = await supabase.from("employee").insert({ full_name: novoFuncNome, store_id: novoFuncLoja, role_id: novoFuncRole, active: true });
    if (error) alert(error.message); else { setModalNovoFuncionarioOpen(false); abrirAdminColaboradores(); }
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
    const r = await carregarCargosDaLoja(lojaId); setRolesDaLoja(r);
  }
  async function handleLojaChangeEditarTarefa(lojaId) {
    setEditTarefaLoja(lojaId); setEditTarefaRole("");
    const r = await carregarCargosDaLoja(lojaId); setRolesDaLojaEmEdicao(r);
  }
  async function abrirAdminTarefas() {
    setAdminScreen('tarefas'); setListaTemplates([]); setFiltroLojaTemplate(""); setFiltroRoleTemplate("");
  }
  async function buscarTemplatesFiltrados(lojaId, roleId) {
    if (!lojaId) return;
    let q = supabase.from("task_templates").select(`*, stores(name), roles(name)`).eq("store_id", lojaId).order("created_at", { ascending: false });
    if (roleId) q = q.eq("role_id", roleId);
    const { data, error } = await q;
    if (error) alert("Erro: " + error.message); else setListaTemplates(data || []);
  }
  async function toggleStatusTemplate(template) {
    await supabase.from("task_templates").update({ active: !template.active }).eq("id", template.id);
    buscarTemplatesFiltrados(filtroLojaTemplate, filtroRoleTemplate);
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
    const r = await carregarCargosDaLoja(template.store_id); setRolesDaLojaEmEdicao(r);
    const cargoAindaValido = r.some(item => item.id === template.role_id);
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
  async function gerarRotinaDoDia() {
    setGerandoRotina(true);
    const { data, error } = await supabase.rpc('generate_daily_checklist');
    setGerandoRotina(false);
    if (error) alert("Erro ao gerar rotina: " + error.message); else { alert("Sucesso! " + data); atualizarContadoresGerais(); }
  }

  // --- RELATÓRIOS ---
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
    if (!lojaId) return;
    setLoading(true);
    const hoje = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from("checklist_items").select(`*, template:task_templates!inner ( title, description, role_id, roles(name) ), completed_by:employee!completed_by_employee_id (full_name) `).eq("store_id", lojaId).eq("scheduled_date", hoje).order("status", { ascending: false });
    setLoading(false);
    if (!error) { setDadosRelatorio(data || []); setStatusContagem(calcularStatusContagem(data || [])); setEficienciaPorCargo(calcularEficienciaPorCargo(data || [])); }
  }

  // --- RENDERIZAÇÃO ---
  if (view === 'admin') {
    return (
      <div className="min-h-screen bg-slate-800 text-white p-8 font-sans">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-10 border-b border-slate-700 pb-4">
            <h1 className="text-3xl font-bold flex items-center gap-2"><Settings /> Administração</h1>
            <button onClick={sairDoAdmin} className="text-slate-400 hover:text-white underline">Sair / Voltar ao Quiosque</button>
          </div>

          {adminScreen === 'menu' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <button onClick={() => setAdminScreen('lojas')} className="bg-slate-700 p-8 rounded-xl hover:bg-blue-600 border border-slate-600 flex flex-col items-center gap-4"><Store size={40} /> Lojas</button>
              <button onClick={() => setAdminScreen('cargos')} className="bg-slate-700 p-8 rounded-xl hover:bg-blue-600 border border-slate-600 flex flex-col items-center gap-4"><Briefcase size={40} /> Cargos</button>
              <button onClick={() => abrirAdminColaboradores()} className="bg-slate-700 p-8 rounded-xl hover:bg-blue-600 border border-slate-600 flex flex-col items-center gap-4"><User size={40} /> Colaboradores</button>
              <button onClick={abrirAdminTarefas} className="bg-slate-700 p-8 rounded-xl hover:bg-purple-600 border border-slate-600 flex flex-col items-center gap-4"><ListChecks size={40} /> Tarefas</button>
              <button onClick={abrirAdminRelatorios} className="bg-slate-700 p-8 rounded-xl hover:bg-teal-600 border border-slate-600 flex flex-col items-center gap-4"><BarChart3 size={40} /> Relatórios</button>
            </div>
          )}

          {adminScreen === 'lojas' && (
            <div className="animate-fade-in">
              <button onClick={() => setAdminScreen('menu')} className="mb-6 flex items-center gap-2 text-slate-400"><ArrowLeft /> Voltar</button>
              <div className="bg-slate-700 p-6 rounded-xl mb-8 border border-slate-600">
                <h3 className="text-xl font-bold mb-4">Adicionar Nova Loja</h3>
                <div className="flex gap-4">
                  <input type="text" placeholder="Nome da Loja" className="flex-1 p-3 rounded bg-slate-800 border border-slate-600 text-white" value={novaLojaNome} onChange={(e) => setNovaLojaNome(e.target.value)} />
                  <button onClick={criarLoja} className="bg-blue-600 px-6 py-3 rounded hover:bg-blue-50 font-bold flex items-center gap-2"><Plus size={20}/> Criar</button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {lojas.map(loja => (
                  <div key={loja.id} className={`p-4 rounded-lg flex justify-between items-center border-l-8 ${loja.active ? 'bg-white text-slate-800 border-green-500' : 'bg-slate-300 text-slate-500 border-slate-500'}`}>
                    <span className="font-bold text-lg">{loja.name}</span>
                    <div className="flex gap-2">
                      <button onClick={() => toggleStatusLoja(loja)}>{loja.active ? <ToggleRight className="text-green-600" size={30}/> : <ToggleLeft size={30}/>}</button>
                      <button onClick={() => abrirModalEditarLoja(loja)} className="text-blue-600 p-2"><Pencil size={20} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminScreen === 'cargos' && (
            <div className="animate-fade-in">
              <button onClick={() => setAdminScreen('menu')} className="mb-6 flex items-center gap-2 text-slate-400"><ArrowLeft /> Voltar</button>
              <div className="bg-slate-700 p-6 rounded-xl mb-8 border border-slate-600">
                <h3 className="text-xl font-bold mb-4">Adicionar Novo Cargo</h3>
                <div className="flex gap-4">
                  <input type="text" placeholder="Nome" className="flex-1 p-3 rounded bg-slate-800 text-white" value={novoCargoNome} onChange={(e) => setNovoCargoNome(e.target.value)} />
                  <input type="number" placeholder="Nível" className="w-24 p-3 rounded bg-slate-800 text-white" value={novoCargoNivel} onChange={(e) => setNovoCargoNivel(e.target.value)} />
                  <button onClick={criarCargo} className="bg-blue-600 px-6 py-3 rounded font-bold">Criar</button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {roles.map(cargo => (
                  <div key={cargo.id} className={`p-4 rounded-lg flex justify-between items-center border-l-8 ${cargo.active ? 'bg-white text-slate-800 border-green-500' : 'bg-slate-300 text-slate-500 border-slate-500'}`}>
                    <span className="font-bold">{cargo.name} (Nível {cargo.access_level})</span>
                    <div className="flex gap-2">
                      <button onClick={() => toggleStatusCargo(cargo)}>{cargo.active ? <ToggleRight className="text-green-600" size={30}/> : <ToggleLeft size={30}/>}</button>
                      <button onClick={() => abrirModalEditarCargo(cargo)} className="text-blue-600 p-2"><Pencil size={20} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminScreen === 'colaboradores' && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setAdminScreen('menu')} className="flex items-center gap-2 text-slate-400"><ArrowLeft /> Voltar</button>
                <button onClick={() => setModalNovoFuncionarioOpen(true)} className="bg-blue-600 px-4 py-2 rounded font-bold flex items-center gap-2"><Plus size={20} /> Novo Colaborador</button>
              </div>
              <div className="bg-slate-700 p-4 rounded-xl mb-6 flex gap-4 border border-slate-600">
                <select className="flex-1 p-2 rounded bg-slate-800 text-white" value={filtroLojaFunc} onChange={(e) => { setFiltroLojaFunc(e.target.value); abrirAdminColaboradores(e.target.value, filtroRoleFunc); }}><option value="">Todas as Lojas</option>{lojas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
                <select className="flex-1 p-2 rounded bg-slate-800 text-white" value={filtroRoleFunc} onChange={(e) => { setFiltroRoleFunc(e.target.value); abrirAdminColaboradores(filtroLojaFunc, e.target.value); }}><option value="">Todos os Cargos</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {listaFuncionariosAdmin.map(func => (
                  <div key={func.id} className={`p-4 rounded-lg flex justify-between items-center border-l-8 ${func.active ? 'bg-white text-slate-800 border-green-500' : 'bg-slate-300 text-slate-500 border-slate-500'}`}>
                    <div><span className="font-bold block">{func.full_name}</span><span className="text-xs text-slate-500">{func.stores?.name} • {func.roles?.name}</span></div>
                    <div className="flex gap-2">
                      <button onClick={() => toggleStatusFuncionario(func)}>{func.active ? <ToggleRight className="text-green-600" size={30}/> : <ToggleLeft size={30}/>}</button>
                      <button onClick={() => abrirModalEditarColaborador(func)} className="text-blue-600 p-2"><Pencil size={20} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminScreen === 'tarefas' && (
            <div className="animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <button onClick={() => setAdminScreen('menu')} className="flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft /> Voltar</button>
                <div className="flex gap-4">
                  <button onClick={() => setModalImportarOpen(true)} className="bg-slate-600 px-4 py-2 rounded font-bold hover:bg-slate-50 flex items-center gap-2 shadow-lg"><FileUp size={20} /> Importar CSV</button>
                  <button onClick={gerarRotinaDoDia} disabled={gerandoRotina} className="bg-green-600 px-4 py-2 rounded font-bold flex items-center gap-2 shadow-lg disabled:opacity-50"><PlayCircle size={20} /> Gerar Rotina</button>
                  <button onClick={() => setModalNovaTarefaOpen(true)} className="bg-purple-600 px-4 py-2 rounded font-bold flex items-center gap-2 shadow-lg"><Plus size={20} /> Nova Tarefa</button>
                </div>
              </div>
              <div className="bg-slate-700 p-4 rounded-xl mb-6 border border-slate-600">
                <label className="text-xs text-slate-400 mb-1 block">Filtrar por Loja</label>
                <select className="w-full p-2 rounded bg-slate-800 border border-slate-500 text-white outline-none" value={filtroLojaTemplate} onChange={(e) => { setFiltroLojaTemplate(e.target.value); buscarTemplatesFiltrados(e.target.value, filtroRoleTemplate); }}>
                  <option value="">Selecione...</option>
                  {lojas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="grid gap-3">
                {listaTemplates.map(task => (
                  <div key={task.id} className={`p-4 rounded-lg flex justify-between items-center border-l-8 ${task.active ? 'bg-white text-slate-800 border-green-500' : 'bg-slate-300 text-slate-500 border-slate-500'}`}>
                    <div><span className="font-bold block">{task.title}</span><span className="text-xs">{task.roles?.name}</span></div>
                    <div className="flex gap-2">
                      <button onClick={() => toggleStatusTemplate(task)}>{task.active ? <ToggleRight className="text-green-600" size={30}/> : <ToggleLeft size={30}/>}</button>
                      <button onClick={() => abrirModalEditarTarefa(task)} className="text-blue-600 p-2"><Pencil size={20} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {adminScreen === 'relatorios' && (
            <div className="animate-fade-in">
              <button onClick={() => setAdminScreen('menu')} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft /> Voltar ao Menu</button>
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-2 text-teal-400"><BarChart3 size={32} /> Dashboard Operacional</h2>
              <div className="bg-slate-700 p-6 rounded-xl mb-8 border border-slate-600">
                <select className="w-full p-3 rounded bg-slate-800 border border-slate-500 text-white outline-none text-lg" value={filtroLojaRelatorio} onChange={(e) => { setFiltroLojaRelatorio(e.target.value); buscarDashboardOperacional(e.target.value); }}>
                  <option value="">Selecione a Loja</option>
                  {lojas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              {statusContagem && (
                <div className="bg-white p-6 rounded-xl text-slate-800">
                  <h3 className="text-xl font-bold mb-6">Resumo: {statusContagem.PERCENT_COMPLETED.toFixed(0)}% Concluído</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-slate-100 p-4 rounded-lg text-center"><span className="text-xs block">Total</span><span className="text-2xl font-bold">{statusContagem.TOTAL}</span></div>
                    <div className="bg-green-100 p-4 rounded-lg text-center"><span className="text-xs block">Feito</span><span className="text-2xl font-bold">{statusContagem.COMPLETED}</span></div>
                    <div className="bg-amber-100 p-4 rounded-lg text-center"><span className="text-xs block">Adiado</span><span className="text-2xl font-bold">{statusContagem.POSTPONED}</span></div>
                    <div className="bg-red-100 p-4 rounded-lg text-center"><span className="text-xs block">Cancelado</span><span className="text-2xl font-bold">{statusContagem.CANCELED}</span></div>
                    <div className="bg-blue-100 p-4 rounded-lg text-center"><span className="text-xs block">Pendentes</span><span className="text-2xl font-bold">{statusContagem.PENDING}</span></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- MODAIS ADMIN --- */}
        {modalEditarLojaOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md text-slate-800 animate-fade-in"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold flex items-center gap-2"><Pencil className="text-blue-500"/> Editar Loja</h3><button onClick={() => setModalEditarLojaOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button></div><div className="space-y-4"><div><label className="block text-sm font-bold text-slate-600 mb-1">Nome</label><input type="text" className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" value={editName} onChange={(e) => setEditName(e.target.value)} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1">Nome resumido</label><input type="text" className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" value={editShortName} onChange={(e) => setEditShortName(e.target.value)} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1">Código Interno ERP</label><input type="text" className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" value={editInternalCode} onChange={(e) => setEditInternalCode(e.target.value)} /></div></div><div className="flex gap-3 mt-8"><button onClick={() => setModalEditarLojaOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button><button onClick={salvarEdicaoLoja} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md flex justify-center items-center gap-2"><Save size={18} /> Salvar</button></div></div></div>)}
        {modalEditarCargoOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md text-slate-800 animate-fade-in"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold flex items-center gap-2"><Pencil className="text-blue-500"/> Editar Cargo</h3><button onClick={() => setModalEditarCargoOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button></div><div className="space-y-4"><div><label className="block text-sm font-bold text-slate-600 mb-1">Nome do Cargo</label><input type="text" className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" value={editCargoNome} onChange={(e) => setEditCargoNome(e.target.value)} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1">Nível</label><input type="number" className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" value={editCargoNivel} onChange={(e) => setEditCargoNivel(e.target.value)} /></div></div><div className="flex gap-3 mt-8"><button onClick={() => setModalEditarCargoOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button><button onClick={salvarEdicaoCargo} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md flex justify-center items-center gap-2"><Save size={18} /> Salvar</button></div></div></div>)}
        {modalNovoFuncionarioOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md text-slate-800 animate-fade-in"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold flex items-center gap-2"><Plus className="text-blue-600"/> Novo Colaborador</h3><button onClick={() => setModalNovoFuncionarioOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button></div><div className="space-y-4"><div><label className="block text-sm font-bold text-slate-600 mb-1">Nome Completo</label><input type="text" className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" placeholder="Ex: João da Silva" value={novoFuncNome} onChange={(e) => setNovoFuncNome(e.target.value)} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1">Loja</label><select className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500 bg-white" value={novoFuncLoja} onChange={(e) => setNovoFuncLoja(e.target.value)}><option value="">Selecione...</option>{lojas.map(loja => (<option key={loja.id} value={loja.id}>{loja.name}</option>))}</select></div><div><label className="block text-sm font-bold text-slate-600 mb-1">Cargo</label><select className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500 bg-white" value={novoFuncRole} onChange={(e) => setNovoFuncRole(e.target.value)}><option value="">Selecione...</option>{roles.map(role => (<option key={role.id} value={role.id}>{role.name}</option>))}</select></div></div><div className="flex gap-3 mt-8"><button onClick={() => setModalNovoFuncionarioOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button><button onClick={salvarNovoColaborador} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md flex justify-center items-center gap-2"><Save size={18} /> Criar</button></div></div></div>)}
        {modalEditarFuncionarioOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md text-slate-800 animate-fade-in"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold flex items-center gap-2"><Pencil className="text-blue-500"/> Editar Colaborador</h3><button onClick={() => setModalEditarFuncionarioOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button></div><div className="space-y-4"><div><label className="block text-sm font-bold text-slate-600 mb-1">Nome Completo</label><input type="text" className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500" value={editFuncNome} onChange={(e) => setEditFuncNome(e.target.value)} /></div><div><label className="block text-sm font-bold text-slate-600 mb-1">Loja</label><select className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500 bg-white" value={editFuncLoja} onChange={(e) => setEditFuncLoja(e.target.value)}><option value="">Selecione...</option>{lojas.map(loja => (<option key={loja.id} value={loja.id}>{loja.name}</option>))}</select></div><div><label className="block text-sm font-bold text-slate-600 mb-1">Cargo</label><select className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500 bg-white" value={editFuncRole} onChange={(e) => setEditFuncRole(e.target.value)}><option value="">Selecione...</option>{roles.map(role => (<option key={role.id} value={role.id}>{role.name}</option>))}</select></div></div><div className="flex gap-3 mt-8"><button onClick={() => setModalEditarFuncionarioOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button><button onClick={salvarEdicaoColaborador} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md flex justify-center items-center gap-2"><Save size={18} /> Salvar</button></div></div></div>)}
        
        {/* MODAL NOVA TAREFA (MANUAL) */}
        {modalNovaTarefaOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg text-slate-800 animate-fade-in"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold flex items-center gap-2"><Plus className="text-purple-600"/> Nova Tarefa</h3><button onClick={() => setModalNovaTarefaOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button></div><div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Loja</label>
              <select className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-purple-500 bg-white" value={novaTarefaLoja} onChange={(e) => handleLojaChangeNovaTarefa(e.target.value)}>
                <option value="">Selecione a Loja...</option>
                {lojas.filter(l => l.active).map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Cargo</label>
              <select className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-purple-500 bg-white" value={novaTarefaRole} onChange={(e) => setNovaTarefaRole(e.target.value)} disabled={!novaTarefaLoja || rolesDaLoja.length === 0}>
                <option value="">Selecione o Cargo...</option>
                {rolesDaLoja.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
              </select>
            </div>
          </div>
          <div><label className="block text-sm font-bold text-slate-600 mb-1">Título</label><input type="text" className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-purple-500" placeholder="Ex: Verificar temperatura freezers" value={novaTarefaTitulo} onChange={(e) => setNovaTarefaTitulo(e.target.value)} /></div>
          <div><label className="block text-sm font-bold text-slate-600 mb-1">Descrição</label><textarea className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-purple-500 h-24" placeholder="Detalhes..." value={novaTarefaDesc} onChange={(e) => setNovaTarefaDesc(e.target.value)} /></div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">Frequência</label>
            <select className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-purple-500 bg-white" value={novaTarefaFreq} onChange={(e) => setNovaTarefaFreq(e.target.value)}>
              <option value="daily">Diária</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4 items-center pt-2">
            <div><label className="block text-sm font-bold text-slate-600 mb-1">Horário Limite</label><input type="time" className="w-full border border-slate-300 rounded-lg p-3 outline-none" value={novaTarefaDueTime} onChange={(e) => setNovaTarefaDueTime(e.target.value)} /></div>
            <div className="flex items-center gap-3 pt-7"><input type="checkbox" className="h-5 w-5" checked={novaTarefaPhotoEvidence} onChange={(e) => setNovaTarefaPhotoEvidence(e.target.checked)} /><label className="font-bold text-slate-600 text-sm">Exige Foto</label></div>
          </div>
        </div><div className="flex gap-3 mt-8"><button onClick={() => setModalNovaTarefaOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button><button onClick={salvarNovaTarefa} className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-md flex justify-center items-center gap-2"><Save size={18} /> Salvar</button></div></div></div>)}

        {/* MODAL EDITAR TAREFA (FIXED: MESMO LAYOUT DA CRIAÇÃO + FILTRO DE CARGOS) */}
        {modalEditarTarefaOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg text-slate-800 animate-fade-in"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold flex items-center gap-2"><Pencil className="text-purple-600"/> Editar Tarefa</h3><button onClick={() => setModalEditarTarefaOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button></div><div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Loja</label>
              <select 
                className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-purple-500 bg-white" 
                value={editTarefaLoja} 
                onChange={(e) => handleLojaChangeEditarTarefa(e.target.value)}
              >
                <option value="">Selecione a Loja...</option>
                {lojas.filter(l => l.active).map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Cargo</label>
              <select 
                className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-purple-500 bg-white" 
                value={editTarefaRole} 
                onChange={(e) => setEditTarefaRole(e.target.value)}
                disabled={!editTarefaLoja || rolesDaLojaEmEdicao.length === 0}
              >
                <option value="">Selecione o Cargo...</option>
                {rolesDaLojaEmEdicao.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
              </select>
            </div>
          </div>
          <div><label className="block text-sm font-bold text-slate-600 mb-1">Título</label><input type="text" className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-purple-500" value={editTarefaTitulo} onChange={(e) => setEditTarefaTitulo(e.target.value)} /></div>
          <div><label className="block text-sm font-bold text-slate-600 mb-1">Descrição</label><textarea className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-purple-500 h-24" value={editTarefaDesc} onChange={(e) => setEditTarefaDesc(e.target.value)} /></div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">Frequência</label>
            <select className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-purple-500 bg-white" value={editTarefaFreq} onChange={(e) => setEditTarefaFreq(e.target.value)}>
              <option value="daily">Diária</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4 items-center pt-2">
            <div><label className="block text-sm font-bold text-slate-600 mb-1">Horário Limite</label><input type="time" className="w-full border border-slate-300 rounded-lg p-3 outline-none" value={editTarefaDueTime} onChange={(e) => setEditTarefaDueTime(e.target.value)} /></div>
            <div className="flex items-center gap-3 pt-7"><input type="checkbox" className="h-5 w-5" checked={editTarefaPhotoEvidence} onChange={(e) => setEditTarefaPhotoEvidence(e.target.checked)} /><label className="font-bold text-slate-600 text-sm">Exige Foto</label></div>
          </div>
        </div><div className="flex gap-3 mt-8"><button onClick={() => setModalEditarTarefaOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button><button onClick={salvarEdicaoTarefa} className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-md flex justify-center items-center gap-2"><Save size={18} /> Salvar</button></div></div></div>)}

        {/* MODAL IMPORTAR CSV */}
        {modalImportarOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg text-slate-800 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2"><FileUp className="text-blue-600"/> Importar Tarefas</h3>
                <button onClick={() => {setModalImportarOpen(false); setLogImportacao([]);}} className="text-slate-400 hover:text-slate-600"><X /></button>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
                <p className="text-sm font-bold text-blue-800 mb-2">Padrão de Importação:</p>
                <p className="text-xs text-blue-700 mb-4 italic">Colunas: titulo, descricao, frequencia, loja, cargo, horario_limite, exige_foto</p>
                <button onClick={baixarExemploCSV} className="flex items-center gap-2 text-xs bg-blue-600 text-white px-3 py-2 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md">
                  <Download size={14} /> Baixar Modelo CSV
                </button>
              </div>
              <input type="file" accept=".csv" onChange={processarImportacaoCSV} disabled={importando} className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors" />
              {logImportacao.length > 0 && (
                <div className="mt-6 max-h-40 overflow-y-auto bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono">
                  {logImportacao.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAIS QUIOSQUE */}
        {modalAdiarOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md text-slate-800"><h3 className="text-xl font-bold text-slate-800 mb-4">Adiar Tarefa</h3><input type="datetime-local" className="w-full border-2 border-slate-200 rounded-lg p-3 text-lg mb-6 outline-none focus:border-amber-500" value={novaDataPrazo} onChange={(e) => setNovaDataPrazo(e.target.value)} /><div className="flex gap-3"><button onClick={() => setModalAdiarOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Voltar</button><button onClick={confirmarAdiamento} className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 shadow-md">Confirmar</button></div></div></div>)}
        {modalCancelarOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md text-slate-800"><h3 className="text-xl font-bold text-slate-800 mb-4">Cancelar Tarefa</h3><textarea className="w-full border-2 border-slate-200 rounded-lg p-3 mb-6 min-h-[100px] outline-none focus:border-red-500" placeholder="Motivo..." value={justificativa} onChange={(e) => setJustificativa(e.target.value)} /><div className="flex gap-3"><button onClick={() => setModalCancelarOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Voltar</button><button onClick={confirmarCancelamento} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 shadow-md">Confirmar</button></div></div></div>)}
      </div>
    );
  }

  // --- VIEW QUIOSQUE (PADRÃO) ---
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-8 px-4 font-sans text-slate-800">
      {!lojaAtual && (<button onClick={entrarNoAdmin} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 transition-colors z-50"><Settings size={24} /></button>)}
      {!lojaAtual && (
        <div className="w-full max-w-4xl animate-fade-in"><h1 className="text-3xl font-bold text-center mb-8">Selecione a Unidade</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">{lojas.filter(l => l.active).map((loja) => { const qtd = contagemLojas[loja.id] || 0; return (<button key={loja.id} onClick={() => selecionarLoja(loja)} className="relative bg-white p-8 rounded-2xl shadow-lg hover:scale-105 transition-all flex flex-col items-center gap-4 border border-slate-200">{qtd > 0 && <div className="absolute -top-3 -right-3 bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-md border-4 border-slate-100 text-lg">{qtd}</div>}<div className="bg-blue-100 p-4 rounded-full"><Store size={48} className="text-blue-600" /></div><span className="text-2xl font-bold">{loja.name}</span></button>)})}</div>
        </div>
      )}
      {lojaAtual && !usuarioAtual && (
        <div className="w-full max-w-5xl"><button onClick={voltarParaLojas} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-blue-600 font-medium"><ArrowLeft /> Trocar de Loja</button><h2 className="text-3xl font-bold text-center mb-10">Quem é você?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">{funcionarios.filter(f => f.active).map((func) => { const qtd = contagemCargos[func.role_id] || 0; return (<button key={func.id} onClick={() => selecionarUsuario(func)} className="relative aspect-square bg-white rounded-3xl shadow-md hover:shadow-xl hover:-translate-y-2 transition-all flex flex-col items-center justify-center gap-4 border border-slate-100 group">{qtd > 0 && <div className="absolute -top-3 -right-3 bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-md border-4 border-slate-100 text-lg z-10">{qtd}</div>}{func.avatar_url ? <img src={func.avatar_url} className="w-24 h-24 rounded-full object-cover border-4 border-slate-50 group-hover:border-blue-100" /> : <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center group-hover:bg-blue-50"><User size={40} className="text-slate-400 group-hover:text-blue-400" /></div>}<span className="text-xl font-bold text-center px-2">{func.full_name}</span></button>)})}</div>
        </div>
      )}
      {usuarioAtual && (
        <div className="w-full max-w-3xl pb-20"><div className="bg-blue-600 text-white p-6 rounded-t-3xl shadow-lg flex items-center justify-between sticky top-0 z-10"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">{usuarioAtual.full_name.charAt(0)}</div><div><h2 className="text-xl font-bold">{usuarioAtual.full_name}</h2><p className="text-blue-100 text-sm">Operando: {lojaAtual.name}</p></div></div><button onClick={voltarParaFuncionarios} className="bg-white/10 hover:bg-white/20 py-2 px-4 rounded-lg text-sm transition-colors">Voltar</button></div>
          <div className="bg-white rounded-b-3xl shadow-lg p-4 min-h-[500px]">{loading ? <div className="text-center py-10 text-slate-400">Carregando...</div> : tarefas.length === 0 ? <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200"><p className="text-slate-500 font-medium">Tudo limpo por hoje!</p></div> : (<div className="space-y-4">{tarefas.map((tarefa) => { const isCompleted = tarefa.status === 'COMPLETED'; const isPostponed = tarefa.status === 'POSTPONED'; const isCanceled = tarefa.status === 'CANCELED'; let cardClass = "border-slate-100 bg-white"; if (isCompleted) cardClass = "border-green-200 bg-green-50 opacity-75"; if (isPostponed) cardClass = "border-amber-200 bg-amber-50"; if (isCanceled) cardClass = "border-red-200 bg-red-50 opacity-60"; return (<div key={tarefa.id} className={`p-4 rounded-xl border-2 transition-all ${cardClass}`}><div className="mb-4"><h4 className={`text-lg font-bold flex items-center gap-2 ${isCompleted || isCanceled ? 'line-through text-slate-400' : 'text-slate-700'}`}>{tarefa.template?.title}{isPostponed && <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full">Adiado</span>}{isCanceled && <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full">Cancelado</span>}</h4><p className="text-sm text-slate-500 mb-1">{tarefa.template?.description}</p>{isPostponed && tarefa.postponed_to && <p className="text-xs text-amber-700 mt-1">Nova data: {new Date(tarefa.postponed_to).toLocaleDateString('pt-BR')}</p>}{isCanceled && tarefa.cancellation_reason && <p className="text-xs text-red-700 mt-1">Motivo: {tarefa.cancellation_reason}</p>}</div>{!isCanceled && (<div className="flex gap-2 flex-wrap"><button onClick={(e) => handleConcluir(e, tarefa)} className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-bold transition-colors ${isCompleted ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-slate-100 text-slate-600 hover:bg-green-100 hover:text-green-700'}`}><CheckCircle size={18} /> {isCompleted ? "Feito" : "Concluir"}</button>{!isCompleted && <button onClick={(e) => abrirModalAdiar(e, tarefa)} className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-bold bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700 transition-colors"><Clock size={18} /> Adiar</button>}{!isCompleted && <button onClick={(e) => abrirModalCancelar(e, tarefa)} className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-bold bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-700 transition-colors"><XCircle size={18} /> Cancelar</button>}</div>)}</div>); })}</div>)}</div></div>
      )}
    </div>
  );
}