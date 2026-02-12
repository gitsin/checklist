import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { ArrowLeft, Plus, Pencil, ToggleLeft, ToggleRight, Layers, Clock, Trash2, Eye, X, CheckSquare, MessageCircle } from "lucide-react";

export default function AdminRoutines({ goBack, lojas }) {
    const [listaRotinas, setListaRotinas] = useState([]);
    const [filtroLojaRotina, setFiltroLojaRotina] = useState("");

    // Modais
    const [modalNovaRotinaOpen, setModalNovaRotinaOpen] = useState(false);
    const [modalEditarRotinaOpen, setModalEditarRotinaOpen] = useState(false);
    const [modalVisualizarOpen, setModalVisualizarOpen] = useState(false); // NOVO

    // Dados
    const [novaRotina, setNovaRotina] = useState({ store_id: "", title: "", description: "", start_time: "", deadline_time: "", icon: "sun", notify_whatsapp: false });
    const [editRotina, setEditRotina] = useState(null);
    const [visualizarRotina, setVisualizarRotina] = useState(null); // NOVO

    // Itens
    const [tarefasParaRotina, setTarefasParaRotina] = useState([]);
    const [itensSelecionados, setItensSelecionados] = useState([]);
    const [tarefaSelecionadaId, setTarefaSelecionadaId] = useState("");

    // --- BUSCAS ---
    async function buscarRotinas() {
        if (!filtroLojaRotina) { setListaRotinas([]); return; }
        const { data, error } = await supabase.from('routine_templates').select(`*, routine_items(count)`).eq('store_id', filtroLojaRotina).order('created_at', { ascending: false });
        if (error) alert(error.message); else setListaRotinas(data || []);
    }
    useEffect(() => { buscarRotinas(); }, [filtroLojaRotina]);

    async function carregarTarefasParaRotina(storeId) {
        if (!storeId) { setTarefasParaRotina([]); return; }
        const { data } = await supabase.from('task_templates').select(`id, title, role:roles(name)`).eq('store_id', storeId).eq('active', true).order('title');
        setTarefasParaRotina(data || []);
    }

    // --- AÇÕES ---
    function adicionarItemNaRotina() {
        if (!tarefaSelecionadaId) return;
        const task = tarefasParaRotina.find(t => t.id === tarefaSelecionadaId);
        if (!task) return;
        if (itensSelecionados.some(i => i.task_template_id === task.id)) return;
        setItensSelecionados([...itensSelecionados, { task_template_id: task.id, title: task.title, role_name: task.role?.name }]);
        setTarefaSelecionadaId("");
    }

    function removerItemDaRotina(index) {
        const novaLista = [...itensSelecionados];
        novaLista.splice(index, 1);
        setItensSelecionados(novaLista);
    }

    async function salvarNovaRotina() {
        if (!novaRotina.store_id || !novaRotina.title) return alert("Loja e Título são obrigatórios");
        const { data: rotinaCriada, error: errRotina } = await supabase.from('routine_templates').insert({
            store_id: novaRotina.store_id, title: novaRotina.title, description: novaRotina.description,
            start_time: novaRotina.start_time || null, deadline_time: novaRotina.deadline_time || null, icon: novaRotina.icon,
            notify_whatsapp: novaRotina.notify_whatsapp
        }).select().single();
        if (errRotina) return alert("Erro ao criar rotina: " + errRotina.message);
        if (itensSelecionados.length > 0) {
            const itensPayload = itensSelecionados.map((item, idx) => ({ routine_id: rotinaCriada.id, task_template_id: item.task_template_id, order_index: idx }));
            await supabase.from('routine_items').insert(itensPayload);
        }
        setModalNovaRotinaOpen(false); buscarRotinas();
        setNovaRotina({ store_id: "", title: "", description: "", start_time: "", deadline_time: "", icon: "sun", notify_whatsapp: false });
        setItensSelecionados([]);
    }

    async function toggleStatusRotina(rotina) {
        await supabase.from('routine_templates').update({ active: !rotina.active }).eq('id', rotina.id);
        buscarRotinas();
    }

    // --- ABRIR MODAIS ---
    async function abrirEdicaoRotina(rotina) {
        setEditRotina(rotina);
        const { data: itens } = await supabase.from('routine_items').select('*, task:task_templates(title, role:roles(name))').eq('routine_id', rotina.id).order('order_index');
        const itensFormatados = itens.map(i => ({ task_template_id: i.task_template_id, title: i.task?.title, role_name: i.task?.role?.name }));
        setItensSelecionados(itensFormatados);
        await carregarTarefasParaRotina(rotina.store_id);
        setModalEditarRotinaOpen(true);
    }

    async function salvarEdicaoRotina() {
        const { error: errHeader } = await supabase.from('routine_templates').update({
            title: editRotina.title, description: editRotina.description, start_time: editRotina.start_time || null,
            deadline_time: editRotina.deadline_time || null, icon: editRotina.icon,
            notify_whatsapp: editRotina.notify_whatsapp
        }).eq('id', editRotina.id);
        if (errHeader) return alert(errHeader.message);

        await supabase.from('routine_items').delete().eq('routine_id', editRotina.id);
        if (itensSelecionados.length > 0) {
            const itensPayload = itensSelecionados.map((item, idx) => ({ routine_id: editRotina.id, task_template_id: item.task_template_id, order_index: idx }));
            await supabase.from('routine_items').insert(itensPayload);
        }
        setModalEditarRotinaOpen(false); buscarRotinas();
    }

    // --- VISUALIZAR (NOVO) ---
    async function abrirVisualizacao(rotina) {
        // Carrega dados completos para leitura
        const { data: itens } = await supabase.from('routine_items').select('*, task:task_templates(title, description, role:roles(name))').eq('routine_id', rotina.id).order('order_index');
        setVisualizarRotina({ ...rotina, itens: itens || [] });
        setModalVisualizarOpen(true);
    }

    return (
        <>
            <div className="animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between gap-3 mb-6">
                    <button onClick={goBack} className="flex items-center gap-2 text-slate-400 hover:text-white min-h-[44px]"><ArrowLeft /> Voltar</button>
                    <button onClick={() => { setNovaRotina({ store_id: "", title: "", description: "", start_time: "", deadline_time: "", icon: "sun", notify_whatsapp: false }); setItensSelecionados([]); setModalNovaRotinaOpen(true); }} className="bg-amber-600 px-4 py-2 rounded font-bold hover:bg-amber-500 flex gap-2 items-center min-h-[44px] justify-center"><Plus size={18} /> Nova Rotina</button>
                </div>

                <div className="bg-slate-700 p-4 rounded border border-slate-600 mb-6">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Filtrar por Loja</label>
                    <select className="bg-slate-800 p-2 rounded w-full border border-slate-500" value={filtroLojaRotina} onChange={e => setFiltroLojaRotina(e.target.value)}>
                        <option value="">Selecione a Loja...</option>
                        {lojas.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {listaRotinas.map(rotina => (
                        <div key={rotina.id} className={`p-4 rounded border-t-4 shadow-lg flex flex-col justify-between h-full ${rotina.active ? 'bg-white border-amber-500' : 'bg-slate-300 border-slate-500'}`}>
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <div className={`p-2 rounded-full ${rotina.active ? 'bg-amber-100 text-amber-700' : 'bg-slate-400 text-slate-600'}`}><Layers size={24} /></div>
                                    <button onClick={() => toggleStatusRotina(rotina)}>{rotina.active ? <ToggleRight className="text-green-600" size={28} /> : <ToggleLeft size={28} />}</button>
                                </div>
                                <h3 className={`font-bold text-lg ${rotina.active ? 'text-slate-800' : 'text-slate-500'}`}>{rotina.title}</h3>
                                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{rotina.description}</p>
                                <div className="flex gap-2 text-xs font-mono text-slate-600 bg-slate-100 p-2 rounded mb-3">
                                    <span className="flex items-center gap-1"><Clock size={12} /> {rotina.start_time?.slice(0, 5) || '--:--'} - {rotina.deadline_time?.slice(0, 5) || '--:--'}</span>
                                    {rotina.notify_whatsapp && <span className="flex items-center gap-1 text-green-600 font-bold"><MessageCircle size={12} /> WhatsApp</span>}
                                </div>
                            </div>

                            {/* RODAPÉ DO CARD COM AÇÕES */}
                            <div className="flex justify-between items-center border-t pt-3 mt-2">
                                <span className="text-xs font-bold text-slate-400 uppercase">{rotina.routine_items?.[0]?.count || 0} Tarefas</span>
                                <div className="flex gap-2">
                                    {/* BOTÃO VISUALIZAR (OLHO) */}
                                    <button onClick={() => abrirVisualizacao(rotina)} className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors" title="Visualizar Detalhes">
                                        <Eye size={20} />
                                    </button>
                                    {/* BOTÃO EDITAR (LÁPIS) */}
                                    <button onClick={() => abrirEdicaoRotina(rotina)} className="text-slate-500 hover:text-amber-600 hover:bg-amber-50 p-2 rounded transition-colors" title="Editar Rotina">
                                        <Pencil size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODAL NOVA ROTINA */}
            {modalNovaRotinaOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-2xl text-slate-800 p-4 sm:p-6 max-h-[95dvh] overflow-y-auto pb-safe">
                        <h3 className="font-bold text-xl mb-4">Nova Rotina</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <select className="border p-2 rounded w-full" value={novaRotina.store_id} onChange={e => { setNovaRotina({ ...novaRotina, store_id: e.target.value }); carregarTarefasParaRotina(e.target.value); }}><option value="">Loja...</option>{lojas.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
                            <input className="border p-2 rounded w-full" placeholder="Título" value={novaRotina.title} onChange={e => setNovaRotina({ ...novaRotina, title: e.target.value })} />
                        </div>
                        <div className="mb-4"><textarea className="border p-2 w-full rounded" placeholder="Descrição..." value={novaRotina.description} onChange={e => setNovaRotina({ ...novaRotina, description: e.target.value })} /></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div><label className="text-xs font-bold">Início</label><input type="time" className="border p-2 w-full rounded" value={novaRotina.start_time} onChange={e => setNovaRotina({ ...novaRotina, start_time: e.target.value })} /></div>
                            <div><label className="text-xs font-bold">Fim</label><input type="time" className="border p-2 w-full rounded" value={novaRotina.deadline_time} onChange={e => setNovaRotina({ ...novaRotina, deadline_time: e.target.value })} /></div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 mb-4">
                            <select className="border p-2 flex-1 rounded" value={tarefaSelecionadaId} onChange={e => setTarefaSelecionadaId(e.target.value)} disabled={!novaRotina.store_id}><option value="">Selecionar Tarefa...</option>{tarefasParaRotina.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
                            <button onClick={adicionarItemNaRotina} className="bg-slate-800 text-white px-4 py-2 rounded font-bold min-h-[44px] w-full sm:w-auto flex items-center justify-center" disabled={!tarefaSelecionadaId}><Plus /></button>
                        </div>
                        <ul className="mb-4 space-y-2">{itensSelecionados.map((item, idx) => <li key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded border"><span className="text-sm">{idx + 1}. {item.title}</span> <button onClick={() => removerItemDaRotina(idx)} className="text-red-500"><Trash2 size={16} /></button></li>)}</ul>
                        <div className="flex items-center gap-2 mb-6">
                            <input type="checkbox" id="checkWhatsAppRotina" className="w-5 h-5 accent-green-600" checked={novaRotina.notify_whatsapp} onChange={e => setNovaRotina({ ...novaRotina, notify_whatsapp: e.target.checked })} />
                            <label htmlFor="checkWhatsAppRotina" className="text-sm font-bold text-green-700 flex items-center gap-1"><MessageCircle size={14} /> Notificar via WhatsApp</label>
                        </div>
                        <button onClick={salvarNovaRotina} className="bg-amber-600 text-white w-full py-3 rounded font-bold min-h-[48px]">Salvar</button>
                        <button onClick={() => setModalNovaRotinaOpen(false)} className="mt-2 w-full text-slate-500 py-3 min-h-[44px]">Cancelar</button>
                    </div>
                </div>
            )}

            {/* MODAL EDITAR ROTINA */}
            {modalEditarRotinaOpen && editRotina && (
                <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-2xl text-slate-800 p-4 sm:p-6 max-h-[95dvh] overflow-y-auto pb-safe">
                        <h3 className="font-bold text-xl mb-4">Editar Rotina</h3>
                        <input className="border p-2 w-full mb-3 rounded" value={editRotina.title} onChange={e => setEditRotina({ ...editRotina, title: e.target.value })} />
                        <textarea className="border p-2 w-full mb-3 rounded" value={editRotina.description} onChange={e => setEditRotina({ ...editRotina, description: e.target.value })} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <input type="time" className="border p-2 w-full rounded" value={editRotina.start_time || ''} onChange={e => setEditRotina({ ...editRotina, start_time: e.target.value })} />
                            <input type="time" className="border p-2 w-full rounded" value={editRotina.deadline_time || ''} onChange={e => setEditRotina({ ...editRotina, deadline_time: e.target.value })} />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 mb-4">
                            <select className="border p-2 flex-1 rounded" value={tarefaSelecionadaId} onChange={e => setTarefaSelecionadaId(e.target.value)}><option value="">Adicionar Tarefa...</option>{tarefasParaRotina.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
                            <button onClick={adicionarItemNaRotina} className="bg-slate-800 text-white px-4 py-2 rounded font-bold min-h-[44px] w-full sm:w-auto flex items-center justify-center"><Plus /></button>
                        </div>
                        <ul className="mb-4 space-y-2">{itensSelecionados.map((item, idx) => <li key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded border"><span className="text-sm">{idx + 1}. {item.title}</span> <button onClick={() => removerItemDaRotina(idx)} className="text-red-500"><Trash2 size={16} /></button></li>)}</ul>
                        <div className="flex items-center gap-2 mb-6">
                            <input type="checkbox" className="w-5 h-5 accent-green-600" checked={editRotina.notify_whatsapp || false} onChange={e => setEditRotina({ ...editRotina, notify_whatsapp: e.target.checked })} />
                            <label className="text-sm font-bold text-green-700 flex items-center gap-1"><MessageCircle size={14} /> Notificar via WhatsApp</label>
                        </div>
                        <button onClick={salvarEdicaoRotina} className="bg-blue-600 text-white w-full py-3 rounded font-bold min-h-[48px]">Salvar Alterações</button>
                        <button onClick={() => setModalEditarRotinaOpen(false)} className="mt-2 w-full text-slate-500 py-3 min-h-[44px]">Cancelar</button>
                    </div>
                </div>
            )}

            {/* MODAL VISUALIZAR (Somente Leitura) */}
            {modalVisualizarOpen && visualizarRotina && (
                <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto backdrop-blur-sm">
                    <div className="bg-white rounded-t-xl sm:rounded-xl w-full sm:max-w-lg text-slate-800 shadow-2xl relative max-h-[95dvh] overflow-hidden flex flex-col">
                        <button onClick={() => setModalVisualizarOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 min-w-[44px] min-h-[44px] flex items-center justify-center"><X size={24} /></button>

                        <div className="p-6 border-b bg-amber-50 rounded-t-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <Layers className="text-amber-600" size={28} />
                                <h3 className="font-bold text-2xl text-slate-800">{visualizarRotina.title}</h3>
                            </div>
                            <p className="text-slate-600">{visualizarRotina.description}</p>
                            <div className="mt-4 flex gap-4 text-sm font-bold text-slate-500">
                                <span className="flex items-center gap-1"><Clock size={16} /> {visualizarRotina.start_time?.slice(0, 5)} - {visualizarRotina.deadline_time?.slice(0, 5)}</span>
                            </div>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <h4 className="font-bold text-slate-400 uppercase text-xs mb-4">Lista de Tarefas (Preview)</h4>
                            <div className="space-y-3">
                                {visualizarRotina.itens && visualizarRotina.itens.length > 0 ? (
                                    visualizarRotina.itens.map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-colors">
                                            <div className="mt-1 text-slate-300"><CheckSquare size={18} /></div>
                                            <div>
                                                <div className="font-bold text-slate-800">{item.task?.title}</div>
                                                <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.task?.description}</div>
                                                <div className="mt-1 inline-block bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 uppercase">{item.task?.role?.name}</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-slate-400 py-4">Esta rotina não tem tarefas.</p>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end pb-safe">
                            <button onClick={() => setModalVisualizarOpen(false)} className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg min-h-[48px]">Fechar</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}