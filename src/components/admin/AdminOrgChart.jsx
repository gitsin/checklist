import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { gerarSlug } from "../../utils/slugify";
import { useStoreLimit } from "../../hooks/useStoreLimit";
import StoreLimitUpgradeModal from "./StoreLimitUpgradeModal";
import {
  ArrowLeft, Plus, Pencil, Building2, FolderTree, Store,
  X, Info, Link, Check, AlertTriangle
} from "lucide-react";

export default function AdminOrgChart({ goBack, orgId, orgName, lojas, onUpdate }) {
  const [groups, setGroups] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [orgSlug, setOrgSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  // Modais
  const [modalNovoGrupo, setModalNovoGrupo] = useState(false);
  const [modalEditarGrupo, setModalEditarGrupo] = useState(false);
  const [modalNovaLoja, setModalNovaLoja] = useState(false);
  const [modalEditarLoja, setModalEditarLoja] = useState(false);

  const [novoGrupo, setNovoGrupo] = useState({ name: "", description: "" });
  const [editGrupo, setEditGrupo] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [novaLojaNome, setNovaLojaNome] = useState("");
  const [editLoja, setEditLoja] = useState(null);

  const { upgradeInfo, setUpgradeInfo, saving, checkBeforeCreate, addSlots } = useStoreLimit(orgId);

  useEffect(() => {
    if (orgId) fetchData();
  }, [orgId]);

  async function fetchData() {
    setLoading(true);
    const [groupsRes, unassignedRes, orgRes] = await Promise.all([
      supabase.from("restaurant_groups")
        .select("*, stores(id, name, shortName, active)")
        .eq("organization_id", orgId)
        .eq("active", true)
        .order("name"),
      supabase.from("stores")
        .select("id, name, shortName")
        .eq("organization_id", orgId)
        .is("restaurant_group_id", null)
        .eq("active", true),
      supabase.from("organizations")
        .select("slug")
        .eq("id", orgId)
        .single(),
    ]);
    setGroups(groupsRes.data || []);
    setUnassigned(unassignedRes.data || []);
    setOrgSlug(orgRes.data?.slug || "");
    setLoading(false);
  }

  function kioskUrl(group) {
    return group.slug && orgSlug ? `${window.location.origin}/${orgSlug}/${group.slug}` : null;
  }

  async function copiarUrl(group) {
    const url = kioskUrl(group);
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiedId(group.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // ─── CRUD Grupo ─────────────────────────────────────────────────
  async function criarGrupo() {
    if (!novoGrupo.name.trim()) return alert("Preencha o nome do grupo");
    const slug = gerarSlug(novoGrupo.name);
    const { error } = await supabase.from("restaurant_groups").insert({
      organization_id: orgId,
      name: novoGrupo.name.trim(),
      slug,
      description: novoGrupo.description?.trim() || null,
    });
    if (error) {
      if (error.code === "23505") alert("Já existe um grupo com esse nome nesta organização");
      else alert("Um erro ocorreu, por favor tente novamente.");
      return;
    }
    setModalNovoGrupo(false);
    setNovoGrupo({ name: "", description: "" });
    fetchData();
    onUpdate?.();
  }

  async function salvarEdicaoGrupo() {
    if (!editGrupo.name.trim()) return alert("Preencha o nome do grupo");
    const slug = gerarSlug(editGrupo.name);
    const { error } = await supabase.from("restaurant_groups").update({
      name: editGrupo.name.trim(),
      slug,
      description: editGrupo.description?.trim() || null,
    }).eq("id", editGrupo.id);
    if (error) {
      if (error.code === "23505") alert("Já existe um grupo com esse nome nesta organização");
      else alert("Um erro ocorreu, por favor tente novamente.");
      return;
    }
    setModalEditarGrupo(false);
    fetchData();
    onUpdate?.();
  }

  // ─── CRUD Loja ──────────────────────────────────────────────────
  async function criarLoja() {
    if (!novaLojaNome.trim()) return alert("Preencha o nome da loja");
    const allowed = await checkBeforeCreate();
    if (!allowed) { setModalNovaLoja(false); return; }
    const { error } = await supabase.from("stores").insert({
      name: novaLojaNome.trim(),
      timezone: "America/Sao_Paulo",
      active: true,
      organization_id: orgId,
      restaurant_group_id: selectedGroupId,
    });
    if (error) {
      alert("Um erro ocorreu, por favor tente novamente.");
      return;
    }
    setModalNovaLoja(false);
    setNovaLojaNome("");
    fetchData();
    onUpdate?.();
  }

  async function salvarEdicaoLoja() {
    if (!editLoja.name.trim()) return alert("Nome obrigatório");
    const { error } = await supabase.from("stores").update({
      name: editLoja.name.trim(),
      shortName: editLoja.shortName?.trim() || null,
      InternalCode: editLoja.code?.trim() || null,
    }).eq("id", editLoja.id);
    if (error) {
      alert("Um erro ocorreu, por favor tente novamente.");
      return;
    }
    setModalEditarLoja(false);
    fetchData();
    onUpdate?.();
  }

  const totalLojas = groups.reduce((sum, g) => sum + (g.stores?.length || 0), 0) + unassigned.length;

  if (loading) {
    return (
      <div className="animate-fade-in">
        <button onClick={goBack} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-slate-700 font-semibold transition-colors min-h-[44px] group cursor-pointer">
          <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" /> Voltar
        </button>
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <button onClick={goBack} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-slate-700 font-semibold transition-colors min-h-[44px] group cursor-pointer">
        <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" /> Voltar
      </button>

      {/* Alerta lojas sem grupo */}
      {unassigned.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">
              {unassigned.length} {unassigned.length === 1 ? "loja" : "lojas"} sem grupo
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {unassigned.map(l => l.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* ─── ORGANOGRAMA ─── */}

      {/* Desktop (lg+): árvore centralizada */}
      <div className="hidden lg:block">
        {/* Card Organização */}
        <div className="flex justify-center">
          <div className="bg-primary-500 text-white px-8 py-5 rounded-xl shadow-lg text-center min-w-[240px]">
            <Building2 size={28} className="mx-auto mb-2 opacity-80" />
            <h2 className="font-bold text-lg">{orgName}</h2>
            <p className="text-sm opacity-80 mt-1">
              {groups.length} {groups.length === 1 ? "grupo" : "grupos"} · {totalLojas} {totalLojas === 1 ? "loja" : "lojas"}
            </p>
          </div>
        </div>

        {/* Connector vertical */}
        <div className="w-px h-8 bg-slate-300 mx-auto" />

        {/* Connector horizontal + Grupos */}
        <div className="relative">
          {/* Linha horizontal */}
          {(groups.length > 0) && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 border-t-2 border-slate-300"
              style={{ width: `${Math.min((groups.length + 1) * 220, 100 * (groups.length + 1) / (groups.length + 2))}px`, maxWidth: '90%' }} />
          )}

          <div className="flex justify-center gap-6 flex-wrap pt-0">
            {groups.map(group => (
              <div key={group.id} className="relative pt-0">
                {/* Connector vertical do grupo */}
                <div className="w-px h-4 bg-slate-300 mx-auto" />

                {/* Card Grupo */}
                <div className="bg-white border-l-4 border-violet-500 rounded-xl shadow-sm p-4 w-[200px]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                        <FolderTree size={14} className="text-violet-500 shrink-0" />
                        <span className="truncate">{group.name}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {group.stores?.length || 0} {(group.stores?.length || 0) === 1 ? "loja" : "lojas"}
                      </p>
                      {/* URL kiosk */}
                      {group.slug && orgSlug && (
                        <button
                          onClick={() => copiarUrl(group)}
                          className="mt-1.5 flex items-center gap-1 text-[10px] text-violet-500 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-1.5 py-0.5 rounded transition-colors cursor-pointer font-medium truncate max-w-full"
                          title={kioskUrl(group)}
                        >
                          {copiedId === group.id
                            ? <><Check size={10} className="shrink-0" /> Copiada!</>
                            : <><Link size={10} className="shrink-0" /> <span className="truncate">/{orgSlug}/{group.slug}</span></>
                          }
                        </button>
                      )}
                    </div>
                    <button onClick={() => { setEditGrupo({ ...group }); setModalEditarGrupo(true); }}
                      className="text-slate-300 hover:text-violet-600 p-1 rounded transition-colors cursor-pointer shrink-0"
                      title="Editar grupo">
                      <Pencil size={14} />
                    </button>
                  </div>

                  {/* Lojas do grupo */}
                  <div className="mt-3 space-y-1.5">
                    {group.stores?.filter(s => s.active).map(store => (
                      <div key={store.id} className="bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold text-slate-700 block truncate">{store.name}</span>
                          {store.shortName && <span className="text-[10px] text-slate-400">{store.shortName}</span>}
                        </div>
                        <button onClick={() => {
                          setEditLoja({ id: store.id, name: store.name, shortName: store.shortName || "", code: "" });
                          setModalEditarLoja(true);
                        }}
                          className="text-slate-300 hover:text-emerald-600 p-0.5 rounded transition-colors cursor-pointer shrink-0"
                          title="Editar loja">
                          <Pencil size={12} />
                        </button>
                      </div>
                    ))}

                    {/* + Nova Loja */}
                    <button
                      onClick={() => {
                        setSelectedGroupId(group.id);
                        setSelectedGroupName(group.name);
                        setNovaLojaNome("");
                        setModalNovaLoja(true);
                      }}
                      className="w-full border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-lg px-2.5 py-1.5 flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer min-h-[36px]"
                    >
                      <Plus size={12} /> Nova Loja
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* + Novo Grupo (card dashed) */}
            <div className="relative pt-0">
              <div className="w-px h-4 bg-slate-300 mx-auto" />
              <button
                onClick={() => { setNovoGrupo({ name: "", description: "" }); setModalNovoGrupo(true); }}
                className="border-2 border-dashed border-slate-200 hover:border-violet-400 rounded-xl p-4 w-[200px] flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-violet-600 transition-colors cursor-pointer min-h-[120px]"
              >
                <Plus size={24} />
                <span className="font-bold text-sm">Novo Grupo</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile (< lg): árvore indentada */}
      <div className="lg:hidden">
        {/* Card Organização */}
        <div className="bg-primary-500 text-white px-5 py-4 rounded-xl shadow-lg mb-4">
          <div className="flex items-center gap-3">
            <Building2 size={24} className="opacity-80 shrink-0" />
            <div>
              <h2 className="font-bold text-lg">{orgName}</h2>
              <p className="text-sm opacity-80">
                {groups.length} {groups.length === 1 ? "grupo" : "grupos"} · {totalLojas} {totalLojas === 1 ? "loja" : "lojas"}
              </p>
            </div>
          </div>
        </div>

        {/* Grupos indentados */}
        <div className="border-l-2 border-slate-300 ml-4 pl-4 space-y-4">
          {groups.map(group => (
            <div key={group.id}>
              {/* Card Grupo */}
              <div className="bg-white border-l-4 border-violet-500 rounded-xl shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                      <FolderTree size={14} className="text-violet-500 shrink-0" />
                      <span className="truncate">{group.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {group.stores?.length || 0} {(group.stores?.length || 0) === 1 ? "loja" : "lojas"}
                    </p>
                    {group.slug && orgSlug && (
                      <button
                        onClick={() => copiarUrl(group)}
                        className="mt-1.5 flex items-center gap-1 text-[10px] text-violet-500 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-1.5 py-0.5 rounded transition-colors cursor-pointer font-medium truncate max-w-full"
                        title={kioskUrl(group)}
                      >
                        {copiedId === group.id
                          ? <><Check size={10} className="shrink-0" /> Copiada!</>
                          : <><Link size={10} className="shrink-0" /> <span className="truncate">/{orgSlug}/{group.slug}</span></>
                        }
                      </button>
                    )}
                  </div>
                  <button onClick={() => { setEditGrupo({ ...group }); setModalEditarGrupo(true); }}
                    className="text-slate-300 hover:text-violet-600 p-1 rounded transition-colors cursor-pointer shrink-0"
                    title="Editar grupo">
                    <Pencil size={14} />
                  </button>
                </div>

                {/* Lojas dentro do grupo */}
                <div className="mt-3 border-l-2 border-slate-200 ml-2 pl-3 space-y-1.5">
                  {group.stores?.filter(s => s.active).map(store => (
                    <div key={store.id} className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-semibold text-slate-700 block truncate">{store.name}</span>
                        {store.shortName && <span className="text-[10px] text-slate-400">{store.shortName}</span>}
                      </div>
                      <button onClick={() => {
                        setEditLoja({ id: store.id, name: store.name, shortName: store.shortName || "", code: "" });
                        setModalEditarLoja(true);
                      }}
                        className="text-slate-300 hover:text-emerald-600 p-1 rounded transition-colors cursor-pointer shrink-0"
                        title="Editar loja">
                        <Pencil size={14} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      setSelectedGroupId(group.id);
                      setSelectedGroupName(group.name);
                      setNovaLojaNome("");
                      setModalNovaLoja(true);
                    }}
                    className="w-full border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 text-sm text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer min-h-[44px]"
                  >
                    <Plus size={14} /> Nova Loja
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* + Novo Grupo */}
          <button
            onClick={() => { setNovoGrupo({ name: "", description: "" }); setModalNovoGrupo(true); }}
            className="w-full border-2 border-dashed border-slate-200 hover:border-violet-400 rounded-xl p-4 flex items-center justify-center gap-2 text-slate-400 hover:text-violet-600 transition-colors cursor-pointer min-h-[56px]"
          >
            <Plus size={18} />
            <span className="font-bold text-sm">Novo Grupo</span>
          </button>
        </div>
      </div>

      {/* ─── MODAL NOVO GRUPO ─── */}
      {modalNovoGrupo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md text-slate-800">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-xl">Novo Grupo</h3>
              <button onClick={() => setModalNovoGrupo(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>
            <p className="text-xs text-slate-400 mb-5 flex items-start gap-1.5">
              <Info size={14} className="shrink-0 mt-0.5" />
              Agrupe suas lojas por marca, bandeira ou região.
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
            <button onClick={() => setModalNovoGrupo(false)} className="mt-2 w-full text-slate-400 hover:text-slate-600 py-3 min-h-[44px] font-semibold rounded-xl hover:bg-slate-50 transition-all cursor-pointer">Cancelar</button>
          </div>
        </div>
      )}

      {/* ─── MODAL EDITAR GRUPO ─── */}
      {modalEditarGrupo && editGrupo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md text-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xl">Editar Grupo</h3>
              <button onClick={() => setModalEditarGrupo(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Grupo</label>
              <input className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none" value={editGrupo.name} onChange={e => setEditGrupo({ ...editGrupo, name: e.target.value })} />
            </div>
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição <span className="text-slate-300 font-normal normal-case">(opcional)</span></label>
              <input className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none" placeholder="Breve descrição do grupo" value={editGrupo.description || ""} onChange={e => setEditGrupo({ ...editGrupo, description: e.target.value })} />
            </div>
            <button onClick={salvarEdicaoGrupo} className="bg-gradient-to-r from-violet-500 to-violet-600 text-white w-full py-3 rounded-xl font-bold min-h-[48px] shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer">Salvar Alterações</button>
            <button onClick={() => setModalEditarGrupo(false)} className="mt-2 w-full text-slate-400 hover:text-slate-600 py-3 min-h-[44px] font-semibold rounded-xl hover:bg-slate-50 transition-all cursor-pointer">Cancelar</button>
          </div>
        </div>
      )}

      {/* ─── MODAL NOVA LOJA ─── */}
      {modalNovaLoja && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md text-slate-800">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-xl">Nova Loja no Grupo</h3>
              <button onClick={() => setModalNovaLoja(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>
            <p className="text-sm text-violet-600 font-semibold mb-4">{selectedGroupName}</p>
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Loja</label>
              <input
                className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none"
                placeholder="Nome da loja"
                value={novaLojaNome}
                onChange={e => setNovaLojaNome(e.target.value)}
                autoFocus
              />
            </div>
            <button onClick={criarLoja} className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white w-full py-3 rounded-xl font-bold min-h-[48px] shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer">Criar Loja</button>
            <button onClick={() => setModalNovaLoja(false)} className="mt-2 w-full text-slate-400 hover:text-slate-600 py-3 min-h-[44px] font-semibold rounded-xl hover:bg-slate-50 transition-all cursor-pointer">Cancelar</button>
          </div>
        </div>
      )}

      {/* ─── MODAL EDITAR LOJA ─── */}
      {modalEditarLoja && editLoja && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md text-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xl">Editar Loja</h3>
              <button onClick={() => setModalEditarLoja(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label>
              <input className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" value={editLoja.name} onChange={e => setEditLoja({ ...editLoja, name: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Curto</label>
              <input className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" value={editLoja.shortName} onChange={e => setEditLoja({ ...editLoja, shortName: e.target.value })} />
            </div>
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código ERP</label>
              <input className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" value={editLoja.code} onChange={e => setEditLoja({ ...editLoja, code: e.target.value })} />
            </div>
            <button onClick={salvarEdicaoLoja} className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white w-full py-3 rounded-xl font-bold min-h-[48px] shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer">Salvar</button>
            <button onClick={() => setModalEditarLoja(false)} className="mt-2 w-full text-slate-400 hover:text-slate-600 py-3 min-h-[44px] font-semibold rounded-xl hover:bg-slate-50 transition-all cursor-pointer">Cancelar</button>
          </div>
        </div>
      )}

      {/* ─── MODAL UPGRADE (Adicionar Lojas) ─── */}
      {upgradeInfo && (
        <StoreLimitUpgradeModal
          upgradeInfo={upgradeInfo}
          saving={saving}
          onConfirm={async (qty) => {
            const ok = await addSlots(qty);
            if (ok) { fetchData(); onUpdate?.(); }
            return ok;
          }}
          onClose={() => setUpgradeInfo(null)}
        />
      )}
    </div>
  );
}
