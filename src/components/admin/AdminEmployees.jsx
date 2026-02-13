import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { ArrowLeft, Plus, Pencil, ToggleLeft, ToggleRight, ShieldCheck, User, Phone } from "lucide-react";

// Adicionei a prop 'initialTab' aqui embaixo
export default function AdminEmployees({ goBack, lojas, roles, onUpdate, initialTab = 'colaboradores' }) {

    // O estado inicial agora respeita o que foi pedido (Cargos ou Colaboradores)
    const [activeTab, setActiveTab] = useState(initialTab);

    // --- Estados: Cargos ---
    const [novoCargoNome, setNovoCargoNome] = useState("");
    const [modalEditarCargoOpen, setModalEditarCargoOpen] = useState(false);
    const [cargoEmEdicao, setCargoEmEdicao] = useState(null);
    const [editCargoData, setEditCargoData] = useState({ name: "" });

    // --- Estados: Colaboradores ---
    const [listaFuncionarios, setListaFuncionarios] = useState([]);
    const [listaGestores, setListaGestores] = useState([]);
    const [filtroLoja, setFiltroLoja] = useState("");
    const [filtroCargo, setFiltroCargo] = useState("");
    const [filtroGestor, setFiltroGestor] = useState("");

    const [modalNovoColabOpen, setModalNovoColabOpen] = useState(false);
    const [modalEditarColabOpen, setModalEditarColabOpen] = useState(false);
    const [novoColab, setNovoColab] = useState({ nome: "", loja: "", cargo: "", gestor: "", phone: "" });
    const [editColab, setEditColab] = useState({ id: null, nome: "", loja: "", cargo: "", gestor: "", phone: "" });

    // --- Lógica: Cargos ---
    async function criarCargo() {
        if (!novoCargoNome) return alert("Preencha o nome do cargo");
        const slugAuto = novoCargoNome.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const { error } = await supabase.from("roles").insert({ name: novoCargoNome, slug: slugAuto, active: true });
        if (error) alert(error.message); else { setNovoCargoNome(""); onUpdate(); }
    }

    async function toggleStatusCargo(cargo) {
        const { error } = await supabase.from("roles").update({ active: !cargo.active }).eq("id", cargo.id);
        if (error) alert(error.message); else onUpdate();
    }

    function abrirModalEditarCargo(cargo) {
        setCargoEmEdicao(cargo);
        setEditCargoData({ name: cargo.name || "" });
        setModalEditarCargoOpen(true);
    }

    async function salvarEdicaoCargo() {
        if (!editCargoData.name) return alert("Preencha o nome do cargo");
        const { error } = await supabase.from("roles").update({ name: editCargoData.name }).eq("id", cargoEmEdicao.id);
        if (error) alert(error.message); else { setModalEditarCargoOpen(false); onUpdate(); }
    }

    // --- Lógica: Colaboradores ---
    useEffect(() => {
        if (activeTab === 'colaboradores') buscarColaboradores();
    }, [activeTab, filtroLoja, filtroCargo, filtroGestor]);

    async function buscarColaboradores() {
        let q = supabase.from("employee").select(`*, stores(name), roles(name), manager:manager_id(full_name)`).order('full_name');
        if (filtroLoja) q = q.eq('store_id', filtroLoja);
        if (filtroCargo) q = q.eq('role_id', filtroCargo);
        if (filtroGestor) q = q.eq('manager_id', filtroGestor);
        const { data, error } = await q;
        if (error) alert(error.message); else setListaFuncionarios(data || []);
    }

    async function carregarGestores(lojaId) {
        if (!lojaId) { setListaGestores([]); return; }
        const { data } = await supabase.from("employee").select("id, full_name").eq("store_id", lojaId).eq("active", true);
        setListaGestores(data || []);
    }

    async function salvarNovoColaborador() {
        if (!novoColab.nome || !novoColab.loja || !novoColab.cargo) return alert("Campos obrigatórios");
        const { error } = await supabase.from("employee").insert({
            full_name: novoColab.nome, store_id: novoColab.loja, role_id: novoColab.cargo, manager_id: novoColab.gestor || null, phone: novoColab.phone || null, active: true
        });
        if (error) alert(error.message); else { setModalNovoColabOpen(false); buscarColaboradores(); }
    }

    async function salvarEdicaoColaborador() {
        const { error } = await supabase.from("employee").update({
            full_name: editColab.nome, store_id: editColab.loja, role_id: editColab.cargo, manager_id: editColab.gestor || null, phone: editColab.phone || null
        }).eq("id", editColab.id);
        if (error) alert(error.message); else { setModalEditarColabOpen(false); buscarColaboradores(); }
    }

    async function toggleStatusColaborador(func) {
        await supabase.from("employee").update({ active: !func.active }).eq("id", func.id);
        buscarColaboradores();
    }

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <button onClick={goBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"><ArrowLeft /> Voltar</button>
                <div className="flex gap-1 bg-slate-200 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('colaboradores')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'colaboradores' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-700 hover:bg-white'}`}>Colaboradores</button>
                    <button onClick={() => setActiveTab('cargos')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'cargos' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-700 hover:bg-white'}`}>Cargos</button>
                </div>
            </div>

            {activeTab === 'cargos' && (
                <div className="animate-fade-in">
                    <div className="bg-white p-6 rounded-xl mb-8 border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-bold mb-4 text-slate-800">Adicionar Cargo</h3>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <input type="text" placeholder="Nome" className="flex-1 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors" value={novoCargoNome} onChange={(e) => setNovoCargoNome(e.target.value)} />
                            <button onClick={criarCargo} className="bg-blue-600 px-6 py-3 rounded hover:bg-blue-500 font-bold flex items-center justify-center gap-2 min-h-[48px] w-full sm:w-auto"><Plus size={20} /> Criar</button>
                        </div>
                    </div>
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                        {roles.map(cargo => (
                            <div key={cargo.id} className={`p-4 rounded-lg flex justify-between items-center border-l-8 ${cargo.active ? 'bg-white text-slate-800 border-green-500' : 'bg-slate-300 text-slate-500 border-slate-500'}`}>
                                <div><span className="font-bold text-lg block">{cargo.name}</span></div>
                                <div className="flex gap-2 items-center">
                                    <button onClick={() => abrirModalEditarCargo(cargo)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors"><Pencil size={20} /></button>
                                    <button onClick={() => toggleStatusCargo(cargo)}>{cargo.active ? <ToggleRight className="text-green-600" size={30} /> : <ToggleLeft size={30} />}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'colaboradores' && (
                <div className="animate-fade-in">
                    <div className="flex justify-end mb-4">
                        <button onClick={() => { setNovoColab({ nome: "", loja: "", cargo: "", gestor: "", phone: "" }); setModalNovoColabOpen(true); }} className="bg-blue-600 px-4 py-2 rounded font-bold hover:bg-blue-500 shadow flex items-center gap-2"><Plus size={18} /> Novo Colaborador</button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex-1"><label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Loja</label><select className="bg-slate-50 p-2 rounded-lg w-full border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors" value={filtroLoja} onChange={e => setFiltroLoja(e.target.value)}><option value="">Todas</option>{lojas.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                        <div className="flex-1"><label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Cargo</label><select className="bg-slate-50 p-2 rounded-lg w-full border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors" value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)}><option value="">Todos</option>{roles.filter(r => r.active).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                        <div className="flex-1"><label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Gestor</label><select className="bg-slate-50 p-2 rounded-lg w-full border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors" value={filtroGestor} onChange={e => setFiltroGestor(e.target.value)}><option value="">Todos</option>{[...new Set(listaFuncionarios.filter(f => f.manager_id).map(f => f.manager_id))].map(mid => { const g = listaFuncionarios.find(x => x.id === mid) || listaFuncionarios.find(x => x.manager_id === mid)?.manager; return g ? <option key={mid} value={mid}>{g.full_name}</option> : null })}</select></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {listaFuncionarios.map(f => (
                            <div key={f.id} className={`p-4 rounded border-l-4 flex justify-between items-center ${f.active ? 'bg-white border-green-500 text-slate-800' : 'bg-slate-300 border-slate-500 text-slate-500'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${f.active ? 'bg-blue-50 text-blue-600' : 'bg-slate-400 text-slate-200'}`}>
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg">{f.full_name}</div>
                                        <div className="text-xs uppercase font-bold text-slate-500">{f.stores?.name} • {f.roles?.name}</div>
                                        {f.phone && <div className="text-xs text-green-600 mt-1 flex gap-1 items-center bg-green-50 px-2 py-0.5 rounded-full w-fit"><Phone size={10} /> {f.phone}</div>}
                                        {f.manager && <div className="text-xs text-blue-600 mt-1 flex gap-1 items-center bg-blue-50 px-2 py-0.5 rounded-full w-fit"><ShieldCheck size={12} /> Gestor: {f.manager.full_name}</div>}
                                    </div>
                                </div>

                                <div className="flex gap-2 items-center">
                                    <button onClick={() => { setEditColab({ id: f.id, nome: f.full_name, loja: f.store_id, cargo: f.role_id, gestor: f.manager_id || "", phone: f.phone || "" }); carregarGestores(f.store_id); setModalEditarColabOpen(true); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors"><Pencil size={20} /></button>
                                    <button onClick={() => toggleStatusColaborador(f)}>{f.active ? <ToggleRight className="text-green-600" size={30} /> : <ToggleLeft size={30} />}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODAL NOVO COLABORADOR */}
            {modalNovoColabOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-md text-slate-800 max-h-[90dvh] overflow-y-auto">
                        <h3 className="font-bold text-xl mb-4">Novo Colaborador</h3>
                        <input className="border p-2 w-full mb-3 rounded" placeholder="Nome" value={novoColab.nome} onChange={e => setNovoColab({ ...novoColab, nome: e.target.value })} />
                        <select className="border p-2 w-full mb-3 rounded" onChange={e => { setNovoColab({ ...novoColab, loja: e.target.value }); carregarGestores(e.target.value) }}><option value="">Loja...</option>{lojas.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
                        <select className="border p-2 w-full mb-3 rounded" onChange={e => setNovoColab({ ...novoColab, cargo: e.target.value })}><option value="">Cargo...</option>{roles.filter(r => r.active).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
                        <select className="border p-2 w-full mb-3 rounded" onChange={e => setNovoColab({ ...novoColab, gestor: e.target.value })} disabled={!novoColab.loja}><option value="">Sem Gestor...</option>{listaGestores.map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}</select>
                        <input className="border p-2 w-full mb-4 rounded" placeholder="Telefone (ex: +5511999999999)" value={novoColab.phone} onChange={e => setNovoColab({ ...novoColab, phone: e.target.value })} />
                        <button onClick={salvarNovoColaborador} className="bg-blue-600 text-white w-full py-3 rounded font-bold min-h-[48px]">Salvar</button>
                        <button onClick={() => setModalNovoColabOpen(false)} className="mt-2 w-full text-slate-500 py-3 min-h-[44px]">Cancelar</button>
                    </div>
                </div>
            )}

            {/* MODAL EDITAR COLABORADOR */}
            {modalEditarColabOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-md text-slate-800 max-h-[90dvh] overflow-y-auto">
                        <h3 className="font-bold text-xl mb-4">Editar Colaborador</h3>
                        <div className="mb-3"><label className="text-xs font-bold uppercase text-slate-500">Nome</label><input className="border p-2 w-full rounded" value={editColab.nome} onChange={e => setEditColab({ ...editColab, nome: e.target.value })} /></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                            <div><label className="text-xs font-bold uppercase text-slate-500">Loja</label><select className="border p-2 w-full rounded" value={editColab.loja} onChange={e => { setEditColab({ ...editColab, loja: e.target.value }); carregarGestores(e.target.value) }}><option>Selecione...</option>{lojas.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                            <div><label className="text-xs font-bold uppercase text-slate-500">Cargo</label><select className="border p-2 w-full rounded" value={editColab.cargo} onChange={e => setEditColab({ ...editColab, cargo: e.target.value })}><option>Selecione...</option>{roles.filter(r => r.active).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                        </div>
                        <div className="mb-3"><label className="text-xs font-bold uppercase text-slate-500">Gestor</label><select className="border p-2 w-full rounded" value={editColab.gestor} onChange={e => setEditColab({ ...editColab, gestor: e.target.value })}><option value="">Sem Gestor</option>{listaGestores.filter(g => g.id !== editColab.id).map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}</select></div>
                        <div className="mb-4"><label className="text-xs font-bold uppercase text-slate-500">Telefone</label><input className="border p-2 w-full rounded" placeholder="+5511999999999" value={editColab.phone} onChange={e => setEditColab({ ...editColab, phone: e.target.value })} /></div>
                        <button onClick={salvarEdicaoColaborador} className="bg-blue-600 text-white w-full py-3 rounded font-bold min-h-[48px]">Salvar Alterações</button>
                        <button onClick={() => setModalEditarColabOpen(false)} className="mt-2 w-full text-slate-500 py-3 min-h-[44px]">Cancelar</button>
                    </div>
                </div>
            )}

            {/* MODAL EDITAR CARGO (RESTAURADO) */}
            {modalEditarCargoOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-md text-slate-800 max-h-[90dvh] overflow-y-auto">
                        <h3 className="font-bold text-xl mb-4">Editar Cargo</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-slate-600 mb-1">Nome do Cargo</label>
                            <input className="border p-2 w-full rounded bg-white text-slate-800" value={editCargoData.name} onChange={e => setEditCargoData({ ...editCargoData, name: e.target.value })} />
                        </div>
                        <button onClick={salvarEdicaoCargo} className="bg-blue-600 text-white w-full py-3 rounded font-bold min-h-[48px]">Salvar Alterações</button>
                        <button onClick={() => setModalEditarCargoOpen(false)} className="mt-2 w-full text-slate-500 py-3 min-h-[44px]">Cancelar</button>
                    </div>
                </div>
            )}
        </div>
    );
}