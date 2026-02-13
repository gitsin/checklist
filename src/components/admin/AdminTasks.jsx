import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { ArrowLeft, Plus, Pencil, ToggleLeft, ToggleRight, FileUp, PlayCircle, Download, X, MessageCircle, CheckCircle2, Store, AlertTriangle } from "lucide-react";

export default function AdminTasks({ goBack, lojas, roles }) {
    const [listaTemplates, setListaTemplates] = useState([]);
    const [filtroLojaTarefa, setFiltroLojaTarefa] = useState("");
    const [filtroCargoTarefa, setFiltroCargoTarefa] = useState("");
    const [cargosFiltroDisponiveis, setCargosFiltroDisponiveis] = useState([]);

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

    // --- Lógica de Filtros e Carregamento ---

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

    // --- Salvar e Editar ---

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
            notify_whatsapp: novaTarefa.notifyWhatsapp,
            active: true
        });
        if (error) {
            alert(error.message);
        } else {
            // Monta resumo para exibir no modal
            const freqMap = { daily: 'Diária', weekly: 'Semanal', monthly: 'Mensal' };
            const mapaDiasSemana = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado', 7: 'Domingo' };
            const lojaNome = lojas.find(l => l.id === novaTarefa.loja)?.name || 'N/A';
            const cargoNome = roles.find(r => r.id === novaTarefa.cargo)?.name || 'N/A';

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
            });
            setModalNovaTarefaOpen(false);
            setModalTarefaSalvaOpen(true);
            buscarTarefas();
        }
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
        if (error) alert(error.message); else { setModalEditarTarefaOpen(false); buscarTarefas(); }
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

                if (!store_id || !role_id) {
                    logs.push(`Erro linha ${i + 1}: Loja/Cargo não encontrados.`);
                    continue;
                }
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

    const mapaDiasSemana = { 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb", 7: "Dom" };

    return (
        <>
            <div className="animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between gap-3 mb-6">
                    <button onClick={goBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors min-h-[44px]"><ArrowLeft /> Voltar</button>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => setModalImportarOpen(true)} className="bg-slate-600 px-3 sm:px-4 py-2 rounded font-bold hover:bg-slate-500 flex gap-2 items-center text-sm min-h-[44px]"><FileUp size={18} /> Importar</button>
                        <button onClick={gerarRotina} disabled={gerandoRotina} className="bg-green-600 px-3 sm:px-4 py-2 rounded font-bold hover:bg-green-500 flex gap-2 items-center text-sm min-h-[44px]"><PlayCircle size={18} /> {gerandoRotina ? '...' : 'Gerar'}</button>
                        <button onClick={() => { setNovaTarefa({ titulo: "", desc: "", freq: "daily", loja: "", cargo: "", hora: "", foto: false, notifyWhatsapp: false }); setCargosDisponiveis([]); setModalNovaTarefaOpen(true); }} className="bg-purple-600 px-3 sm:px-4 py-2 rounded font-bold hover:bg-purple-500 flex gap-2 items-center text-sm min-h-[44px]"><Plus size={18} /> Nova</button>
                    </div>
                </div>

                {/* Filtros */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Loja</label>
                        <select className="bg-slate-50 p-2 rounded-lg w-full border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors" value={filtroLojaTarefa} onChange={e => { setFiltroLojaTarefa(e.target.value); carregarCargosDoFiltro(e.target.value); }}>
                            <option value="">Selecione a Loja...</option>
                            {lojas.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Cargo</label>
                        <select className="bg-slate-50 p-2 rounded-lg w-full border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors" value={filtroCargoTarefa} onChange={e => setFiltroCargoTarefa(e.target.value)} disabled={!filtroLojaTarefa}>
                            <option value="">Todos Cargos</option>
                            {cargosFiltroDisponiveis.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Lista de Tarefas */}
                <div className="grid gap-3">
                    {listaTemplates.map(t => (
                        <div key={t.id} className={`p-3 sm:p-4 rounded flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 ${t.active ? 'bg-white text-slate-800 border-l-4 border-green-500' : 'bg-slate-300 text-slate-500 border-l-4 border-slate-500'}`}>
                            <div>
                                <div className="font-bold flex items-center gap-2">
                                    {t.title}
                                    {t.frequency_type === 'daily' && <span className="bg-blue-100 text-blue-800 text-[9px] px-1 rounded border border-blue-300 font-bold uppercase">Diária {t.due_time ? `- ${t.due_time.slice(0, 5)}` : ''}</span>}
                                    {t.frequency_type === 'weekly' && <span className="bg-orange-100 text-orange-800 text-[9px] px-1 rounded border border-orange-300 font-bold uppercase">{mapaDiasSemana[t.specific_day_of_week]}</span>}
                                    {t.frequency_type === 'monthly' && <span className="bg-pink-100 text-pink-800 text-[9px] px-1 rounded border border-pink-300 font-bold uppercase">Dia {t.specific_day_of_month}</span>}
                                </div>
                                <div className="text-xs text-slate-500">{t.description}</div>
                                <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">{t.roles?.name} {t.requires_photo_evidence && '• 📷 Exige Foto'}{t.notify_whatsapp && <span className="ml-1 inline-flex items-center gap-0.5 text-green-600"><MessageCircle size={10} /> WhatsApp</span>}</div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => toggleStatusTarefa(t)}>{t.active ? <ToggleRight className="text-green-600" size={28} /> : <ToggleLeft size={28} />}</button>
                                <button onClick={() => { setEditTarefa(t); carregarCargosParaModal(t.store_id); setModalEditarTarefaOpen(true); }} className="text-blue-600 p-2 hover:bg-blue-50 rounded-full"><Pencil size={18} /></button>
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
                                    <select className="border p-2 w-full rounded bg-white" onChange={e => { setNovaTarefa({ ...novaTarefa, loja: e.target.value }); carregarCargosParaModal(e.target.value) }}><option>Selecione...</option>{lojas.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
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

                            <button onClick={salvarNovaTarefa} className="bg-purple-600 text-white w-full py-3 rounded font-bold min-h-[48px]">Salvar Tarefa</button>
                            <button onClick={() => setModalNovaTarefaOpen(false)} className="mt-2 w-full text-slate-500 py-3 min-h-[44px]">Cancelar</button>
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
                                    <select className="border p-2 w-full rounded bg-white" value={editTarefa.store_id} onChange={e => { setEditTarefa({ ...editTarefa, store_id: e.target.value }); carregarCargosParaModal(e.target.value) }}><option>Selecione...</option>{lojas.filter(l => l.active).map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}</select>
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

                            <button onClick={salvarEdicaoTarefa} className="bg-purple-600 text-white px-4 py-3 rounded w-full font-bold min-h-[48px]">Salvar Alterações</button>
                            <button onClick={() => setModalEditarTarefaOpen(false)} className="mt-2 text-slate-500 w-full py-3 min-h-[44px]">Cancelar</button>
                        </div>
                    </div>
                )
            }
            {/* MODAL RESULTADO DA GERAÇÃO */}
            {modalResultadoOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        {/* Header do modal */}
                        <div className={`p-5 text-center ${resultadoGeracao.sucesso ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-red-500 to-orange-600'}`}>
                            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                                {resultadoGeracao.sucesso
                                    ? <CheckCircle2 size={32} className="text-white" />
                                    : <AlertTriangle size={32} className="text-white" />
                                }
                            </div>
                            <h3 className="text-xl font-black text-white">
                                {resultadoGeracao.sucesso ? "Rotina Gerada!" : "Erro na Geração"}
                            </h3>
                            {resultadoGeracao.sucesso && (
                                <p className="text-white/80 text-sm mt-1">
                                    {resultadoGeracao.total} tarefa{resultadoGeracao.total !== 1 ? 's' : ''} no total para hoje
                                </p>
                            )}
                        </div>

                        {/* Conteúdo */}
                        <div className="p-5">
                            {resultadoGeracao.sucesso && resultadoGeracao.porLoja.length > 0 ? (
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
                            ) : !resultadoGeracao.sucesso ? (
                                <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                                    {resultadoGeracao.mensagem}
                                </p>
                            ) : (
                                <p className="text-slate-500 text-sm text-center py-4">
                                    Nenhuma tarefa foi gerada para hoje.
                                </p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 pb-5">
                            <button
                                onClick={() => setModalResultadoOpen(false)}
                                className={`w-full py-3 rounded-xl font-bold text-white min-h-[48px] transition-all active:scale-95 ${resultadoGeracao.sucesso
                                    ? 'bg-teal-600 hover:bg-teal-700'
                                    : 'bg-slate-600 hover:bg-slate-700'
                                    }`}
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
        </>
    );
}