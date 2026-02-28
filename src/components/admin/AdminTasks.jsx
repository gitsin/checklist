import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { ArrowLeft, Plus, Pencil, ToggleLeft, ToggleRight, FileUp, PlayCircle, Download, X, MessageCircle, CheckCircle2, Store, AlertTriangle, Sparkles, Filter, CalendarCheck } from "lucide-react";
import TaskWizard from "./TaskWizard";

export default function AdminTasks({ goBack, lojas, roles }) {
    const [listaTemplates, setListaTemplates] = useState([]);
    const [filtroLojaTarefa, setFiltroLojaTarefa] = useState("");
    const [filtroCargoTarefa, setFiltroCargoTarefa] = useState("");
    const [cargosFiltroDisponiveis, setCargosFiltroDisponiveis] = useState([]);
    const [filtroRotina, setFiltroRotina] = useState("");
    const [rotinasFiltroDisponiveis, setRotinasFiltroDisponiveis] = useState([]);
    const [filtroFrequencia, setFiltroFrequencia] = useState("");
    const [filtroExigeFoto, setFiltroExigeFoto] = useState(""); // '' | 'sim' | 'nao'
    const [filtroDisparaAlerta, setFiltroDisparaAlerta] = useState(""); // '' | 'sim' | 'nao'

    const [modalNovaTarefaOpen, setModalNovaTarefaOpen] = useState(false);
    const [modalEditarTarefaOpen, setModalEditarTarefaOpen] = useState(false);

    // Estados do Formulário
    const [novaTarefa, setNovaTarefa] = useState({ titulo: "", desc: "", freq: "daily", loja: "", cargo: "", hora: "", foto: false, diaSemana: "", diaMes: "", notifyWhatsapp: false });
    const [editTarefa, setEditTarefa] = useState(null);

    const [cargosDisponiveis, setCargosDisponiveis] = useState([]);
    const [gerandoRotina, setGerandoRotina] = useState(false);

    // Importação CSV
    const [modalImportarOpen, setModalImportarOpen] = useState(false);
    const [importando, setImportando] = useState(false);
    const [logImportacao, setLogImportacao] = useState([]);

    // Resultado da geração de rotina
    const [modalResultadoOpen, setModalResultadoOpen] = useState(false);
    const [resultadoGeracao, setResultadoGeracao] = useState({ sucesso: false, mensagem: "", porLoja: [], total: 0 });

    // Modal de confirmação ao salvar nova tarefa
    const [modalTarefaSalvaOpen, setModalTarefaSalvaOpen] = useState(false);
    const [tarefaSalvaResumo, setTarefaSalvaResumo] = useState(null);

    // Wizard
    const [wizardOpen, setWizardOpen] = useState(false);

    // Rotinas disponíveis para os modais
    const [rotinasDisponiveis, setRotinasDisponiveis] = useState([]);
    const [novaTarefaRotina, setNovaTarefaRotina] = useState("");
    const [editTarefaRotina, setEditTarefaRotina] = useState(""); // routine_id atual da tarefa em edição

    // --- Lógica de Filtros e Carregamento ---

    async function carregarFiltrosSecundarios(lojaId) {
        setFiltroCargoTarefa("");
        setFiltroRotina("");
        if (!lojaId) {
            setCargosFiltroDisponiveis([]);
            setRotinasFiltroDisponiveis([]);
            return;
        }

        // Cargos
        const { data: emps } = await supabase.from("employee").select("role_id").eq("store_id", lojaId).eq("active", true);
        const rIds = [...new Set(emps?.map(e => e.role_id) || [])];
        if (rIds.length > 0) {
            const rolesFiltrados = roles.filter(r => rIds.includes(r.id) && r.active);
            setCargosFiltroDisponiveis(rolesFiltrados);
        } else {
            setCargosFiltroDisponiveis([]);
        }

        // Rotinas
        const { data: rots } = await supabase.from('routine_templates').select('id, title').eq('store_id', lojaId).eq('active', true).order('title');
        setRotinasFiltroDisponiveis(rots || []);
    }

    async function buscarTarefas() {
        if (!filtroLojaTarefa) { setListaTemplates([]); return; }
        let q = supabase.from("task_templates").select(`*, stores(name), roles(name), routine_items(routine_templates(id, title))`).eq("store_id", filtroLojaTarefa).order("created_at", { ascending: false });
        if (filtroCargoTarefa && filtroCargoTarefa !== "") q = q.eq("role_id", filtroCargoTarefa);
        const { data, error } = await q;
        if (error) { alert(error.message); return; }
        const freqOrder = { daily: 0, weekly: 1, monthly: 2, spot: 3 };
        const sorted = (data || []).sort((a, b) => {
            // 1. Ativas antes das inativas
            if (a.active !== b.active) return a.active ? -1 : 1;
            // 2. Ordem por frequência
            const freqDiff = (freqOrder[a.frequency_type] ?? 99) - (freqOrder[b.frequency_type] ?? 99);
            if (freqDiff !== 0) return freqDiff;
            // 3. Dentro da mesma frequência
            if (a.frequency_type === 'weekly') {
                const dayDiff = (a.specific_day_of_week ?? 99) - (b.specific_day_of_week ?? 99);
                if (dayDiff !== 0) return dayDiff;
            }
            if (a.frequency_type === 'monthly') {
                const dayDiff = (a.specific_day_of_month ?? 99) - (b.specific_day_of_month ?? 99);
                if (dayDiff !== 0) return dayDiff;
            }
            // 4. Por horário (sem horário vai para o final)
            const timeA = a.due_time ?? '99:99';
            const timeB = b.due_time ?? '99:99';
            return timeA.localeCompare(timeB);
        });
        setListaTemplates(sorted);
    }

    useEffect(() => { buscarTarefas(); }, [filtroLojaTarefa, filtroCargoTarefa]);

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

    async function carregarRotinasParaModal(lojaId) {
        if (!lojaId) { setRotinasDisponiveis([]); return; }
        const { data } = await supabase
            .from('routine_templates')
            .select('id, title')
            .eq('store_id', lojaId)
            .eq('active', true)
            .order('title');
        setRotinasDisponiveis(data || []);
    }

    // --- Salvar e Editar ---

    async function salvarNovaTarefa() {
        if (!novaTarefa.titulo || !novaTarefa.loja || !novaTarefa.cargo) return alert("Preencha os campos obrigatórios");
        if (novaTarefa.freq === 'weekly' && !novaTarefa.diaSemana) return alert("Selecione o dia da semana");
        if (novaTarefa.freq === 'monthly' && !novaTarefa.diaMes) return alert("Selecione o dia do mês");

        const { data: novoTemplate, error } = await supabase.from("task_templates").insert({
            title: novaTarefa.titulo, description: novaTarefa.desc, frequency_type: novaTarefa.freq,
            store_id: novaTarefa.loja, role_id: novaTarefa.cargo, due_time: novaTarefa.hora || null,
            requires_photo_evidence: novaTarefa.foto,
            specific_day_of_week: novaTarefa.freq === 'weekly' ? parseInt(novaTarefa.diaSemana) : null,
            specific_day_of_month: novaTarefa.freq === 'monthly' ? parseInt(novaTarefa.diaMes) : null,
            notify_whatsapp: novaTarefa.notifyWhatsapp,
            active: true
        }).select('id').single();

        if (error) {
            alert("Um erro ocorreu, por favor tente novamente.");
            return;
        }

        // Vincular à rotina se selecionada
        if (novaTarefaRotina && novoTemplate?.id) {
            await supabase.from('routine_items').insert({
                routine_id: novaTarefaRotina,
                task_template_id: novoTemplate.id,
                order_index: 0
            });
        }

        // Monta resumo para exibir no modal
        const freqMap = { daily: 'Diária', weekly: 'Semanal', monthly: 'Mensal' };
        const mapaDiasSemana = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado', 7: 'Domingo' };
        const lojaNome = lojas.find(l => l.id === novaTarefa.loja)?.name || 'N/A';
        const cargoNome = roles.find(r => r.id === novaTarefa.cargo)?.name || 'N/A';
        const rotinaNome = rotinasDisponiveis.find(r => r.id === novaTarefaRotina)?.title || null;

        setTarefaSalvaResumo({
            titulo: novaTarefa.titulo,
            descricao: novaTarefa.desc,
            frequencia: freqMap[novaTarefa.freq] || novaTarefa.freq,
            loja: lojaNome,
            cargo: cargoNome,
            horario: novaTarefa.hora || null,
            foto: novaTarefa.foto,
            whatsapp: novaTarefa.notifyWhatsapp,
            diaSemana: novaTarefa.freq === 'weekly' ? mapaDiasSemana[novaTarefa.diaSemana] : null,
            diaMes: novaTarefa.freq === 'monthly' ? novaTarefa.diaMes : null,
            rotina: rotinaNome,
        });
        setModalNovaTarefaOpen(false);
        setModalTarefaSalvaOpen(true);
        buscarTarefas();
    }

    async function salvarEdicaoTarefa() {
        if (editTarefa.frequency_type === 'weekly' && !editTarefa.specific_day_of_week) return alert("Selecione o dia da semana");
        if (editTarefa.frequency_type === 'monthly' && !editTarefa.specific_day_of_month) return alert("Selecione o dia do mês");

        const { error } = await supabase.from("task_templates").update({
            title: editTarefa.title, description: editTarefa.description, frequency_type: editTarefa.frequency_type,
            store_id: editTarefa.store_id, role_id: editTarefa.role_id,
            due_time: editTarefa.due_time || null, requires_photo_evidence: editTarefa.requires_photo_evidence,
            specific_day_of_week: editTarefa.frequency_type === 'weekly' ? parseInt(editTarefa.specific_day_of_week) : null,
            specific_day_of_month: editTarefa.frequency_type === 'monthly' ? parseInt(editTarefa.specific_day_of_month) : null,
            notify_whatsapp: editTarefa.notify_whatsapp
        }).eq("id", editTarefa.id);

        if (error) { alert("Um erro ocorreu, por favor tente novamente."); return; }

        // Atualiza vínculo com rotina: remove o existente e insere o novo (se houver)
        await supabase.from('routine_items').delete().eq('task_template_id', editTarefa.id);
        if (editTarefaRotina) {
            await supabase.from('routine_items').insert({
                routine_id: editTarefaRotina,
                task_template_id: editTarefa.id,
                order_index: 0
            });
        }

        setModalEditarTarefaOpen(false);
        buscarTarefas();
    }

    async function toggleStatusTarefa(task) {
        await supabase.from("task_templates").update({ active: !task.active }).eq("id", task.id);
        buscarTarefas();
    }

    async function gerarRotina() {
        setGerandoRotina(true);

        // Chama a function que gera APENAS templates criados hoje
        // Retorna JSONB: { total, items: [{store_id}], data_referencia }
        const { data: resultado, error } = await supabase.rpc('generate_same_day_tasks');
        setGerandoRotina(false);

        if (error) {
            setResultadoGeracao({ sucesso: false, mensagem: error.message, porLoja: [], total: 0 });
            setModalResultadoOpen(true);
            return;
        }

        // Agrupar contagem por loja a partir do retorno da function
        const contagemPorLoja = {};
        (resultado?.items || []).forEach(item => {
            contagemPorLoja[item.store_id] = (contagemPorLoja[item.store_id] || 0) + 1;
        });

        const porLoja = Object.entries(contagemPorLoja).map(([storeId, count]) => {
            const loja = lojas.find(l => l.id === storeId);
            return { nome: loja?.name || `Loja ${storeId}`, count };
        }).sort((a, b) => b.count - a.count);

        const total = resultado?.total || 0;

        setResultadoGeracao({
            sucesso: true,
            mensagem: total === 0
                ? "Todas as tarefas de hoje já foram geradas."
                : `${total} tarefa${total !== 1 ? 's' : ''} gerada${total !== 1 ? 's' : ''} com sucesso!`,
            porLoja,
            total
        });
        setModalResultadoOpen(true);
    }

    // --- CSV Logic ---
    function baixarExemploCSV() {
        const cabecalho = "titulo,descricao,frequencia,loja,cargo,horario_limite,exige_foto,dia_semana_num,dia_mes_num,rotina\n";
        const exemplo = "Limpeza Geral,Limpar bancadas,weekly,Minha Loja,Gerente,10:00,true,1,,Abertura\n";
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
            const logs = [];
            const normalizeStr = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

            const mapaLojas = Object.fromEntries(lojas.map(l => [normalizeStr(l.name), l.id]));
            const mapaCargos = Object.fromEntries(roles.map(r => [normalizeStr(r.name), r.id]));

            // Busca todas as rotinas ativas para referência
            const { data: todasRotinas } = await supabase.from('routine_templates').select('id, title, store_id').eq('active', true);
            const mapaRotinas = {};
            (todasRotinas || []).forEach(rt => {
                const key = `${rt.store_id}_${normalizeStr(rt.title)}`;
                mapaRotinas[key] = rt.id;
            });

            // Detect separator (CSV exported from Excel sometimes uses ;)
            const cabecalho = linhas[0];
            const separador = cabecalho.includes(";") ? ";" : ",";

            // Custom CSV line parser to handle quotes
            const parseCSVLine = (text, sep) => {
                const result = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < text.length; i++) {
                    const char = text[i];
                    if (char === '"' && text[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === sep && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim());
                return result;
            };

            let importados = 0;
            for (let i = 1; i < linhas.length; i++) {
                const col = parseCSVLine(linhas[i], separador);
                if (col.length < 5) continue;
                const [titulo, desc, freq, nomeLoja, nomeCargo, hora, foto, diaSem, diaMes, nomeRotina] = col.map(c => c?.trim());
                const store_id = mapaLojas[normalizeStr(nomeLoja)];
                const role_id = mapaCargos[normalizeStr(nomeCargo)];

                if (!store_id || !role_id) {
                    logs.push(`Erro linha ${i + 1}: Loja "${nomeLoja || '?'}" ou Cargo "${nomeCargo || '?'}" não encontrados.`);
                    continue;
                }

                const { data: tpl, error: tplErr } = await supabase.from("task_templates").insert({
                    title: titulo, description: desc, frequency_type: freq || 'daily',
                    store_id, role_id, due_time: hora || null, requires_photo_evidence: foto === 'true', active: true,
                    specific_day_of_week: diaSem ? parseInt(diaSem) : null,
                    specific_day_of_month: diaMes ? parseInt(diaMes) : null
                }).select('id').single();

                if (tplErr) {
                    logs.push(`Erro linha ${i + 1}: ${tplErr.message}`);
                    continue;
                }

                importados++;

                // Vincular à rotina se informada
                if (nomeRotina && tpl?.id) {
                    const routineKey = `${store_id}_${normalizeStr(nomeRotina)}`;
                    const routineId = mapaRotinas[routineKey];
                    if (routineId) {
                        const { error: riErr } = await supabase.from('routine_items').insert({
                            routine_id: routineId,
                            task_template_id: tpl.id,
                            order_index: 0
                        });
                        if (riErr) logs.push(`Aviso linha ${i + 1}: tarefa importada, mas erro ao vincular rotina.`);
                    } else {
                        logs.push(`Aviso linha ${i + 1}: tarefa importada, rotina "${nomeRotina}" não encontrada nesta loja.`);
                    }
                }
            }

            if (importados > 0) logs.push(`Sucesso: ${importados} tarefa${importados !== 1 ? 's' : ''} importada${importados !== 1 ? 's' : ''}.`);
            setLogImportacao(logs);
            setImportando(false);
            buscarTarefas();
        };
        leitor.readAsText(arquivo);
    }

    const mapaDiasSemana = { 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb", 7: "Dom" };

    return (
        <>
            <div className="animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between gap-3 mb-6">
                    <button onClick={goBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 font-semibold transition-colors min-h-[44px] group"><ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" /> Voltar</button>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => setModalImportarOpen(true)} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 flex gap-2 items-center text-sm min-h-[44px] transition-all shadow-sm hover:shadow"><FileUp size={16} /> Importar</button>
                        <button onClick={gerarRotina} disabled={gerandoRotina} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2.5 rounded-xl font-bold hover:from-emerald-600 hover:to-green-700 flex gap-2 items-center text-sm min-h-[44px] transition-all shadow-md hover:shadow-lg active:scale-[0.97] disabled:opacity-50"><PlayCircle size={16} /> {gerandoRotina ? '...' : 'Gerar'}</button>
                        <button onClick={() => setWizardOpen(true)} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2.5 rounded-xl font-bold hover:from-indigo-600 hover:to-purple-700 flex gap-2 items-center text-sm min-h-[44px] transition-all shadow-md hover:shadow-lg active:scale-[0.97]"><Sparkles size={16} /> Assistente de Criação de Tarefas</button>
                        <button onClick={() => { setNovaTarefa({ titulo: "", desc: "", freq: "daily", loja: "", cargo: "", hora: "", foto: false, notifyWhatsapp: false }); setCargosDisponiveis([]); setRotinasDisponiveis([]); setNovaTarefaRotina(""); setModalNovaTarefaOpen(true); }} className="bg-gradient-to-r from-purple-500 to-violet-600 text-white px-4 py-2.5 rounded-xl font-bold hover:from-purple-600 hover:to-violet-700 flex gap-2 items-center text-sm min-h-[44px] transition-all shadow-md hover:shadow-lg active:scale-[0.97]"><Plus size={16} /> Criar Tarefa</button>
                    </div>
                </div>

                {/* Filtros */}
                <div className="mb-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                        <Filter size={14} className="text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filtrar</span>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Loja */}
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Loja</label>
                            <select className="bg-slate-50 p-2 rounded-lg w-full border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors text-sm" value={filtroLojaTarefa} onChange={e => { setFiltroLojaTarefa(e.target.value); carregarFiltrosSecundarios(e.target.value); }}>
                                <option value="">Todas as lojas</option>
                                {lojas.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        {/* Cargo */}
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Cargo</label>
                            <select className="bg-slate-50 p-2 rounded-lg w-full border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors text-sm disabled:opacity-40" value={filtroCargoTarefa} onChange={e => setFiltroCargoTarefa(e.target.value)} disabled={!filtroLojaTarefa}>
                                <option value="">Todos os cargos</option>
                                {cargosFiltroDisponiveis.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        {/* Rotina */}
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Rotina</label>
                            <select className="bg-slate-50 p-2 rounded-lg w-full border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors text-sm disabled:opacity-40" value={filtroRotina} onChange={e => setFiltroRotina(e.target.value)} disabled={!filtroLojaTarefa}>
                                <option value="">Todas</option>
                                {rotinasFiltroDisponiveis.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                            </select>
                        </div>
                        {/* Frequência */}
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Frequência</label>
                            <select className="bg-slate-50 p-2 rounded-lg w-full border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors text-sm" value={filtroFrequencia} onChange={e => setFiltroFrequencia(e.target.value)}>
                                <option value="">Todas</option>
                                <option value="daily">Diária</option>
                                <option value="weekly">Semanal</option>
                                <option value="monthly">Mensal</option>
                            </select>
                        </div>
                        {/* Exige Foto */}
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Exige Foto</label>
                            <div className="flex gap-1.5">
                                {[['', 'Todos'], ['sim', 'Sim'], ['nao', 'Não']].map(([val, label]) => (
                                    <button key={val} onClick={() => setFiltroExigeFoto(val)}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all min-h-[36px] ${filtroExigeFoto === val ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Dispara Alerta */}
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Dispara Alerta</label>
                            <div className="flex gap-1.5">
                                {[['', 'Todos'], ['sim', 'Sim'], ['nao', 'Não']].map(([val, label]) => (
                                    <button key={val} onClick={() => setFiltroDisparaAlerta(val)}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all min-h-[36px] ${filtroDisparaAlerta === val ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lista de Tarefas */}
                <div className="grid gap-3">
                    {listaTemplates.filter(t => {
                        if (filtroFrequencia && t.frequency_type !== filtroFrequencia) return false;
                        if (filtroExigeFoto === 'sim' && !t.requires_photo_evidence) return false;
                        if (filtroExigeFoto === 'nao' && t.requires_photo_evidence) return false;
                        if (filtroDisparaAlerta === 'sim' && !t.notify_whatsapp) return false;
                        if (filtroDisparaAlerta === 'nao' && t.notify_whatsapp) return false;

                        if (filtroRotina) {
                            const hasRoutine = t.routine_items?.some(ri => ri.routine_templates?.id === filtroRotina);
                            if (!hasRoutine) return false;
                        }

                        return true;
                    }).map(t => (
                        <div key={t.id} className={`p-3 sm:p-4 rounded flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 ${t.active ? 'bg-white text-slate-800 border-l-4 border-green-500' : 'bg-slate-300 text-slate-500 border-l-4 border-slate-500'}`}>
                            <div>
                                <div className="font-bold flex items-center gap-2">
                                    {t.title}
                                    {t.frequency_type === 'daily' && <span className="bg-blue-100 text-blue-800 text-[9px] px-1 rounded border border-blue-300 font-bold uppercase">Diária {t.due_time ? `- ${t.due_time.slice(0, 5)}` : ''}</span>}
                                    {t.frequency_type === 'weekly' && <span className="bg-orange-100 text-orange-800 text-[9px] px-1 rounded border border-orange-300 font-bold uppercase">{mapaDiasSemana[t.specific_day_of_week]}</span>}
                                    {t.frequency_type === 'monthly' && <span className="bg-pink-100 text-pink-800 text-[9px] px-1 rounded border border-pink-300 font-bold uppercase">Dia {t.specific_day_of_month}</span>}
                                </div>
                                <div className="text-xs text-slate-500">{t.description}</div>
                                <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                                    {t.roles?.name}
                                    {t.requires_photo_evidence && ' • 📷 Exige Foto'}
                                    {t.notify_whatsapp && <span className="ml-1 inline-flex items-center gap-0.5 text-green-600"><MessageCircle size={10} /> WhatsApp</span>}
                                </div>
                                {t.routine_items?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {t.routine_items.map((ri, idx) => ri.routine_templates && (
                                            <span key={idx} className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded border border-amber-200 font-bold uppercase flex items-center gap-1">
                                                📋 {ri.routine_templates.title}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 items-center sm:items-start pt-1 sm:pt-0">
                                <button onClick={() => toggleStatusTarefa(t)}>{t.active ? <ToggleRight className="text-green-600" size={28} /> : <ToggleLeft size={28} />}</button>
                                <button onClick={async () => {
                                    setEditTarefa(t);
                                    carregarCargosParaModal(t.store_id);
                                    carregarRotinasParaModal(t.store_id);
                                    // Busca rotina atual vinculada à tarefa
                                    const { data: ri } = await supabase.from('routine_items').select('routine_id').eq('task_template_id', t.id).maybeSingle();
                                    setEditTarefaRotina(ri?.routine_id || "");
                                    setModalEditarTarefaOpen(true);
                                }} className="text-blue-600 p-2 hover:bg-blue-50 rounded-full"><Pencil size={18} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>


            {/* MODAL NOVA TAREFA (Completo e Corrigido) */}
            {
                modalNovaTarefaOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                        <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-lg text-slate-800 max-h-[90dvh] overflow-y-auto">
                            <h3 className="font-bold text-xl mb-4">Nova Tarefa</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loja</label>
                                    <select className="border p-2 w-full rounded bg-white" onChange={e => { const id = e.target.value; setNovaTarefa({ ...novaTarefa, loja: id }); carregarCargosParaModal(id); carregarRotinasParaModal(id); setNovaTarefaRotina(""); }}><option>Selecione...</option>{lojas.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cargo</label>
                                    <select className="border p-2 w-full rounded bg-white" onChange={e => setNovaTarefa({ ...novaTarefa, cargo: e.target.value })}><option>Selecione...</option>{cargosDisponiveis.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título</label>
                                <input className="border p-2 w-full rounded" placeholder="Ex: Limpar Freezer" onChange={e => setNovaTarefa({ ...novaTarefa, titulo: e.target.value })} />
                            </div>

                            <div className="mb-3">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Instruções</label>
                                <textarea className="border p-2 w-full rounded h-20" placeholder="Detalhes..." onChange={e => setNovaTarefa({ ...novaTarefa, desc: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Frequência</label>
                                    <select className="border p-2 w-full rounded bg-white" onChange={e => setNovaTarefa({ ...novaTarefa, freq: e.target.value })}>
                                        <option value="daily">Diária</option>
                                        <option value="weekly">Semanal</option>
                                        <option value="monthly">Mensal</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hora Limite</label>
                                    <input type="time" className="border p-2 w-full rounded" onChange={e => setNovaTarefa({ ...novaTarefa, hora: e.target.value })} />
                                </div>
                            </div>

                            {/* Recorrência Condicional */}
                            {novaTarefa.freq === 'weekly' && (
                                <div className="mb-4 bg-purple-50 p-3 rounded">
                                    <label className="block text-xs font-bold text-purple-700 uppercase mb-1">Dia da Semana</label>
                                    <select className="border p-2 w-full rounded bg-white" onChange={e => setNovaTarefa({ ...novaTarefa, diaSemana: e.target.value })}>
                                        <option value="">Selecione...</option>
                                        <option value="1">Segunda</option><option value="2">Terça</option><option value="3">Quarta</option><option value="4">Quinta</option><option value="5">Sexta</option><option value="6">Sábado</option><option value="7">Domingo</option>
                                    </select>
                                </div>
                            )}
                            {novaTarefa.freq === 'monthly' && (
                                <div className="mb-4 bg-purple-50 p-3 rounded">
                                    <label className="block text-xs font-bold text-purple-700 uppercase mb-1">Dia do Mês</label>
                                    <select className="border p-2 w-full rounded bg-white" onChange={e => setNovaTarefa({ ...novaTarefa, diaMes: e.target.value })}>
                                        <option value="">Selecione...</option>
                                        {[...Array(31)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center gap-2 mb-3">
                                <input type="checkbox" id="checkFoto" className="w-5 h-5" onChange={e => setNovaTarefa({ ...novaTarefa, foto: e.target.checked })} />
                                <label htmlFor="checkFoto" className="text-sm font-bold text-slate-600">Exigir Foto Comprobatória</label>
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                <input type="checkbox" id="checkWhatsAppNew" className="w-5 h-5 accent-green-600" checked={novaTarefa.notifyWhatsapp} onChange={e => setNovaTarefa({ ...novaTarefa, notifyWhatsapp: e.target.checked })} />
                                <label htmlFor="checkWhatsAppNew" className="text-sm font-bold text-green-700 flex items-center gap-1"><MessageCircle size={14} /> Notificar via WhatsApp</label>
                            </div>

                            {rotinasDisponiveis.length > 0 && (
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rotina <span className="text-slate-300 font-normal normal-case">(opcional)</span></label>
                                    <select className="border p-2 w-full rounded bg-white" value={novaTarefaRotina} onChange={e => setNovaTarefaRotina(e.target.value)}>
                                        <option value="">Nenhuma rotina</option>
                                        {rotinasDisponiveis.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                                    </select>
                                </div>
                            )}

                            <button onClick={salvarNovaTarefa} className="bg-gradient-to-r from-purple-500 to-violet-600 text-white w-full py-3 rounded-xl font-bold min-h-[48px] shadow-md hover:shadow-lg hover:from-purple-600 hover:to-violet-700 transition-all active:scale-[0.98]">Salvar Tarefa</button>
                            <button onClick={() => setModalNovaTarefaOpen(false)} className="mt-2 w-full text-slate-400 hover:text-slate-600 py-3 min-h-[44px] font-semibold rounded-xl hover:bg-slate-50 transition-all">Cancelar</button>
                        </div>
                    </div>
                )
            }

            {/* MODAL IMPORTAR CSV */}
            {
                modalImportarOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-lg text-slate-800 max-h-[90dvh] overflow-y-auto">
                            <div className="flex justify-between mb-4"><h3 className="font-bold text-xl">Importar Tarefas</h3><button onClick={() => setModalImportarOpen(false)}><X /></button></div>
                            <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100"><p className="text-sm font-bold text-blue-800 mb-2">Instruções:</p><button onClick={baixarExemploCSV} className="flex items-center gap-2 text-xs bg-blue-600 text-white px-3 py-2 rounded-lg font-bold"><Download size={14} /> Baixar Modelo CSV</button></div>
                            <input type="file" accept=".csv" onChange={processarImportacaoCSV} disabled={importando} className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors" />
                            {logImportacao.length > 0 && (<div className="mt-6 max-h-40 overflow-y-auto bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono">{logImportacao.map((log, i) => <div key={i}>{log}</div>)}</div>)}
                        </div>
                    </div>
                )
            }

            {/* MODAL EDITAR TAREFA */}
            {
                modalEditarTarefaOpen && editTarefa && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                        <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-lg text-slate-800 max-h-[90dvh] overflow-y-auto">
                            <h3 className="font-bold text-xl mb-4">Editar Tarefa</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loja</label>
                                    <select className="border p-2 w-full rounded bg-white" value={editTarefa.store_id} onChange={e => { const id = e.target.value; setEditTarefa({ ...editTarefa, store_id: id }); carregarCargosParaModal(id); carregarRotinasParaModal(id); setEditTarefaRotina(""); }}><option>Selecione...</option>{lojas.filter(l => l.active).map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}</select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cargo</label>
                                    <select className="border p-2 w-full rounded bg-white" value={editTarefa.role_id} onChange={e => setEditTarefa({ ...editTarefa, role_id: e.target.value })}><option>Selecione...</option>{cargosDisponiveis.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título</label>
                                <input className="border p-2 w-full rounded bg-white" value={editTarefa.title} onChange={e => setEditTarefa({ ...editTarefa, title: e.target.value })} />
                            </div>

                            <div className="mb-3">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                                <textarea className="border p-2 w-full rounded bg-white h-20" value={editTarefa.description} onChange={e => setEditTarefa({ ...editTarefa, description: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Frequência</label>
                                    <select className="border p-2 w-full rounded bg-white" value={editTarefa.frequency_type} onChange={e => setEditTarefa({ ...editTarefa, frequency_type: e.target.value })}><option value="daily">Diária</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hora Limite</label>
                                    <input type="time" className="border p-2 w-full rounded bg-white" value={editTarefa.due_time || ""} onChange={e => setEditTarefa({ ...editTarefa, due_time: e.target.value })} />
                                </div>
                            </div>

                            {editTarefa.frequency_type === 'weekly' && (<div className="mb-4 bg-purple-50 p-3 rounded"><label className="block text-xs font-bold text-purple-700 uppercase mb-1">Dia da Semana</label><select className="border p-2 w-full rounded bg-white" value={editTarefa.specific_day_of_week || ""} onChange={e => setEditTarefa({ ...editTarefa, specific_day_of_week: e.target.value })}><option value="">Selecione...</option><option value="1">Segunda</option><option value="2">Terça</option><option value="3">Quarta</option><option value="4">Quinta</option><option value="5">Sexta</option><option value="6">Sábado</option><option value="7">Domingo</option></select></div>)}
                            {editTarefa.frequency_type === 'monthly' && (<div className="mb-4 bg-purple-50 p-3 rounded"><label className="block text-xs font-bold text-purple-700 uppercase mb-1">Dia do Mês</label><select className="border p-2 w-full rounded bg-white" value={editTarefa.specific_day_of_month || ""} onChange={e => setEditTarefa({ ...editTarefa, specific_day_of_month: e.target.value })}><option value="">Selecione...</option>{[...Array(31)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></div>)}

                            <div className="flex items-center gap-2 mb-3">
                                <input type="checkbox" checked={editTarefa.requires_photo_evidence} onChange={e => setEditTarefa({ ...editTarefa, requires_photo_evidence: e.target.checked })} />
                                <label className="text-sm font-bold text-slate-600">Exigir Foto Comprobatória</label>
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                <input type="checkbox" className="accent-green-600" checked={editTarefa.notify_whatsapp || false} onChange={e => setEditTarefa({ ...editTarefa, notify_whatsapp: e.target.checked })} />
                                <label className="text-sm font-bold text-green-700 flex items-center gap-1"><MessageCircle size={14} /> Notificar via WhatsApp</label>
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rotina <span className="text-slate-300 font-normal normal-case">(opcional)</span></label>
                                <select className="border p-2 w-full rounded bg-white" value={editTarefaRotina} onChange={e => setEditTarefaRotina(e.target.value)}>
                                    <option value="">Nenhuma rotina</option>
                                    {rotinasDisponiveis.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                                </select>
                                {rotinasDisponiveis.length === 0 && (
                                    <p className="text-[10px] text-slate-400 mt-1">Selecione uma loja para ver as rotinas disponíveis.</p>
                                )}
                            </div>

                            <button onClick={salvarEdicaoTarefa} className="bg-gradient-to-r from-purple-500 to-violet-600 text-white px-4 py-3 rounded-xl w-full font-bold min-h-[48px] shadow-md hover:shadow-lg hover:from-purple-600 hover:to-violet-700 transition-all active:scale-[0.98]">Salvar Alterações</button>
                            <button onClick={() => setModalEditarTarefaOpen(false)} className="mt-2 text-slate-400 hover:text-slate-600 w-full py-3 min-h-[44px] font-semibold rounded-xl hover:bg-slate-50 transition-all">Cancelar</button>
                        </div>
                    </div>
                )
            }
            {/* MODAL RESULTADO DA GERAÇÃO */}
            {modalResultadoOpen && (() => {
                const isError = !resultadoGeracao.sucesso;
                const isEmpty = resultadoGeracao.sucesso && resultadoGeracao.total === 0;
                const isSuccess = resultadoGeracao.sucesso && resultadoGeracao.total > 0;

                return (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

                            {/* Header */}
                            <div className={`p-5 text-center ${isSuccess ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                : isEmpty ? 'bg-gradient-to-br from-slate-100 to-slate-200'
                                    : 'bg-gradient-to-br from-red-500 to-orange-600'
                                }`}>
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${isSuccess ? 'bg-white/20'
                                    : isEmpty ? 'bg-white shadow-sm border border-slate-200'
                                        : 'bg-white/20'
                                    }`}>
                                    {isSuccess && <CheckCircle2 size={32} className="text-white" />}
                                    {isEmpty && <CalendarCheck size={32} className="text-slate-400" />}
                                    {isError && <AlertTriangle size={32} className="text-white" />}
                                </div>
                                <h3 className={`text-xl font-black ${isEmpty ? 'text-slate-700' : 'text-white'}`}>
                                    {isSuccess ? "Rotina Gerada!" : isEmpty ? "Tudo em dia!" : "Erro na Geração"}
                                </h3>
                                {isSuccess && (
                                    <p className="text-white/80 text-sm mt-1">
                                        {resultadoGeracao.total} tarefa{resultadoGeracao.total !== 1 ? 's' : ''} gerada{resultadoGeracao.total !== 1 ? 's' : ''} para hoje
                                    </p>
                                )}
                                {isEmpty && (
                                    <p className="text-slate-500 text-sm mt-1">
                                        Todas as tarefas de hoje já estão geradas.
                                    </p>
                                )}
                            </div>

                            {/* Conteúdo */}
                            <div className="p-5">
                                {isSuccess && resultadoGeracao.porLoja.length > 0 && (
                                    <>
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-3">Tarefas por Loja</p>
                                        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                                            {resultadoGeracao.porLoja.map((loja, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
                                                            <Store size={16} className="text-teal-600" />
                                                        </div>
                                                        <span className="font-bold text-slate-700 text-sm">{loja.nome}</span>
                                                    </div>
                                                    <span className="bg-teal-600 text-white text-xs font-black px-2.5 py-1 rounded-full">
                                                        {loja.count} tarefa{loja.count !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                                {isEmpty && (
                                    <div className="flex flex-col items-center text-center py-3 gap-2">
                                        <p className="text-slate-600 text-sm">
                                            Nenhuma tarefa nova precisa ser criada agora. O sistema só gera tarefas que ainda não existem para o dia de hoje.
                                        </p>
                                        <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mt-1">
                                            Caso precise criar uma tarefa urgente, use o botão <strong>"Criar Tarefa"</strong>.
                                        </p>
                                    </div>
                                )}
                                {isError && (
                                    <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                                        {resultadoGeracao.mensagem}
                                    </p>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-5 pb-5">
                                <button
                                    onClick={() => setModalResultadoOpen(false)}
                                    className={`w-full py-3 rounded-xl font-bold min-h-[48px] transition-all active:scale-95 ${isSuccess ? 'bg-teal-600 hover:bg-teal-700 text-white'
                                        : isEmpty ? 'bg-slate-800 hover:bg-slate-900 text-white'
                                            : 'bg-slate-600 hover:bg-slate-700 text-white'
                                        }`}
                                >
                                    Entendido
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* MODAL TAREFA SALVA COM SUCESSO */}
            {modalTarefaSalvaOpen && tarefaSalvaResumo && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="p-5 text-center bg-gradient-to-br from-emerald-500 to-teal-600">
                            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 size={32} className="text-white" />
                            </div>
                            <h3 className="text-xl font-black text-white">Tarefa Criada!</h3>
                            <p className="text-white/80 text-sm mt-1">A tarefa foi salva com sucesso no sistema.</p>
                        </div>

                        {/* Resumo */}
                        <div className="p-5 space-y-3">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Resumo da Tarefa</p>

                            <div className="bg-slate-50 rounded-lg border border-slate-100 p-4 space-y-2.5">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Título</span>
                                    <p className="font-bold text-slate-800">{tarefaSalvaResumo.titulo}</p>
                                </div>

                                {tarefaSalvaResumo.descricao && (
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Descrição</span>
                                        <p className="text-sm text-slate-600">{tarefaSalvaResumo.descricao}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Loja</span>
                                        <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                            <Store size={14} className="text-teal-600" /> {tarefaSalvaResumo.loja}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Cargo</span>
                                        <p className="text-sm font-bold text-slate-700">{tarefaSalvaResumo.cargo}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-1">
                                    <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded border border-blue-200 font-bold uppercase">
                                        {tarefaSalvaResumo.frequencia}
                                    </span>
                                    {tarefaSalvaResumo.horario && (
                                        <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded border border-slate-300 font-bold uppercase">
                                            ⏰ Até {tarefaSalvaResumo.horario}
                                        </span>
                                    )}
                                    {tarefaSalvaResumo.diaSemana && (
                                        <span className="bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded border border-orange-200 font-bold uppercase">
                                            {tarefaSalvaResumo.diaSemana}
                                        </span>
                                    )}
                                    {tarefaSalvaResumo.diaMes && (
                                        <span className="bg-pink-100 text-pink-800 text-[10px] px-2 py-0.5 rounded border border-pink-200 font-bold uppercase">
                                            Dia {tarefaSalvaResumo.diaMes}
                                        </span>
                                    )}
                                    {tarefaSalvaResumo.foto && (
                                        <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded border border-purple-200 font-bold uppercase">
                                            📷 Exige Foto
                                        </span>
                                    )}
                                    {tarefaSalvaResumo.whatsapp && (
                                        <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded border border-green-200 font-bold uppercase flex items-center gap-0.5">
                                            <MessageCircle size={10} /> WhatsApp
                                        </span>
                                    )}
                                    {tarefaSalvaResumo.rotina && (
                                        <span className="bg-violet-100 text-violet-800 text-[10px] px-2 py-0.5 rounded border border-violet-200 font-bold uppercase flex items-center gap-0.5">
                                            📋 {tarefaSalvaResumo.rotina}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 pb-5">
                            <button
                                onClick={() => setModalTarefaSalvaOpen(false)}
                                className="w-full py-3 rounded-xl font-bold text-white min-h-[48px] transition-all active:scale-95 bg-teal-600 hover:bg-teal-700"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* WIZARD */}
            {wizardOpen && (
                <TaskWizard
                    lojas={lojas}
                    roles={roles}
                    onClose={() => setWizardOpen(false)}
                    onSaved={(resumo) => {
                        setWizardOpen(false);
                        setTarefaSalvaResumo(resumo);
                        setModalTarefaSalvaOpen(true);
                        buscarTarefas();
                    }}
                />
            )}
        </>
    );
}