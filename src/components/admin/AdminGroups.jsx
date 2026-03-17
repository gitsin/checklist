import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { gerarSlug } from "../../utils/slugify";
import { ArrowLeft, Plus, Pencil, ToggleLeft, ToggleRight, FolderTree, X, Info, Store, Minus, Link, Check } from "lucide-react";

export default function AdminGroups({ goBack, orgId, isSuperAdmin }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orgSlug, setOrgSlug] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  // Para super admin: seletor de org
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(orgId || "");

  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [novoGrupo, setNovoGrupo] = useState({ name: "", description: "" });
  const [editGrupo, setEditGrupo] = useState(null);

  // Modal Gerenciar Lojas
  const [modalLojasOpen, setModalLojasOpen] = useState(false);
  const [lojasGrupo, setLojasGrupo] = useState(null); // grupo selecionado
  const [lojasVinculadas, setLojasVinculadas] = useState([]);
  const [lojasDisponiveis, setLojasDisponiveis] = useState([]);
  const [loadingLojas, setLoadingLojas] = useState(false);

  const activeOrgId = isSuperAdmin ? selectedOrgId : orgId;

  useEffect(() => {
    if (isSuperAdmin) carregarOrgs();
  }, []);

  useEffect(() => {
    if (activeOrgId) { buscarGrupos(); buscarOrgSlug(activeOrgId); }
    else { setGroups([]); setOrgSlug(""); }
  }, [activeOrgId]);

  async function carregarOrgs() {
    const { data } = await supabase.from("organizations").select("id, name").eq("active", true).order("name");
    setOrgs(data || []);
  }

  async function buscarOrgSlug(oid) {
    const { data } = await supabase.from("organizations").select("slug").eq("id", oid).single();
    setOrgSlug(data?.slug || "");
  }

  function kioskUrl(group) {
    const base = `${window.location.origin}/${orgSlug}`;
    return group.slug ? `${base}/${group.slug}` : null;
  }

  async function copiarUrl(group) {
    const url = kioskUrl(group);
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiedId(group.id);
    setTimeout(() => setCopiedId(null), 2000);
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

  async function abrirGerenciarLojas(group) {
    setLojasGrupo(group);
    setModalLojasOpen(true);
    await fetchLojasPorGrupo(group.id);
  }

  async function fetchLojasPorGrupo(groupId) {
    setLoadingLojas(true);

    // Query 1: vinculadas ao grupo
    const vinculadasQuery = supabase.from("stores").select("id, name, shortName").eq("restaurant_group_id", groupId).eq("active", true).order("name");
    // Query 2: sem grupo (super admin vê todas; demais só da própria org)
    let semGrupoQuery = supabase.from("stores").select("id, name, shortName, organization_id").is("restaurant_group_id", null).eq("active", true);
    if (!isSuperAdmin) semGrupoQuery = semGrupoQuery.eq("organization_id", activeOrgId);

    const [vinculadas, semGrupo] = await Promise.all([
      vinculadasQuery,
      semGrupoQuery.order("name"),
    ]);
    setLojasVinculadas(vinculadas.data || []);
    setLojasDisponiveis(semGrupo.data || []);
    setLoadingLojas(false);
  }

  async function adicionarLoja(storeId) {
    // Super admin pode mover lojas entre orgs; demais só vinculam dentro da própria org
    const updateData = { restaurant_group_id: lojasGrupo.id };
    if (isSuperAdmin) updateData.organization_id = activeOrgId;

    const { error } = await supabase.from("stores").update(updateData).eq("id", storeId);
    if (error) return alert("Um erro ocorreu, por favor tente novamente.");
    await fetchLojasPorGrupo(lojasGrupo.id);
    buscarGrupos();
  }

  async function removerLoja(storeId) {
    const { error } = await supabase.from("stores").update({ restaurant_group_id: null }).eq("id", storeId);
    if (error) return alert("Um erro ocorreu, por favor tente novamente.");
    await fetchLojasPorGrupo(lojasGrupo.id);
    buscarGrupos();
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <button onClick={goBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 font-semibold transition-colors min-h-[44px] group cursor-pointer">
          <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" /> Voltar
        </button>
        <button
          onClick={() => {
            if (!activeOrgId) return alert("Selecione uma organização primeiro");
            setNovoGrupo({ name: "", description: "" }); setModalNovoOpen(true);
          }}
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
              <div className="min-w-0 flex-1 mr-2">
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
                {/* URL Kiosk */}
                {group.active && group.slug && orgSlug && (
                  <button
                    onClick={() => copiarUrl(group)}
                    className="mt-2 flex items-center gap-1.5 text-[11px] text-violet-500 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-2 py-1 rounded-lg transition-colors cursor-pointer font-medium truncate max-w-full"
                    title={kioskUrl(group)}
                  >
                    {copiedId === group.id
                      ? <><Check size={12} className="shrink-0" /> URL copiada!</>
                      : <><Link size={12} className="shrink-0" /> <span className="truncate">/{orgSlug}/{group.slug}</span></>
                    }
                  </button>
                )}
              </div>
              <div className="flex gap-2 items-center shrink-0">
                <button onClick={() => abrirGerenciarLojas(group)} className="text-slate-400 hover:text-violet-600 hover:bg-violet-50 p-2 rounded-lg transition-colors cursor-pointer" title="Gerenciar Lojas">
                  <Store size={18} />
                </button>
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

      {/* MODAL GERENCIAR LOJAS */}
      {modalLojasOpen && lojasGrupo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md text-slate-800 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-xl">Lojas do Grupo</h3>
              <button onClick={() => setModalLojasOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>
            <p className="text-sm text-violet-600 font-semibold mb-4">{lojasGrupo.name}</p>

            {loadingLojas ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 space-y-5">
                {/* Lojas vinculadas */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lojas vinculadas</label>
                  {lojasVinculadas.length === 0 ? (
                    <div className="text-center py-4 bg-slate-50 rounded-lg">
                      <Store size={24} className="mx-auto mb-1.5 text-slate-300" />
                      <p className="text-slate-400 text-sm">Nenhuma loja vinculada a este grupo</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {lojasVinculadas.map(loja => (
                        <div key={loja.id} className="flex items-center justify-between bg-violet-50 border border-violet-200 p-3 rounded-lg">
                          <div>
                            <span className="font-semibold text-sm text-slate-700">{loja.name}</span>
                            {loja.shortName && <span className="text-xs text-slate-400 ml-2">({loja.shortName})</span>}
                          </div>
                          <button onClick={() => removerLoja(loja.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer" title="Remover do grupo">
                            <Minus size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lojas disponíveis */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Lojas disponíveis</label>
                  {lojasDisponiveis.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-3">Todas as lojas já estão vinculadas</p>
                  ) : (
                    <div className="space-y-2">
                      {lojasDisponiveis.map(loja => (
                        <div key={loja.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-lg">
                          <div>
                            <span className="font-semibold text-sm text-slate-700">{loja.name}</span>
                            {loja.shortName && <span className="text-xs text-slate-400 ml-2">({loja.shortName})</span>}
                          </div>
                          <button onClick={() => adicionarLoja(loja.id)} className="text-violet-500 hover:text-violet-700 hover:bg-violet-50 p-1.5 rounded-lg transition-colors cursor-pointer" title="Adicionar ao grupo">
                            <Plus size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <button onClick={() => setModalLojasOpen(false)} className="mt-4 w-full text-slate-400 hover:text-slate-600 py-3 min-h-[44px] font-semibold rounded-xl hover:bg-slate-50 transition-all cursor-pointer shrink-0">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
