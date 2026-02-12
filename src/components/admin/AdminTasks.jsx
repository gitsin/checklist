import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { ArrowLeft, Plus, Pencil, ToggleLeft, ToggleRight, FileUp, PlayCircle, Download, X, MessageCircle } from "lucide-react";

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
        const { error } = await supabase.rpc('generate_daily_checklist');
        setGerandoRotina(false);
        if (error) alert(error.message); else alert("Rotina do dia gerada com sucesso!");
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
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between gap-3 mb-6">
                <button onClick={goBack} className="flex items-center gap-2 text-slate-400 hover:text-white min-h-[44px]"><ArrowLeft /> Voltar</button>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setModalImportarOpen(true)} className="bg-slate-600 px-3 sm:px-4 py-2 rounded font-bold hover:bg-slate-500 flex gap-2 items-center text-sm min-h-[44px]"><FileUp size={18} /> Importar</button>
                    <button onClick={gerarRotina} disabled={gerandoRotina} className="bg-green-600 px-3 sm:px-4 py-2 rounded font-bold hover:bg-green-500 flex gap-2 items-center text-sm min-h-[44px]"><PlayCircle size={18} /> {gerandoRotina ? '...' : 'Gerar'}</button>
                    <button onClick={() => { setNovaTarefa({ titulo: "", desc: "", freq: "daily", loja: "", cargo: "", hora: "", foto: false, notifyWhatsapp: false }); setCargosDisponiveis([]); setModalNovaTarefaOpen(true); }} className="bg-purple-600 px-3 sm:px-4 py-2 rounded font-bold hover:bg-purple-500 flex gap-2 items-center text-sm min-h-[44px]"><Plus size={18} /> Nova</button>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 bg-slate-700 p-3 sm:p-4 rounded border border-slate-600">
                <div className="flex-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Loja</label>
                    <select className="bg-slate-800 p-2 rounded w-full border border-slate-500" value={filtroLojaTarefa} onChange={e => { setFiltroLojaTarefa(e.target.value); carregarCargosDoFiltro(e.target.value); }}>
                        <option value="">Selecione a Loja...</option>
                        {lojas.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Cargo</label>
                    <select className="bg-slate-800 p-2 rounded w-full border border-slate-500" value={filtroCargoTarefa} onChange={e => setFiltroCargoTarefa(e.target.value)} disabled={!filtroLojaTarefa}>
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

            {/* MODAL NOVA TAREFA (Completo e Corrigido) */}
            {modalNovaTarefaOpen && (
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
            )}

            {/* MODAL IMPORTAR CSV */}
            {modalImportarOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-lg text-slate-800 max-h-[90dvh] overflow-y-auto">
                        <div className="flex justify-between mb-4"><h3 className="font-bold text-xl">Importar Tarefas</h3><button onClick={() => setModalImportarOpen(false)}><X /></button></div>
                        <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100"><p className="text-sm font-bold text-blue-800 mb-2">Instruções:</p><button onClick={baixarExemploCSV} className="flex items-center gap-2 text-xs bg-blue-600 text-white px-3 py-2 rounded-lg font-bold"><Download size={14} /> Baixar Modelo CSV</button></div>
                        <input type="file" accept=".csv" onChange={processarImportacaoCSV} disabled={importando} className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors" />
                        {logImportacao.length > 0 && (<div className="mt-6 max-h-40 overflow-y-auto bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono">{logImportacao.map((log, i) => <div key={i}>{log}</div>)}</div>)}
                    </div>
                </div>
            )}

            {/* MODAL EDITAR TAREFA */}
            {modalEditarTarefaOpen && editTarefa && (
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
            )}
        </div>
    );
}