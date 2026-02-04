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

  // --- IMPORTAÇÃO CSV (ESTADOS) ---
  const [modalImportarOpen, setModalImportarOpen] = useState(false);
  const [importando, setImportando] = useState(false);
  const [logImportacao, setLogImportacao] = useState([]);

  // ADMIN: RELATÓRIOS
  const [filtroLojaRelatorio, setFiltroLojaRelatorio] = useState("");
  const [dadosRelatorio, setDadosRelatorio] = useState(null);
  const [statusContagem, setStatusContagem] = useState(null); 
  const [eficienciaPorCargo, setEficienciaPorCargo] = useState([]); 
  
  // --- ESTADOS AUXILIARES (RESTAURADOS) ---
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

  // --- FUNÇÕES DE IMPORTAÇÃO E DOWNLOAD ---
  function baixarExemploCSV() {
    const cabecalho = "titulo,descricao,frequencia,loja,cargo,horario_limite,exige_foto\n";
    const exemplo = "Limpeza de Forno,Realizar limpeza interna do forno com produto X,daily,Unidade Centro,Cozinheiro,22:00,true";
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

  async function processarImportacaoCSV(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    setImportando(true);
    setLogImportacao(["Processando arquivo..."]);
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
        else { novosLogs.push(`✅ Sucesso: ${dadosParaInserir.length} tarefas importadas.`); buscarLojas(); }
      } else { novosLogs.push("⚠️ Nenhuma linha válida encontrada."); }
      setLogImportacao(novosLogs); setImportando(false);
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

  // FUNÇÕES AUXILIARES ADMIN
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
  async function abrirAdminTarefas() {
    setAdminScreen('tarefas'); setListaTemplates([]); setFiltroLojaTemplate(""); setFiltroRoleTemplate("");
  }
  async function buscarTemplatesFiltrados(lojaId, roleId) {
    if (!lojaId) return;
    let q = supabase.from("task_templates").select(`*, stores(name), roles(name)`).eq("store_id", lojaId).order("created_at", { ascending: false });
    if (roleId) q = q.eq("role_id", roleId);
    const { data, error } = await q;
    if (error) alert(error.message); else setListaTemplates(data || []);
  }

  // --- RENDERIZAÇÃO ADMIN ---
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
              <button onClick={() => setAdminScreen('colaboradores')} className="bg-slate-700 p-8 rounded-xl hover:bg-blue-600 border border-slate-600 flex flex-col items-center gap-4"><User size={40} /> Colaboradores</button>
              <button onClick={abrirAdminTarefas} className="bg-slate-700 p-8 rounded-xl hover:bg-purple-600 border border-slate-600 flex flex-col items-center gap-4"><ListChecks size={40} /> Tarefas</button>
              <button onClick={() => setAdminScreen('relatorios')} className="bg-slate-700 p-8 rounded-xl hover:bg-teal-600 border border-slate-600 flex flex-col items-center gap-4"><BarChart3 size={40} /> Relatórios</button>
            </div>
          )}

          {adminScreen === 'tarefas' && (
            <div className="animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <button onClick={() => setAdminScreen('menu')} className="flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft /> Voltar ao Menu</button>
                <div className="flex gap-4">
                  <button onClick={() => setModalImportarOpen(true)} className="bg-slate-600 px-4 py-2 rounded font-bold hover:bg-slate-500 flex items-center gap-2 shadow-lg"><FileUp size={20} /> Importar CSV</button>
                  <button onClick={() => setModalNovaTarefaOpen(true)} className="bg-purple-600 px-4 py-2 rounded font-bold hover:bg-purple-500 flex items-center gap-2 shadow-lg"><Plus size={20} /> Nova Tarefa</button>
                </div>
              </div>
              <div className="bg-slate-700 p-4 rounded-xl mb-6 border border-slate-600">
                <label className="text-xs text-slate-400 mb-1 block">Filtrar por Loja</label>
                <select className="w-full p-2 rounded bg-slate-800 border-slate-500 text-white" value={filtroLojaTemplate} onChange={(e) => { setFiltroLojaTemplate(e.target.value); buscarTemplatesFiltrados(e.target.value, filtroRoleTemplate); }}>
                  <option value="">Selecione...</option>
                  {lojas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="grid gap-3">
                {listaTemplates.map(task => (
                  <div key={task.id} className={`p-4 rounded-lg flex justify-between items-center ${task.active ? 'bg-white text-slate-800' : 'bg-slate-300 text-slate-500'}`}>
                    <div><span className="font-bold block">{task.title}</span><span className="text-xs">{task.roles?.name}</span></div>
                    <button className="text-blue-600 hover:bg-blue-50 p-2 rounded-full"><Pencil size={20}/></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MODAL IMPORTAR CSV */}
          {modalImportarOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg text-slate-800">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2"><FileUp className="text-blue-600"/> Importar Tarefas</h3>
                  <button onClick={() => {setModalImportarOpen(false); setLogImportacao([]);}} className="text-slate-400"><X /></button>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
                  <p className="text-sm font-bold text-blue-800 mb-2">Instruções:</p>
                  <p className="text-xs text-blue-700 mb-4">O arquivo deve conter os nomes exatos das Lojas e Cargos já cadastrados no sistema.</p>
                  <button onClick={baixarExemploCSV} className="flex items-center gap-2 text-xs bg-blue-600 text-white px-3 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"><Download size={14} /> Baixar Modelo CSV</button>
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
        </div>
      </div>
    );
  }

  // --- RENDERIZAÇÃO QUIOSQUE ---
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-8 px-4 font-sans text-slate-800">
      {!lojaAtual && (<button onClick={entrarNoAdmin} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 z-50"><Settings size={24} /></button>)}
      
      {!lojaAtual && (
        <div className="w-full max-w-4xl animate-fade-in"><h1 className="text-3xl font-bold text-center mb-8">Selecione a Unidade</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">{lojas.filter(l => l.active).map((loja) => { 
            const qtd = contagemLojas[loja.id] || 0; 
            return (<button key={loja.id} onClick={() => selecionarLoja(loja)} className="relative bg-white p-8 rounded-2xl shadow-lg flex flex-col items-center gap-4 border border-slate-200">
              {qtd > 0 && <div className="absolute -top-3 -right-3 bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-md border-4 border-slate-100 text-lg">{qtd}</div>}
              <div className="bg-blue-100 p-4 rounded-full"><Store size={48} className="text-blue-600" /></div><span className="text-2xl font-bold">{loja.name}</span>
            </button>)})}
          </div>
        </div>
      )}

      {lojaAtual && !usuarioAtual && (
        <div className="w-full max-w-5xl"><button onClick={voltarParaLojas} className="mb-6 flex items-center gap-2 text-slate-500 font-medium"><ArrowLeft /> Trocar de Loja</button>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">{funcionarios.filter(f => f.active).map((func) => { 
            const qtd = contagemCargos[func.role_id] || 0; 
            return (<button key={func.id} onClick={() => selecionarUsuario(func)} className="relative aspect-square bg-white rounded-3xl shadow-md flex flex-col items-center justify-center gap-4 border border-slate-100 group">
              {qtd > 0 && <div className="absolute -top-3 -right-3 bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-slate-100 text-lg z-10">{qtd}</div>}
              <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center"><User size={40} className="text-slate-400" /></div><span className="text-xl font-bold text-center px-2">{func.full_name}</span>
            </button>)})}
          </div>
        </div>
      )}

      {usuarioAtual && (
        <div className="w-full max-w-3xl pb-20">
          <div className="bg-blue-600 text-white p-6 rounded-t-3xl shadow-lg flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-4"><div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">{usuarioAtual.full_name.charAt(0)}</div><div><h2 className="text-xl font-bold">{usuarioAtual.full_name}</h2><p className="text-blue-100 text-sm">{lojaAtual.name}</p></div></div>
            <button onClick={voltarParaFuncionarios} className="bg-white/10 hover:bg-white/20 py-2 px-4 rounded-lg text-sm">Voltar</button>
          </div>
          <div className="bg-white rounded-b-3xl shadow-lg p-4 min-h-[500px]">
            {loading ? <div className="text-center py-10">Carregando...</div> : tarefas.length === 0 ? <p className="text-center py-10 text-slate-400">Tudo em dia!</p> : (
              <div className="space-y-4">{tarefas.map(t => (
                <div key={t.id} className={`p-4 rounded-xl border-2 flex justify-between items-center ${t.status === 'COMPLETED' ? 'bg-green-50 border-green-200 opacity-75' : 'bg-white border-slate-100'}`}>
                  <div><h4 className={`text-lg font-bold ${t.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{t.template?.title}</h4><p className="text-sm text-slate-500">{t.template?.description}</p></div>
                  <button onClick={(e) => handleConcluir(e, t)} className={`p-3 rounded-full transition-colors ${t.status === 'COMPLETED' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-green-100'}`}><CheckCircle size={24}/></button>
                </div>
              ))}</div>
            )}
          </div>
        </div>
      )}

      {/* MODAIS ADIAR/CANCELAR */}
      {modalAdiarOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl p-6 w-full max-w-md"><h3 className="font-bold text-slate-800 mb-4 text-xl">Adiar Tarefa</h3><input type="datetime-local" className="w-full border-2 border-slate-200 rounded-lg p-3 mb-6" value={novaDataPrazo} onChange={(e) => setNovaDataPrazo(e.target.value)} /><div className="flex gap-3"><button onClick={() => setModalAdiarOpen(false)} className="flex-1 py-3 text-slate-500 font-bold">Voltar</button><button onClick={confirmarAdiamento} className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-lg shadow-md hover:bg-amber-600">Confirmar</button></div></div></div>)}
      {modalCancelarOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl p-6 w-full max-w-md"><h3 className="font-bold text-slate-800 mb-4 text-xl">Cancelar Tarefa</h3><textarea className="w-full border-2 border-slate-200 rounded-lg p-3 mb-6 min-h-[100px]" placeholder="Motivo..." value={justificativa} onChange={(e) => setJustificativa(e.target.value)} /><div className="flex gap-3"><button onClick={() => setModalCancelarOpen(false)} className="flex-1 py-3 text-slate-500 font-bold">Voltar</button><button onClick={confirmarCancelamento} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-lg shadow-md hover:bg-red-600">Confirmar</button></div></div></div>)}
    </div>
  );
}