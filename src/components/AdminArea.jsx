import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { 
  Store, User, ArrowLeft, Settings, Plus, Pencil, Save, 
  ToggleLeft, ToggleRight, Briefcase, ListChecks, Filter, 
  PlayCircle, BarChart3, TrendingUp, FileUp, Download, ShieldCheck, X,
  Layers, Trash2, Clock, Calendar
} from "lucide-react";

export default function AdminArea({ onExit }) {
  const [screen, setScreen] = useState('menu'); 
  
  // --- ESTADOS GERAIS DE DADOS ---
  const [lojas, setLojas] = useState([]);
  const [roles, setRoles] = useState([]);
  
  // --- ESTADOS: LOJAS ---
  const [novaLojaNome, setNovaLojaNome] = useState("");
  const [modalEditarLojaOpen, setModalEditarLojaOpen] = useState(false);
  const [lojaEmEdicao, setLojaEmEdicao] = useState(null);
  const [editLojaData, setEditLojaData] = useState({ name: "", shortName: "", code: "" });

  // --- ESTADOS: CARGOS ---
  const [novoCargoNome, setNovoCargoNome] = useState("");
  const [novoCargoNivel, setNovoCargoNivel] = useState("");
  const [modalEditarCargoOpen, setModalEditarCargoOpen] = useState(false);
  const [cargoEmEdicao, setCargoEmEdicao] = useState(null);
  const [editCargoData, setEditCargoData] = useState({ name: "", level: "" });

  // --- ESTADOS: COLABORADORES ---
  const [listaFuncionarios, setListaFuncionarios] = useState([]);
  const [filtroLoja, setFiltroLoja] = useState("");
  const [filtroCargo, setFiltroCargo] = useState("");
  const [filtroGestor, setFiltroGestor] = useState("");
  const [modalNovoColabOpen, setModalNovoColabOpen] = useState(false);
  const [modalEditarColabOpen, setModalEditarColabOpen] = useState(false);
  const [novoColab, setNovoColab] = useState({ nome: "", loja: "", cargo: "", gestor: "" });
  const [editColab, setEditColab] = useState({ id: null, nome: "", loja: "", cargo: "", gestor: "" });
  const [listaGestores, setListaGestores] = useState([]);

  // --- ESTADOS: TAREFAS ---
  const [listaTemplates, setListaTemplates] = useState([]);
  const [filtroLojaTarefa, setFiltroLojaTarefa] = useState("");
  const [filtroCargoTarefa, setFiltroCargoTarefa] = useState("");
  const [cargosFiltroDisponiveis, setCargosFiltroDisponiveis] = useState([]);

  const [modalNovaTarefaOpen, setModalNovaTarefaOpen] = useState(false);
  const [modalEditarTarefaOpen, setModalEditarTarefaOpen] = useState(false);
  const [novaTarefa, setNovaTarefa] = useState({ titulo: "", desc: "", freq: "daily", loja: "", cargo: "", hora: "", foto: false, diaSemana: "", diaMes: "" });
  const [editTarefa, setEditTarefa] = useState(null);
  const [cargosDisponiveis, setCargosDisponiveis] = useState([]); 
  
  const [gerandoRotina, setGerandoRotina] = useState(false);
  
  // --- ESTADOS: ROTINAS (GRUPOS) ---
  const [listaRotinas, setListaRotinas] = useState([]);
  const [filtroLojaRotina, setFiltroLojaRotina] = useState("");
  const [modalNovaRotinaOpen, setModalNovaRotinaOpen] = useState(false);
  const [modalEditarRotinaOpen, setModalEditarRotinaOpen] = useState(false);
  
  // Form Rotina
  const [novaRotina, setNovaRotina] = useState({ 
    store_id: "", title: "", description: "", start_time: "", deadline_time: "", icon: "sun" 
  });
  const [editRotina, setEditRotina] = useState(null); // Objeto da rotina sendo editada
  
  // Itens da Rotina (Tarefas selecionadas no modal)
  const [tarefasParaRotina, setTarefasParaRotina] = useState([]); // Lista de TODAS tarefas da loja
  const [itensSelecionados, setItensSelecionados] = useState([]); // Tarefas JÁ adicionadas à rotina atual
  const [tarefaSelecionadaId, setTarefaSelecionadaId] = useState(""); // ID do select

  // Importação CSV
  const [modalImportarOpen, setModalImportarOpen] = useState(false);
  const [importando, setImportando] = useState(false);
  const [logImportacao, setLogImportacao] = useState([]);

  // --- ESTADOS: RELATÓRIOS ---
  const [dadosRelatorio, setDadosRelatorio] = useState(null);
  const [filtroLojaRelatorio, setFiltroLojaRelatorio] = useState("");
  const [statusContagem, setStatusContagem] = useState(null);
  const [eficienciaPorCargo, setEficienciaPorCargo] = useState([]);

  // --- CARGA INICIAL ---
  useEffect(() => {
    buscarDadosBasicos();
  }, []);

  async function buscarDadosBasicos() {
    const { data: l } = await supabase.from("stores").select("*").order('name');
    const { data: r } = await supabase.from("roles").select("*").order('access_level');
    setLojas(l || []);
    setRoles(r || []);
  }

  // ... [LÓGICA DE LOJAS MANTIDA] ...
  async function criarLoja() {
    if (!novaLojaNome) return alert("Digite o nome da loja");
    const { error } = await supabase.from("stores").insert({ name: novaLojaNome, timezone: 'America/Sao_Paulo', active: true });
    if (error) alert("Erro: " + error.message); else { setNovaLojaNome(""); buscarDadosBasicos(); }
  }
  async function toggleStatusLoja(loja) {
    const { error } = await supabase.from("stores").update({ active: !loja.active }).eq("id", loja.id);
    if (error) alert("Erro: " + error.message); else buscarDadosBasicos();
  }
  function abrirModalEditarLoja(loja) {
    setLojaEmEdicao(loja);
    setEditLojaData({ name: loja.name || "", shortName: loja.shortName || "", code: loja.InternalCode || "" });
    setModalEditarLojaOpen(true);
  }
  async function salvarEdicaoLoja() {
    if (!editLojaData.name) return alert("Nome obrigatório");
    const { error } = await supabase.from("stores").update({ 
      name: editLojaData.name, shortName: editLojaData.shortName, InternalCode: editLojaData.code 
    }).eq("id", lojaEmEdicao.id);
    if (error) alert(error.message); else { setModalEditarLojaOpen(false); buscarDadosBasicos(); }
  }

  // ... [LÓGICA DE CARGOS MANTIDA] ...
  async function criarCargo() {
    if (!novoCargoNome || !novoCargoNivel) return alert("Preencha Nome e Nível");
    const slugAuto = novoCargoNome.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const { error } = await supabase.from("roles").insert({ name: novoCargoNome, slug: slugAuto, access_level: parseInt(novoCargoNivel), active: true });
    if (error) alert(error.message); else { setNovoCargoNome(""); setNovoCargoNivel(""); buscarDadosBasicos(); }
  }
  async function toggleStatusCargo(cargo) {
    const { error } = await supabase.from("roles").update({ active: !cargo.active }).eq("id", cargo.id);
    if (error) alert(error.message); else buscarDadosBasicos();
  }
  function abrirModalEditarCargo(cargo) {
    setCargoEmEdicao(cargo);
    setEditCargoData({ name: cargo.name || "", level: cargo.access_level || "" });
    setModalEditarCargoOpen(true);
  }
  async function salvarEdicaoCargo() {
    if (!editCargoData.name || !editCargoData.level) return alert("Campos obrigatórios");
    const { error } = await supabase.from("roles").update({ name: editCargoData.name, access_level: parseInt(editCargoData.level) }).eq("id", cargoEmEdicao.id);
    if (error) alert(error.message); else { setModalEditarCargoOpen(false); buscarDadosBasicos(); }
  }

  // ... [LÓGICA DE COLABORADORES MANTIDA] ...
  async function buscarColaboradores() {
    let q = supabase.from("employee").select(`*, stores(name), roles(name), manager:manager_id(full_name)`).order('full_name');
    if (filtroLoja) q = q.eq('store_id', filtroLoja);
    if (filtroCargo) q = q.eq('role_id', filtroCargo);
    if (filtroGestor) q = q.eq('manager_id', filtroGestor);
    const { data, error } = await q;
    if (error) alert(error.message); else setListaFuncionarios(data || []);
  }
  useEffect(() => { if (screen === 'colaboradores') buscarColaboradores(); }, [screen, filtroLoja, filtroCargo, filtroGestor]);

  async function carregarGestores(lojaId) {
    if (!lojaId) { setListaGestores([]); return; }
    const { data } = await supabase.from("employee").select("id, full_name").eq("store_id", lojaId).eq("active", true);
    setListaGestores(data || []);
  }
  async function salvarNovoColaborador() {
    if (!novoColab.nome || !novoColab.loja || !novoColab.cargo) return alert("Preencha campos obrigatórios");
    const { error } = await supabase.from("employee").insert({ 
      full_name: novoColab.nome, store_id: novoColab.loja, role_id: novoColab.cargo, manager_id: novoColab.gestor || null, active: true 
    });
    if (error) alert(error.message); else { setModalNovoColabOpen(false); buscarColaboradores(); }
  }
  async function salvarEdicaoColaborador() {
    const { error } = await supabase.from("employee").update({ 
      full_name: editColab.nome, store_id: editColab.loja, role_id: editColab.cargo, manager_id: editColab.gestor || null 
    }).eq("id", editColab.id);
    if (error) alert(error.message); else { setModalEditarColabOpen(false); buscarColaboradores(); }
  }
  async function toggleStatusColaborador(func) {
    await supabase.from("employee").update({ active: !func.active }).eq("id", func.id);
    buscarColaboradores();
  }

  // ... [LÓGICA DE TAREFAS MANTIDA] ...
  async function carregarCargosDoFiltro(lojaId) {
    setFiltroCargoTarefa(""); 
    if (!lojaId) { setCargosFiltroDisponiveis([]); return; }
    const { data: emps } = await supabase.from("employee").select("role_id").eq("store_id", lojaId).eq("active", true);
    const rIds = [...new Set(emps?.map(e => e.role_id) || [])];
    if (rIds.length > 0) {
      const rolesFiltrados = roles.filter(r => rIds.includes(r.id) && r.active);
      setCargosFiltroDisponiveis(rolesFiltrados);
    } else {
      setCargosFiltroDisponiveis([]);
    }
  }
  async function buscarTarefas() {
    if (!filtroLojaTarefa) { setListaTemplates([]); return; }
    let q = supabase.from("task_templates").select(`*, stores(name), roles(name)`).eq("store_id", filtroLojaTarefa).order("created_at", { ascending: false });
    if (filtroCargoTarefa && filtroCargoTarefa !== "") q = q.eq("role_id", filtroCargoTarefa);
    const { data, error } = await q;
    if (error) alert(error.message); else setListaTemplates(data || []);
  }
  useEffect(() => { if (screen === 'tarefas') buscarTarefas(); }, [filtroLojaTarefa, filtroCargoTarefa]);

  async function carregarCargosParaModal(lojaId) {
    if (!lojaId) { setCargosDisponiveis([]); return; }
    const { data: emps } = await supabase.from("employee").select("role_id").eq("store_id", lojaId).eq("active", true);
    const rIds = [...new Set(emps?.map(e => e.role_id) || [])];
    if (rIds.length > 0) {
      const rolesFiltrados = roles.filter(r => rIds.includes(r.id) && r.active);
      setCargosDisponiveis(rolesFiltrados);
    } else {
      setCargosDisponiveis([]);
    }
  }
  async function salvarNovaTarefa() {
    if (!novaTarefa.titulo || !novaTarefa.loja || !novaTarefa.cargo) return alert("Preencha os campos obrigatórios");
    if (novaTarefa.freq === 'weekly' && !novaTarefa.diaSemana) return alert("Selecione o dia da semana");
    if (novaTarefa.freq === 'monthly' && !novaTarefa.diaMes) return alert("Selecione o dia do mês");
    const { error } = await supabase.from("task_templates").insert({
        title: novaTarefa.titulo, description: novaTarefa.desc, frequency_type: novaTarefa.freq,
        store_id: novaTarefa.loja, role_id: novaTarefa.cargo, due_time: novaTarefa.hora || null,
        requires_photo_evidence: novaTarefa.foto, 
        specific_day_of_week: novaTarefa.freq === 'weekly' ? parseInt(novaTarefa.diaSemana) : null,
        specific_day_of_month: novaTarefa.freq === 'monthly' ? parseInt(novaTarefa.diaMes) : null,
        active: true
    });
    if (error) alert(error.message); else { setModalNovaTarefaOpen(false); buscarTarefas(); }
  }
  async function salvarEdicaoTarefa() {
    if (editTarefa.frequency_type === 'weekly' && !editTarefa.specific_day_of_week) return alert("Selecione o dia da semana");
    if (editTarefa.frequency_type === 'monthly' && !editTarefa.specific_day_of_month) return alert("Selecione o dia do mês");
    const { error } = await supabase.from("task_templates").update({
      title: editTarefa.title, description: editTarefa.description, frequency_type: editTarefa.frequency_type,
      store_id: editTarefa.store_id, role_id: editTarefa.role_id, 
      due_time: editTarefa.due_time || null, requires_photo_evidence: editTarefa.requires_photo_evidence,
      specific_day_of_week: editTarefa.frequency_type === 'weekly' ? parseInt(editTarefa.specific_day_of_week) : null,
      specific_day_of_month: editTarefa.frequency_type === 'monthly' ? parseInt(editTarefa.specific_day_of_month) : null
    }).eq("id", editTarefa.id);
    if(error) alert(error.message); else { setModalEditarTarefaOpen(false); buscarTarefas(); }
  }
  async function toggleStatusTarefa(task) {
    await supabase.from("task_templates").update({ active: !task.active }).eq("id", task.id);
    buscarTarefas();
  }
  async function gerarRotina() {
    setGerandoRotina(true);
    const { error } = await supabase.rpc('generate_daily_checklist');
    setGerandoRotina(false);
    if (error) alert(error.message); else alert("Rotina do dia gerada com sucesso!");
  }

  // ==========================
  // LÓGICA DE ROTINAS (GRUPOS) - NOVA!
  // ==========================

  async function buscarRotinas() {
    if (!filtroLojaRotina) { setListaRotinas([]); return; }
    // Busca as rotinas e conta quantos itens tem em cada
    const { data, error } = await supabase
      .from('routine_templates')
      .select(`*, routine_items(count)`)
      .eq('store_id', filtroLojaRotina)
      .order('created_at', { ascending: false });
      
    if (error) alert(error.message);
    else setListaRotinas(data || []);
  }
  
  // Recarrega rotinas ao mudar o filtro
  useEffect(() => { if (screen === 'rotinas') buscarRotinas(); }, [filtroLojaRotina]);

  // Carrega as tarefas da loja para preencher o select do Modal
  async function carregarTarefasParaRotina(storeId) {
    if(!storeId) { setTarefasParaRotina([]); return; }
    const { data } = await supabase
        .from('task_templates')
        .select(`id, title, role:roles(name)`)
        .eq('store_id', storeId)
        .eq('active', true)
        .order('title');
    setTarefasParaRotina(data || []);
  }

  // Adiciona tarefa na lista temporária do Modal
  function adicionarItemNaRotina() {
    if (!tarefaSelecionadaId) return;
    const task = tarefasParaRotina.find(t => t.id === tarefaSelecionadaId);
    if (!task) return;
    
    // Evita duplicados
    if (itensSelecionados.some(i => i.task_template_id === task.id)) return;

    setItensSelecionados([...itensSelecionados, {
        task_template_id: task.id,
        title: task.title,
        role_name: task.role?.name
    }]);
    setTarefaSelecionadaId("");
  }

  function removerItemDaRotina(index) {
    const novaLista = [...itensSelecionados];
    novaLista.splice(index, 1);
    setItensSelecionados(novaLista);
  }

  async function salvarNovaRotina() {
    if (!novaRotina.store_id || !novaRotina.title) return alert("Loja e Título são obrigatórios");
    
    // 1. Cria o Header da Rotina
    const { data: rotinaCriada, error: errRotina } = await supabase
        .from('routine_templates')
        .insert({
            store_id: novaRotina.store_id,
            title: novaRotina.title,
            description: novaRotina.description,
            start_time: novaRotina.start_time || null,
            deadline_time: novaRotina.deadline_time || null,
            icon: novaRotina.icon
        })
        .select()
        .single();

    if (errRotina) return alert("Erro ao criar rotina: " + errRotina.message);

    // 2. Insere os Itens
    if (itensSelecionados.length > 0) {
        const itensPayload = itensSelecionados.map((item, idx) => ({
            routine_id: rotinaCriada.id,
            task_template_id: item.task_template_id,
            order_index: idx
        }));
        
        const { error: errItens } = await supabase.from('routine_items').insert(itensPayload);
        if (errItens) alert("Rotina criada, mas erro ao inserir itens: " + errItens.message);
    }

    setModalNovaRotinaOpen(false);
    buscarRotinas();
    // Reset
    setNovaRotina({ store_id: "", title: "", description: "", start_time: "", deadline_time: "", icon: "sun" });
    setItensSelecionados([]);
  }

  async function toggleStatusRotina(rotina) {
    await supabase.from('routine_templates').update({ active: !rotina.active }).eq('id', rotina.id);
    buscarRotinas();
  }
  
  // Prepara modal de edição
  async function abrirEdicaoRotina(rotina) {
    setEditRotina(rotina);
    // Carrega itens existentes
    const { data: itens } = await supabase
        .from('routine_items')
        .select('*, task:task_templates(title, role:roles(name))')
        .eq('routine_id', rotina.id)
        .order('order_index');
        
    const itensFormatados = itens.map(i => ({
        task_template_id: i.task_template_id,
        title: i.task?.title,
        role_name: i.task?.role?.name
    }));
    
    setItensSelecionados(itensFormatados);
    await carregarTarefasParaRotina(rotina.store_id);
    setModalEditarRotinaOpen(true);
  }

  async function salvarEdicaoRotina() {
    // 1. Atualiza Header
    const { error: errHeader } = await supabase.from('routine_templates').update({
        title: editRotina.title,
        description: editRotina.description,
        start_time: editRotina.start_time || null,
        deadline_time: editRotina.deadline_time || null,
        icon: editRotina.icon
    }).eq('id', editRotina.id);
    
    if (errHeader) return alert(errHeader.message);

    // 2. Atualiza Itens (Estratégia: Delete All + Insert All para simplificar reordenação)
    await supabase.from('routine_items').delete().eq('routine_id', editRotina.id);

    if (itensSelecionados.length > 0) {
        const itensPayload = itensSelecionados.map((item, idx) => ({
            routine_id: editRotina.id,
            task_template_id: item.task_template_id,
            order_index: idx
        }));
        await supabase.from('routine_items').insert(itensPayload);
    }

    setModalEditarRotinaOpen(false);
    buscarRotinas();
  }


  // --- IMPORTAÇÃO CSV (MANTIDA) ---
  function baixarExemploCSV() {
    const cabecalho = "titulo,descricao,frequencia,loja,cargo,horario_limite,exige_foto,dia_semana_num,dia_mes_num\n";
    const exemplo = "Limpeza Geral,Limpar bancadas,weekly,Minha Loja,Gerente,10:00,true,1,\n"; 
    const blob = new Blob([cabecalho + exemplo], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "modelo_tarefas.csv";
    link.click();
  }
  async function processarImportacaoCSV(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    setImportando(true);
    setLogImportacao(["Lendo arquivo..."]);
    const leitor = new FileReader();
    leitor.onload = async (event) => {
      const texto = event.target.result;
      const linhas = texto.split(/\r?\n/).filter(l => l.trim() !== "");
      const dadosParaInserir = [];
      const logs = [];
      const mapaLojas = Object.fromEntries(lojas.map(l => [l.name.toLowerCase().trim(), l.id]));
      const mapaCargos = Object.fromEntries(roles.map(r => [r.name.toLowerCase().trim(), r.id]));
      for (let i = 1; i < linhas.length; i++) {
        const col = linhas[i].split(",");
        if (col.length < 5) continue;
        const [titulo, desc, freq, nomeLoja, nomeCargo, hora, foto, diaSem, diaMes] = col.map(c => c?.trim());
        const store_id = mapaLojas[nomeLoja?.toLowerCase()];
        const role_id = mapaCargos[nomeCargo?.toLowerCase()];
        if (!store_id || !role_id) { logs.push(`Erro linha ${i + 1}: Loja/Cargo não encontrados.`); continue; }
        dadosParaInserir.push({
          title: titulo, description: desc, frequency_type: freq || 'daily',
          store_id, role_id, due_time: hora || null, requires_photo_evidence: foto === 'true', active: true,
          specific_day_of_week: diaSem ? parseInt(diaSem) : null,
          specific_day_of_month: diaMes ? parseInt(diaMes) : null
        });
      }
      if (dadosParaInserir.length > 0) {
        const { error } = await supabase.from("task_templates").insert(dadosParaInserir);
        if (error) logs.push("Erro ao inserir: " + error.message);
        else logs.push(`Sucesso: ${dadosParaInserir.length} importados.`);
      }
      setLogImportacao(logs);
      setImportando(false);
      buscarTarefas();
    };
    leitor.readAsText(arquivo);
  }

  // --- RELATÓRIOS (MANTIDO) ---
  async function buscarDashboard(lojaId) {
    if (!lojaId) { setDadosRelatorio(null); return; }
    const hoje = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from("checklist_items").select(`*, template:task_templates!inner(role_id, roles(name))`).eq("store_id", lojaId).eq("scheduled_date", hoje);
    setDadosRelatorio(data || []);
    const counts = { TOTAL: data.length, COMPLETED: 0, WAITING_APPROVAL: 0, RETURNED: 0, PENDING: 0, CANCELED: 0 };
    const efficiencyMap = {};
    data.forEach(i => {
        if (counts[i.status] !== undefined) counts[i.status]++;
        const rName = i.template?.roles?.name || 'Geral';
        const rId = i.template?.role_id;
        if (!efficiencyMap[rId]) efficiencyMap[rId] = { roleName: rName, total: 0, completed: 0 };
        efficiencyMap[rId].total++;
        if (i.status === 'COMPLETED') efficiencyMap[rId].completed++;
    });
    const executaveis = counts.TOTAL - counts.CANCELED;
    counts.PERCENT_COMPLETED = executaveis > 0 ? (counts.COMPLETED / executaveis) * 100 : 0;
    setStatusContagem(counts);
    const effArray = Object.values(efficiencyMap).map(d => ({...d, percent: (d.completed/d.total)*100})).sort((a,b) => b.percent - a.percent);
    setEficienciaPorCargo(effArray);
  }

  const mapaDiasSemana = {
    1: "Todas as segundas-feiras", 2: "Todas as terças-feiras", 3: "Todas as quartas-feiras",
    4: "Todas as quintas-feiras", 5: "Todas as sextas-feiras", 6: "Todos os sábados", 7: "Todos os domingos"
  };

  return (
    <div className="p-8 text-white bg-slate-800 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between mb-8 border-b border-slate-700 pb-4">
          <h1 className="text-3xl font-bold flex gap-2"><Settings/> Administração</h1>
          <button onClick={onExit} className="text-slate-400 hover:text-white underline">Sair</button>
        </div>

        {/* MENU PRINCIPAL (Adicionado botão Rotinas) */}
        {screen === 'menu' && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
            <button onClick={() => setScreen('lojas')} className="bg-slate-700 p-8 rounded-xl hover:bg-blue-600 border border-slate-600 flex flex-col items-center gap-4 transition-all shadow-lg"><Store size={40}/> Lojas</button>
            <button onClick={() => setScreen('cargos')} className="bg-slate-700 p-8 rounded-xl hover:bg-blue-600 border border-slate-600 flex flex-col items-center gap-4 transition-all shadow-lg"><Briefcase size={40}/> Cargos</button>
            <button onClick={() => { setScreen('colaboradores'); buscarColaboradores(); }} className="bg-slate-700 p-8 rounded-xl hover:bg-blue-600 border border-slate-600 flex flex-col items-center gap-4 transition-all shadow-lg"><User size={40}/> Colaboradores</button>
            <button onClick={() => setScreen('tarefas')} className="bg-slate-700 p-8 rounded-xl hover:bg-purple-600 border border-slate-600 flex flex-col items-center gap-4 transition-all shadow-lg"><ListChecks size={40}/> Tarefas</button>
            <button onClick={() => setScreen('rotinas')} className="bg-slate-700 p-8 rounded-xl hover:bg-amber-600 border border-slate-600 flex flex-col items-center gap-4 transition-all shadow-lg"><Layers size={40}/> Rotinas</button>
            <button onClick={() => setScreen('relatorios')} className="bg-slate-700 p-8 rounded-xl hover:bg-teal-600 border border-slate-600 flex flex-col items-center gap-4 transition-all shadow-lg"><BarChart3 size={40}/> Relatórios</button>
          </div>
        )}

        {/* --- TELAS EXISTENTES (LOJA, CARGO, COLABORADOR) OMITIDAS PARA BREVIDADE SE NÃO ALTERADAS --- */}
        {/* Mantidas exatamente como no seu código original para 'lojas', 'cargos', 'colaboradores' */}
        
        {screen === 'lojas' && (
          <div className="animate-fade-in">
            <button onClick={() => setScreen('menu')} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft/> Voltar</button>
            <div className="bg-slate-700 p-6 rounded-xl mb-8 border border-slate-600">
              <h3 className="text-xl font-bold mb-4">Adicionar Nova Loja</h3>
              <div className="flex gap-4">
                <input type="text" placeholder="Nome da Loja" className="flex-1 p-3 rounded bg-slate-800 border border-slate-600 text-white outline-none focus:border-blue-500" value={novaLojaNome} onChange={(e) => setNovaLojaNome(e.target.value)} />
                <button onClick={criarLoja} className="bg-blue-600 px-6 py-3 rounded hover:bg-blue-50 font-bold flex items-center gap-2"><Plus size={20}/> Criar</button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {lojas.map(loja => (
                <div key={loja.id} className={`p-4 rounded-lg flex justify-between items-center border-l-8 ${loja.active ? 'bg-white text-slate-800 border-green-500' : 'bg-slate-300 text-slate-500 border-slate-500'}`}>
                  <div><span className="font-bold text-lg block">{loja.name}</span><span className="text-xs text-slate-500">Cod: {loja.InternalCode || '-'}</span></div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleStatusLoja(loja)}>{loja.active ? <ToggleRight className="text-green-600" size={30}/> : <ToggleLeft size={30}/>}</button>
                    <button onClick={() => abrirModalEditarLoja(loja)} className="text-blue-600 p-2"><Pencil size={20} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {screen === 'cargos' && (
          <div className="animate-fade-in">
            <button onClick={() => setScreen('menu')} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft/> Voltar</button>
            <div className="bg-slate-700 p-6 rounded-xl mb-8 border border-slate-600">
              <h3 className="text-xl font-bold mb-4">Adicionar Novo Cargo</h3>
              <div className="flex gap-4">
                <input type="text" placeholder="Nome" className="flex-1 p-3 rounded bg-slate-800 border border-slate-600 text-white" value={novoCargoNome} onChange={(e) => setNovoCargoNome(e.target.value)} />
                <input type="number" placeholder="Nível" className="w-32 p-3 rounded bg-slate-800 border border-slate-600 text-white" value={novoCargoNivel} onChange={(e) => setNovoCargoNivel(e.target.value)} />
                <button onClick={criarCargo} className="bg-blue-600 px-6 py-3 rounded hover:bg-blue-50 font-bold flex items-center gap-2"><Plus size={20}/> Criar</button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {roles.map(cargo => (
                <div key={cargo.id} className={`p-4 rounded-lg flex justify-between items-center border-l-8 ${cargo.active ? 'bg-white text-slate-800 border-green-500' : 'bg-slate-300 text-slate-500 border-slate-500'}`}>
                  <div><span className="font-bold text-lg block">{cargo.name}</span><span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded mr-2">Nível: {cargo.access_level}</span></div>
                  <div className="flex gap-2 items-center"><button onClick={() => toggleStatusCargo(cargo)} className="flex items-center gap-2 px-3 py-2 rounded font-bold text-sm transition-colors" style={{ backgroundColor: cargo.active ? '#dcfce7' : '#f1f5f9', color: cargo.active ? '#166534' : '#64748b' }}>{cargo.active ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}</button><button onClick={() => abrirModalEditarCargo(cargo)} className="text-blue-600 p-2"><Pencil size={20} /></button></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {screen === 'colaboradores' && (
          <div className="animate-fade-in">
            <div className="flex justify-between mb-6">
               <button onClick={() => setScreen('menu')} className="flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft/> Voltar</button>
               <button onClick={() => { setNovoColab({nome:"", loja:"", cargo:"", gestor:""}); setModalNovoColabOpen(true); }} className="bg-blue-600 px-4 py-2 rounded font-bold hover:bg-blue-500 shadow flex items-center gap-2"><Plus size={18}/> Novo</button>
            </div>
            <div className="flex flex-col md:flex-row gap-4 mb-6 bg-slate-700 p-4 rounded border border-slate-600">
                <div className="flex-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Loja</label><select className="bg-slate-800 p-2 rounded w-full border border-slate-500" value={filtroLoja} onChange={e => setFiltroLoja(e.target.value)}><option value="">Todas</option>{lojas.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                <div className="flex-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Cargo</label><select className="bg-slate-800 p-2 rounded w-full border border-slate-500" value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)}><option value="">Todos</option>{roles.filter(r => r.active).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                <div className="flex-1"><label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Gestor</label><select className="bg-slate-800 p-2 rounded w-full border border-slate-500" value={filtroGestor} onChange={e => setFiltroGestor(e.target.value)}><option value="">Todos</option>{[...new Set(listaFuncionarios.filter(f=>f.manager_id).map(f=>f.manager_id))].map(mid => { const g = listaFuncionarios.find(x => x.id === mid) || listaFuncionarios.find(x => x.manager_id === mid)?.manager; return g ? <option key={mid} value={mid}>{g.full_name}</option> : null })}</select></div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
                {listaFuncionarios.map(f => (
                    <div key={f.id} className={`p-4 rounded border-l-4 flex justify-between items-center ${f.active ? 'bg-white border-green-500 text-slate-800' : 'bg-slate-300 border-slate-500 text-slate-500'}`}>
                        <div>
                            <div className="font-bold text-lg">{f.full_name}</div>
                            <div className="text-xs uppercase font-bold text-slate-500">{f.stores?.name} • {f.roles?.name}</div>
                            {f.manager && <div className="text-xs text-blue-600 mt-1 flex gap-1 items-center bg-blue-50 px-2 py-0.5 rounded-full w-fit"><ShieldCheck size={12}/> Gestor: {f.manager.full_name}</div>}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => toggleStatusColaborador(f)}>{f.active ? <ToggleRight className="text-green-600" size={28}/> : <ToggleLeft size={28}/>}</button>
                            <button onClick={() => { 
                                setEditColab({ id: f.id, nome: f.full_name, loja: f.store_id, cargo: f.role_id, gestor: f.manager_id || "" }); 
                                carregarGestores(f.store_id); 
                                setModalEditarColabOpen(true); 
                            }} className="text-blue-600 p-2 hover:bg-blue-50 rounded-full"><Pencil size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {screen === 'tarefas' && (
            <div className="animate-fade-in">
                <div className="flex justify-between mb-6">
                    <button onClick={() => setScreen('menu')} className="flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft/> Voltar</button>
                    <div className="flex gap-2">
                        <button onClick={() => setModalImportarOpen(true)} className="bg-slate-600 px-4 py-2 rounded font-bold hover:bg-slate-50 flex gap-2 items-center"><FileUp size={18}/> Importar</button>
                        <button onClick={gerarRotina} disabled={gerandoRotina} className="bg-green-600 px-4 py-2 rounded font-bold hover:bg-green-500 flex gap-2 items-center"><PlayCircle size={18}/> {gerandoRotina ? '...' : 'Gerar'}</button>
                        <button onClick={() => { setNovaTarefa({titulo:"", desc:"", freq:"daily", loja:"", cargo:"", hora:"", foto:false}); setCargosDisponiveis([]); setModalNovaTarefaOpen(true); }} className="bg-purple-600 px-4 py-2 rounded font-bold hover:bg-purple-500 flex gap-2 items-center"><Plus size={18}/> Nova</button>
                    </div>
                </div>
                <div className="flex gap-4 mb-6 bg-slate-700 p-4 rounded border border-slate-600">
                    <div className="flex-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Loja</label>
                        <select 
                            className="bg-slate-800 p-2 rounded w-full border border-slate-500" 
                            value={filtroLojaTarefa} 
                            onChange={e => {
                                setFiltroLojaTarefa(e.target.value); 
                                carregarCargosDoFiltro(e.target.value);
                            }}
                        >
                            <option value="">Selecione a Loja...</option>
                            {lojas.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Cargo</label>
                        <select 
                            className="bg-slate-800 p-2 rounded w-full border border-slate-500 disabled:opacity-50" 
                            value={filtroCargoTarefa} 
                            onChange={e => setFiltroCargoTarefa(e.target.value)}
                            disabled={!filtroLojaTarefa}
                        >
                            <option value="">Todos Cargos</option>
                            {cargosFiltroDisponiveis.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="grid gap-3">
                    {listaTemplates.map(t => (
                        <div key={t.id} className={`p-4 rounded flex justify-between items-center ${t.active ? 'bg-white text-slate-800 border-l-4 border-green-500' : 'bg-slate-300 text-slate-500 border-l-4 border-slate-500'}`}>
                            <div>
                                <div className="font-bold flex items-center gap-2">
                                    {t.title}
                                    {t.frequency_type === 'daily' && <span className="bg-blue-100 text-blue-800 text-[9px] px-1 rounded border border-blue-300 font-bold uppercase">Todos os dias {t.due_time ? `até ${t.due_time.slice(0,5)}` : ''}</span>}
                                    {t.frequency_type === 'weekly' && <span className="bg-orange-100 text-orange-800 text-[9px] px-1 rounded border border-orange-300 font-bold uppercase">{mapaDiasSemana[t.specific_day_of_week] || "Semanal"}</span>}
                                    {t.frequency_type === 'monthly' && <span className="bg-pink-100 text-pink-800 text-[9px] px-1 rounded border border-pink-300 font-bold uppercase">Todo dia {t.specific_day_of_month}</span>}
                                </div>
                                <div className="text-xs text-slate-500">{t.description}</div>
                                <div className="flex gap-2 mt-1 text-[10px] uppercase font-bold"><span className="bg-purple-100 text-purple-700 px-1 rounded">{t.frequency_type}</span><span className="bg-blue-100 text-blue-700 px-1 rounded">{t.roles?.name}</span></div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => toggleStatusTarefa(t)}>{t.active ? <ToggleRight className="text-green-600" size={28}/> : <ToggleLeft size={28}/>}</button>
                                <button onClick={() => { 
                                    setEditTarefa(t); 
                                    carregarCargosParaModal(t.store_id); 
                                    setModalEditarTarefaOpen(true); 
                                }} className="text-blue-600 p-2 hover:bg-blue-50 rounded-full"><Pencil size={18}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* TELA DE ROTINAS (NOVA!) */}
        {screen === 'rotinas' && (
            <div className="animate-fade-in">
                <div className="flex justify-between mb-6">
                    <button onClick={() => setScreen('menu')} className="flex items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft/> Voltar</button>
                    <button onClick={() => { 
                        setNovaRotina({ store_id: "", title: "", description: "", start_time: "", deadline_time: "", icon: "sun" });
                        setItensSelecionados([]);
                        setModalNovaRotinaOpen(true); 
                    }} className="bg-amber-600 px-4 py-2 rounded font-bold hover:bg-amber-500 flex gap-2 items-center"><Plus size={18}/> Nova Rotina</button>
                </div>

                <div className="bg-slate-700 p-4 rounded border border-slate-600 mb-6">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Filtrar por Loja</label>
                    <select 
                        className="bg-slate-800 p-2 rounded w-full border border-slate-500" 
                        value={filtroLojaRotina} 
                        onChange={e => setFiltroLojaRotina(e.target.value)}
                    >
                        <option value="">Selecione a Loja...</option>
                        {lojas.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {listaRotinas.map(rotina => (
                        <div key={rotina.id} className={`p-4 rounded border-t-4 shadow-lg ${rotina.active ? 'bg-white border-amber-500' : 'bg-slate-300 border-slate-500'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div className={`p-2 rounded-full ${rotina.active ? 'bg-amber-100 text-amber-700' : 'bg-slate-400 text-slate-600'}`}>
                                    {rotina.icon === 'moon' ? <Layers size={24}/> : <Layers size={24}/>}
                                </div>
                                <button onClick={() => toggleStatusRotina(rotina)}>{rotina.active ? <ToggleRight className="text-green-600" size={28}/> : <ToggleLeft size={28} className="text-slate-500"/>}</button>
                            </div>
                            <h3 className={`font-bold text-lg ${rotina.active ? 'text-slate-800' : 'text-slate-500'}`}>{rotina.title}</h3>
                            <p className="text-xs text-slate-500 mb-3">{rotina.description}</p>
                            
                            <div className="flex gap-2 text-xs font-mono text-slate-600 bg-slate-100 p-2 rounded mb-3">
                                <span className="flex items-center gap-1"><Clock size={12}/> {rotina.start_time?.slice(0,5) || '--:--'} - {rotina.deadline_time?.slice(0,5) || '--:--'}</span>
                            </div>

                            <div className="flex justify-between items-center border-t pt-2">
                                <span className="text-xs font-bold text-slate-400 uppercase">{rotina.routine_items?.[0]?.count || 0} Tarefas</span>
                                <button onClick={() => abrirEdicaoRotina(rotina)} className="text-blue-600 p-1 hover:bg-blue-50 rounded"><Pencil size={18}/></button>
                            </div>
                        </div>
                    ))}
                    {listaRotinas.length === 0 && filtroLojaRotina && (
                        <div className="col-span-3 text-center py-10 text-slate-500">Nenhuma rotina cadastrada nesta loja.</div>
                    )}
                </div>
            </div>
        )}

        {screen === 'relatorios' && (
            <div className="animate-fade-in">
                <button onClick={() => setScreen('menu')} className="flex items-center gap-2 mb-6 text-slate-400 hover:text-white"><ArrowLeft/> Voltar</button>
                <div className="bg-slate-700 p-6 rounded mb-6 border border-slate-600">
                    <label className="block text-sm font-bold text-slate-400 mb-2">Selecione a Unidade</label>
                    <select className="bg-slate-800 p-3 rounded w-full border border-slate-500 text-lg" onChange={e => {setFiltroLojaRelatorio(e.target.value); buscarDashboard(e.target.value)}}><option value="">-- Loja --</option>{lojas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
                </div>
                {dadosRelatorio && statusContagem && (
                    <div className="bg-white p-6 rounded text-slate-800 shadow-xl">
                        <h2 className="text-2xl font-bold mb-6">Status Hoje ({statusContagem.PERCENT_COMPLETED.toFixed(0)}%)</h2>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="bg-slate-100 p-4 rounded text-center font-bold border-b-4 border-slate-400"><div className="text-xs text-slate-500 uppercase">Total</div><div className="text-2xl">{statusContagem.TOTAL}</div></div>
                            <div className="bg-green-50 p-4 rounded text-center font-bold border-b-4 border-green-500"><div className="text-xs text-green-700 uppercase">Feito</div><div className="text-2xl">{statusContagem.COMPLETED}</div></div>
                            <div className="bg-blue-50 p-4 rounded text-center font-bold border-b-4 border-blue-500"><div className="text-xs text-blue-700 uppercase">Revisão</div><div className="text-2xl">{statusContagem.WAITING_APPROVAL}</div></div>
                            <div className="bg-orange-50 p-4 rounded text-center font-bold border-b-4 border-orange-500"><div className="text-xs text-orange-700 uppercase">Devolvido</div><div className="text-2xl">{statusContagem.RETURNED}</div></div>
                            <div className="bg-red-50 p-4 rounded text-center font-bold border-b-4 border-red-500"><div className="text-xs text-red-700 uppercase">Pendente</div><div className="text-2xl">{statusContagem.PENDING}</div></div>
                        </div>
                        <div className="mt-8 pt-4 border-t">
                            <h3 className="font-bold mb-4">Ranking de Eficiência</h3>
                            {eficienciaPorCargo.map(d => (
                                <div key={d.roleName} className="flex justify-between items-center bg-slate-50 p-2 rounded mb-2 border">
                                    <span className="text-sm font-bold">{d.roleName}</span>
                                    <span className={`text-sm font-black ${d.percent >= 90 ? 'text-green-600' : 'text-amber-600'}`}>{d.percent.toFixed(0)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- MODAIS ANTIGOS (LOJA, CARGO, COLAB, TAREFA, CSV) MANTIDOS --- */}
        {modalEditarLojaOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white p-6 rounded-lg w-full max-w-md text-slate-800">
                    <h3 className="font-bold text-xl mb-4">Editar Loja</h3>
                    <div className="mb-3"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Loja</label><input className="border p-2 w-full rounded bg-white text-slate-800" value={editLojaData.name} onChange={e => setEditLojaData({...editLojaData, name: e.target.value})} /></div>
                    <div className="mb-3"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Resumido</label><input className="border p-2 w-full rounded bg-white text-slate-800" value={editLojaData.shortName} onChange={e => setEditLojaData({...editLojaData, shortName: e.target.value})} /></div>
                    <div className="mb-4"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código ERP</label><input className="border p-2 w-full rounded bg-white text-slate-800" value={editLojaData.code} onChange={e => setEditLojaData({...editLojaData, code: e.target.value})} /></div>
                    <button onClick={salvarEdicaoLoja} className="bg-blue-600 text-white w-full py-3 rounded font-bold">Salvar Alterações</button>
                    <button onClick={() => setModalEditarLojaOpen(false)} className="mt-2 w-full text-slate-500 py-2">Cancelar</button>
                </div>
            </div>
        )}

        {/* ... [OUTROS MODAIS: CARGO, COLABORADOR, TAREFA, IMPORTAR] ... */}
        {/* Adicionei os Modais de Tarefa/Colaborador aqui resumidos para não estourar limite, 
            mas no seu código real mantenha eles exatamente como estavam no original. */}
            
        {modalEditarCargoOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white p-6 rounded-lg w-full max-w-md text-slate-800"><h3 className="font-bold text-xl mb-4">Editar Cargo</h3><input className="border p-2 w-full mb-2" value={editCargoData.name} onChange={e=>setEditCargoData({...editCargoData, name:e.target.value})}/><input className="border p-2 w-full mb-4" type="number" value={editCargoData.level} onChange={e=>setEditCargoData({...editCargoData, level:e.target.value})}/><button onClick={salvarEdicaoCargo} className="bg-blue-600 text-white w-full py-3 rounded font-bold">Salvar</button><button onClick={()=>setModalEditarCargoOpen(false)} className="mt-2 w-full text-slate-500">Cancelar</button></div></div>)}
        {modalNovoColabOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white p-6 rounded-lg w-full max-w-md text-slate-800"><h3 className="font-bold text-xl mb-4">Novo Colaborador</h3><input className="border p-2 w-full mb-2" placeholder="Nome" value={novoColab.nome} onChange={e=>setNovoColab({...novoColab, nome:e.target.value})}/><select className="border p-2 w-full mb-2" onChange={e=>{setNovoColab({...novoColab, loja:e.target.value});carregarGestores(e.target.value)}}><option value="">Loja...</option>{lojas.filter(l=>l.active).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select><select className="border p-2 w-full mb-2" onChange={e=>setNovoColab({...novoColab, cargo:e.target.value})}><option value="">Cargo...</option>{roles.filter(r=>r.active).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><button onClick={salvarNovoColaborador} className="bg-blue-600 text-white w-full py-3 rounded font-bold">Salvar</button><button onClick={()=>setModalNovoColabOpen(false)} className="mt-2 w-full text-slate-500">Cancelar</button></div></div>)}
        {modalEditarColabOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white p-6 rounded-lg w-full max-w-md text-slate-800"><h3 className="font-bold text-xl mb-4">Editar Colaborador</h3><input className="border p-2 w-full mb-2" value={editColab.nome} onChange={e=>setEditColab({...editColab, nome:e.target.value})}/><button onClick={salvarEdicaoColaborador} className="bg-blue-600 text-white w-full py-3 rounded font-bold">Salvar</button><button onClick={()=>setModalEditarColabOpen(false)} className="mt-2 w-full text-slate-500">Cancelar</button></div></div>)}
        {modalNovaTarefaOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white p-6 rounded-lg w-full max-w-lg text-slate-800"><h3 className="font-bold text-xl mb-4">Nova Tarefa</h3><input className="border p-2 w-full mb-2" placeholder="Título" onChange={e=>setNovaTarefa({...novaTarefa, titulo:e.target.value})}/><select className="border p-2 w-full mb-2" onChange={e=>{setNovaTarefa({...novaTarefa, loja:e.target.value}); carregarCargosParaModal(e.target.value)}}><option>Loja...</option>{lojas.filter(l=>l.active).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select><select className="border p-2 w-full mb-2" onChange={e=>setNovaTarefa({...novaTarefa, cargo:e.target.value})}><option>Cargo...</option>{cargosDisponiveis.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><button onClick={salvarNovaTarefa} className="bg-purple-600 text-white w-full py-3 rounded font-bold">Salvar</button><button onClick={()=>setModalNovaTarefaOpen(false)} className="mt-2 w-full text-slate-500">Cancelar</button></div></div>)}
        {modalEditarTarefaOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white p-6 rounded-lg w-full max-w-lg text-slate-800"><h3 className="font-bold text-xl mb-4">Editar Tarefa</h3><input className="border p-2 w-full mb-2" value={editTarefa.title} onChange={e=>setEditTarefa({...editTarefa, title:e.target.value})}/><button onClick={salvarEdicaoTarefa} className="bg-purple-600 text-white w-full py-3 rounded font-bold">Salvar</button><button onClick={()=>setModalEditarTarefaOpen(false)} className="mt-2 w-full text-slate-500">Cancelar</button></div></div>)}
        {modalImportarOpen && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white p-6 rounded-lg w-full max-w-lg text-slate-800"><h3 className="font-bold text-xl mb-4">Importar CSV</h3><input type="file" accept=".csv" onChange={processarImportacaoCSV}/><button onClick={()=>setModalImportarOpen(false)} className="mt-4 w-full text-slate-500">Fechar</button></div></div>)}


        {/* --- NOVO MODAL: CRIAR ROTINA --- */}
        {modalNovaRotinaOpen && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
                <div className="bg-white rounded-xl w-full max-w-2xl text-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b">
                        <h3 className="font-bold text-xl flex items-center gap-2"><Layers className="text-amber-600"/> Nova Rotina</h3>
                    </div>
                    
                    <div className="p-6 overflow-y-auto">
                        {/* Passo 1: Configuração Básica */}
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loja</label>
                                <select 
                                    className="border-2 border-slate-200 p-2 w-full rounded-lg"
                                    value={novaRotina.store_id}
                                    onChange={e => {
                                        setNovaRotina({...novaRotina, store_id: e.target.value});
                                        carregarTarefasParaRotina(e.target.value);
                                    }}
                                >
                                    <option value="">Selecione...</option>
                                    {lojas.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título da Rotina</label>
                                <input 
                                    className="border-2 border-slate-200 p-2 w-full rounded-lg" 
                                    placeholder="Ex: Abertura Manhã"
                                    value={novaRotina.title}
                                    onChange={e => setNovaRotina({...novaRotina, title: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                            <textarea 
                                className="border-2 border-slate-200 p-2 w-full rounded-lg" 
                                placeholder="O que deve ser feito neste grupo de tarefas?"
                                value={novaRotina.description}
                                onChange={e => setNovaRotina({...novaRotina, description: e.target.value})}
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mb-6 bg-amber-50 p-4 rounded-lg border border-amber-100">
                            <div>
                                <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Horário Sugerido Início</label>
                                <input type="time" className="bg-white border p-2 w-full rounded" value={novaRotina.start_time} onChange={e => setNovaRotina({...novaRotina, start_time: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-amber-700 uppercase mb-1">Horário Limite (Deadline)</label>
                                <input type="time" className="bg-white border p-2 w-full rounded" value={novaRotina.deadline_time} onChange={e => setNovaRotina({...novaRotina, deadline_time: e.target.value})}/>
                            </div>
                        </div>

                        {/* Passo 2: Adicionar Tarefas */}
                        <div className="border-t pt-4">
                            <h4 className="font-bold text-lg mb-3">Itens da Rotina</h4>
                            <div className="flex gap-2 mb-4">
                                <select 
                                    className="border-2 border-slate-200 p-2 flex-1 rounded-lg"
                                    value={tarefaSelecionadaId}
                                    onChange={e => setTarefaSelecionadaId(e.target.value)}
                                    disabled={!novaRotina.store_id}
                                >
                                    <option value="">Selecionar Tarefa para Adicionar...</option>
                                    {tarefasParaRotina.map(t => <option key={t.id} value={t.id}>{t.title} ({t.role?.name})</option>)}
                                </select>
                                <button 
                                    onClick={adicionarItemNaRotina}
                                    className="bg-slate-800 text-white px-4 rounded-lg font-bold hover:bg-slate-700"
                                    disabled={!tarefaSelecionadaId}
                                >
                                    <Plus size={20}/>
                                </button>
                            </div>

                            <div className="bg-slate-50 rounded-lg border border-slate-200 min-h-[150px] p-2">
                                {itensSelecionados.length === 0 ? (
                                    <div className="text-center text-slate-400 py-10 text-sm">Nenhuma tarefa adicionada ainda.</div>
                                ) : (
                                    <ul className="space-y-2">
                                        {itensSelecionados.map((item, idx) => (
                                            <li key={idx} className="bg-white p-3 rounded shadow-sm border flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <span className="bg-slate-200 text-slate-600 px-2 rounded-full text-xs font-bold">{idx + 1}</span>
                                                    <div>
                                                        <div className="font-bold text-sm">{item.title}</div>
                                                        <div className="text-[10px] uppercase text-slate-500">{item.role_name}</div>
                                                    </div>
                                                </div>
                                                <button onClick={() => removerItemDaRotina(idx)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t bg-slate-50 flex gap-3">
                        <button onClick={salvarNovaRotina} className="flex-1 bg-amber-600 text-white py-3 rounded-lg font-bold hover:bg-amber-700 shadow-lg">Salvar Rotina</button>
                        <button onClick={() => setModalNovaRotinaOpen(false)} className="px-6 py-3 rounded-lg font-bold text-slate-500 hover:bg-slate-200">Cancelar</button>
                    </div>
                </div>
            </div>
        )}

        {/* --- NOVO MODAL: EDITAR ROTINA --- */}
        {modalEditarRotinaOpen && editRotina && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
                <div className="bg-white rounded-xl w-full max-w-2xl text-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b">
                        <h3 className="font-bold text-xl flex items-center gap-2"><Pencil className="text-blue-600"/> Editar Rotina</h3>
                    </div>
                    
                    <div className="p-6 overflow-y-auto">
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título da Rotina</label>
                            <input className="border-2 border-slate-200 p-2 w-full rounded-lg" value={editRotina.title} onChange={e => setEditRotina({...editRotina, title: e.target.value})}/>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                            <textarea className="border-2 border-slate-200 p-2 w-full rounded-lg" value={editRotina.description} onChange={e => setEditRotina({...editRotina, description: e.target.value})}/>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Início</label><input type="time" className="border p-2 w-full rounded" value={editRotina.start_time || ''} onChange={e => setEditRotina({...editRotina, start_time: e.target.value})}/></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Deadline</label><input type="time" className="border p-2 w-full rounded" value={editRotina.deadline_time || ''} onChange={e => setEditRotina({...editRotina, deadline_time: e.target.value})}/></div>
                        </div>

                        <div className="border-t pt-4">
                            <h4 className="font-bold text-lg mb-3">Itens da Rotina</h4>
                            <div className="flex gap-2 mb-4">
                                <select className="border-2 border-slate-200 p-2 flex-1 rounded-lg" value={tarefaSelecionadaId} onChange={e => setTarefaSelecionadaId(e.target.value)}>
                                    <option value="">Adicionar Tarefa...</option>
                                    {tarefasParaRotina.map(t => <option key={t.id} value={t.id}>{t.title} ({t.role?.name})</option>)}
                                </select>
                                <button onClick={adicionarItemNaRotina} className="bg-slate-800 text-white px-4 rounded-lg font-bold"><Plus size={20}/></button>
                            </div>
                            <ul className="space-y-2 bg-slate-50 p-2 rounded border min-h-[100px]">
                                {itensSelecionados.map((item, idx) => (
                                    <li key={idx} className="bg-white p-2 rounded shadow-sm border flex justify-between items-center">
                                        <div className="flex items-center gap-2"><span className="bg-slate-200 px-2 rounded text-xs font-bold">{idx + 1}</span><span className="text-sm font-bold">{item.title}</span></div>
                                        <button onClick={() => removerItemDaRotina(idx)} className="text-red-500"><Trash2 size={16}/></button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="p-6 border-t bg-slate-50 flex gap-3">
                        <button onClick={salvarEdicaoRotina} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">Salvar Alterações</button>
                        <button onClick={() => setModalEditarRotinaOpen(false)} className="px-6 py-3 rounded-lg font-bold text-slate-500 hover:bg-slate-200">Cancelar</button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}
