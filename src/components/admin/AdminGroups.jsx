import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { ArrowLeft, Plus, Pencil, ToggleLeft, ToggleRight, FolderTree, X, Info } from "lucide-react";

export default function AdminGroups({ goBack, orgId, isSuperAdmin }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Para super admin: seletor de org
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(orgId || "");

  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [novoGrupo, setNovoGrupo] = useState({ name: "", description: "" });
  const [editGrupo, setEditGrupo] = useState(null);

  const activeOrgId = isSuperAdmin ? selectedOrgId : orgId;

  useEffect(() => {
    if (isSuperAdmin) carregarOrgs();
  }, []);

  useEffect(() => {
    if (activeOrgId) buscarGrupos();
    else setGroups([]);
  }, [activeOrgId]);

  async function carregarOrgs() {
    const { data } = await supabase.from("organizations").select("id, name").eq("active", true).order("name");
    setOrgs(data || []);
  }

  async function buscarGrupos() {
    setLoading(true);
    const { data } = await supabase
      .from("restaurant_groups")
      .select("*, stores(count)")
      .eq("organization_id", activeOrgId)
      .order("name");
    setGroups(data || []);
    setLoading(false);
  }

  function gerarSlug(name) {
    return name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async function criarGrupo() {
    if (!novoGrupo.name.trim()) return alert("Preencha o nome do grupo");
    if (!activeOrgId) return alert("Selecione uma organização");

    const slug = gerarSlug(novoGrupo.name);
    const { error } = await supabase.from("restaurant_groups").insert({
      organization_id: activeOrgId,
      name: novoGrupo.name.trim(),
      slug,
      description: novoGrupo.description?.trim() || null,
    });
    if (error) {
      if (error.code === '23505') alert("Já existe um grupo com esse nome nesta organização");
      else alert("Um erro ocorreu, por favor tente novamente.");
      return;
    }
    setModalNovoOpen(false);
    setNovoGrupo({ name: "", description: "" });
    buscarGrupos();
  }

  async function salvarEdicao() {
    if (!editGrupo.name.trim()) return alert("Preencha o nome do grupo");
    const slug = gerarSlug(editGrupo.name);
    const { error } = await supabase.from("restaurant_groups").update({
      name: editGrupo.name.trim(),
      slug,
      description: editGrupo.description?.trim() || null,
    }).eq("id", editGrupo.id);
    if (error) {
      if (error.code === '23505') alert("Já existe um grupo com esse nome nesta organização");
      else alert("Um erro ocorreu, por favor tente novamente.");
      return;
    }
    setModalEditarOpen(false);
    buscarGrupos();
  }

  async function toggleStatus(group) {
    await supabase.from("restaurant_groups").update({ active: !group.active }).eq("id", group.id);
    buscarGrupos();
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <button onClick={goBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 font-semibold transition-colors min-h-[44px] group cursor-pointer">
          <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" /> Voltar
        </button>
        <button
          onClick={() => { setNovoGrupo({ name: "", description: "" }); setModalNovoOpen(true); }}
          disabled={!activeOrgId}
          className="bg-gradient-to-r from-violet-500 to-violet-600 text-white px-4 py-2.5 rounded-xl font-bold hover:from-violet-600 hover:to-violet-700 shadow-md hover:shadow-lg flex items-center gap-2 transition-all active:scale-[0.97] cursor-pointer disabled:opacity-50"
        >
          <Plus size={16} /> Novo Grupo
        </button>
      </div>

      {/* Seletor de org (super admin) */}
      {isSuperAdmin && (
        <div className="bg-white p-4 rounded-xl mb-6 border border-slate-200 shadow-sm">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Organização</label>
          <select
            className="bg-slate-50 p-3 rounded-lg w-full border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
            value={selectedOrgId}
            onChange={e => setSelectedOrgId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      )}

      {!activeOrgId ? (
        <div className="text-center text-slate-400 py-12">Selecione uma organização para ver os grupos</div>
      ) : loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12">
          <FolderTree size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400 mb-2">Nenhum grupo cadastrado</p>
          <p className="text-slate-400 text-xs max-w-xs mx-auto">Grupos servem para organizar suas lojas por marca, bandeira ou região.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {groups.map(group => (
            <div key={group.id} className={`p-5 rounded-xl flex justify-between items-start border-l-8 ${group.active ? 'bg-white text-slate-800 border-violet-500' : 'bg-slate-300 text-slate-500 border-slate-500'}`}>
              <div>
                <div className="font-bold text-lg flex items-center gap-2">
                  <FolderTree size={18} className={group.active ? 'text-violet-500' : 'text-slate-400'} />
                  {group.name}
                </div>
                {group.description && (
                  <div className="text-xs text-slate-500 mt-1">{group.description}</div>
                )}
                <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                  {group.stores?.[0]?.count || 0} {(group.stores?.[0]?.count || 0) === 1 ? 'loja' : 'lojas'}
                </span>
              </div>
              <div className="flex gap-2 items-center shrink-0">
                <button onClick={() => { setEditGrupo({ ...group }); setModalEditarOpen(true); }} className="text-slate-400 hover:text-violet-600 hover:bg-violet-50 p-2 rounded-lg transition-colors cursor-pointer">
                  <Pencil size={18} />
                </button>
                <button onClick={() => toggleStatus(group)} className="cursor-pointer">
                  {group.active ? <ToggleRight className="text-green-600" size={30} /> : <ToggleLeft size={30} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL NOVO GRUPO */}
      {modalNovoOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md text-slate-800">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-xl">Novo Grupo</h3>
              <button onClick={() => setModalNovoOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>

            <p className="text-xs text-slate-400 mb-5 flex items-start gap-1.5">
              <Info size={14} className="shrink-0 mt-0.5" />
              Agrupe suas lojas por marca, bandeira ou região para facilitar a gestão.
            </p>

            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Grupo</label>
              <input
                className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none"
                placeholder="Ex: Marca Premium, Região Sul..."
                value={novoGrupo.name}
                onChange={e => setNovoGrupo({ ...novoGrupo, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição <span className="text-slate-300 font-normal normal-case">(opcional)</span></label>
              <input
                className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none"
                placeholder="Breve descrição do grupo"
                value={novoGrupo.description}
                onChange={e => setNovoGrupo({ ...novoGrupo, description: e.target.value })}
              />
            </div>

            <button onClick={criarGrupo} className="bg-gradient-to-r from-violet-500 to-violet-600 text-white w-full py-3 rounded-xl font-bold min-h-[48px] shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer">Criar Grupo</button>
            <button onClick={() => setModalNovoOpen(false)} className="mt-2 w-full text-slate-400 hover:text-slate-600 py-3 min-h-[44px] font-semibold rounded-xl hover:bg-slate-50 transition-all cursor-pointer">Cancelar</button>
          </div>
        </div>
      )}

      {/* MODAL EDITAR GRUPO */}
      {modalEditarOpen && editGrupo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md text-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xl">Editar Grupo</h3>
              <button onClick={() => setModalEditarOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Grupo</label>
              <input className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none" value={editGrupo.name} onChange={e => setEditGrupo({ ...editGrupo, name: e.target.value })} />
            </div>
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição <span className="text-slate-300 font-normal normal-case">(opcional)</span></label>
              <input className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none" placeholder="Breve descrição do grupo" value={editGrupo.description || ""} onChange={e => setEditGrupo({ ...editGrupo, description: e.target.value })} />
            </div>

            <button onClick={salvarEdicao} className="bg-gradient-to-r from-violet-500 to-violet-600 text-white w-full py-3 rounded-xl font-bold min-h-[48px] shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer">Salvar Alterações</button>
            <button onClick={() => setModalEditarOpen(false)} className="mt-2 w-full text-slate-400 hover:text-slate-600 py-3 min-h-[44px] font-semibold rounded-xl hover:bg-slate-50 transition-all cursor-pointer">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
