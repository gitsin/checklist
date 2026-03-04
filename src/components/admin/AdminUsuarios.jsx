import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import {
  ArrowLeft, Plus, Pencil, ToggleLeft, ToggleRight,
  Users, X, Search, ShieldCheck, Eye, EyeOff, KeyRound
} from "lucide-react";

const TIPO_CONFIG = {
  holding_owner:      { label: "Dono da Holding",     cor: "bg-orange-100 text-orange-700 border-orange-200" },
  group_director:     { label: "Diretor de Grupo",    cor: "bg-violet-100 text-violet-700 border-violet-200" },
  store_manager:      { label: "Gerente de Loja",     cor: "bg-blue-100 text-blue-700 border-blue-200" },
  disp_compartilhado: { label: "Disp. Compartilhado", cor: "bg-cyan-100 text-cyan-700 border-cyan-200" },
};

const TIPOS_CRIÁVEIS = {
  super_admin:    ["holding_owner", "group_director", "store_manager", "disp_compartilhado"],
  holding_owner:  ["group_director", "store_manager", "disp_compartilhado"],
  group_director: ["store_manager", "disp_compartilhado"],
};

function BadgeTipo({ tipo }) {
  const cfg = TIPO_CONFIG[tipo] || { label: tipo, cor: "bg-slate-100 text-slate-600 border-slate-200" };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.cor}`}>
      {cfg.label}
    </span>
  );
}

// Campo de senha com toggle mostrar/ocultar
function CampoSenha({ label, value, onChange, placeholder = "Mínimo 6 caracteres" }) {
  const [mostrar, setMostrar] = useState(false);
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>
      <div className="relative">
        <input
          type={mostrar ? "text" : "password"}
          className="border border-slate-200 p-3 pr-10 w-full rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setMostrar(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          tabIndex={-1}
        >
          {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function AdminUsuarios({
  goBack, orgId, groupId,
  isSuperAdmin, isHoldingOwner, isGroupDirector,
}) {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  // super_admin: seletor de org
  const [orgs, setOrgs]               = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(orgId || "");

  const [grupos, setGrupos] = useState([]);
  const [lojas, setLojas]   = useState([]);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState("");
  const [busca, setBusca]           = useState("");

  // Modal novo usuário
  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [novoUser, setNovoUser] = useState({
    email: "", fullName: "", userType: "",
    organizationId: "", restaurantGroupId: "", storeId: "", phone: "",
    password: "",
  });
  const [saving, setSaving]       = useState(false);
  const [erroSalvar, setErroSalvar] = useState("");

  // Modal editar usuário
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [editUser, setEditUser]   = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Troca de senha no modal de edição
  const [novaSenha, setNovaSenha]               = useState("");
  const [erroSenha, setErroSenha]               = useState("");
  const [savingPassword, setSavingPassword]     = useState(false);
  const [senhaAlteradaOk, setSenhaAlteradaOk]   = useState(false);
  const [mostrarSecaoSenha, setMostrarSecaoSenha] = useState(false);

  const activeOrgId = isSuperAdmin ? selectedOrgId : orgId;

  const callerType = isSuperAdmin ? "super_admin"
    : isHoldingOwner  ? "holding_owner"
    : isGroupDirector ? "group_director"
    : null;

  const tiposCriáveis = TIPOS_CRIÁVEIS[callerType] || [];

  // ── Carregamento ──────────────────────────────────────────────────────────
  useEffect(() => { if (isSuperAdmin) carregarOrgs(); }, []);

  useEffect(() => {
    if (activeOrgId) { buscarUsuarios(); carregarGruposELojas(); }
    else { setUsers([]); setGrupos([]); setLojas([]); }
  }, [activeOrgId, groupId]);

  async function carregarOrgs() {
    const { data } = await supabase.from("organizations").select("id, name").eq("active", true).order("name");
    setOrgs(data || []);
  }

  async function buscarUsuarios() {
    setLoading(true);
    let q = supabase
      .from("user_profiles")
      .select(`id, full_name, email, user_type, phone, active, auth_user_id,
        organization_id, restaurant_group_id, store_id,
        organization:organizations(name), store:stores(name), group:restaurant_groups(name)`)
      .neq("user_type", "super_admin")
      .order("full_name");
    if (activeOrgId) q = q.eq("organization_id", activeOrgId);
    if (isGroupDirector && groupId) q = q.eq("restaurant_group_id", groupId);
    const { data } = await q;
    setUsers(data || []);
    setLoading(false);
  }

  async function carregarGruposELojas() {
    const [{ data: g }, { data: l }] = await Promise.all([
      supabase.from("restaurant_groups").select("id, name").eq("organization_id", activeOrgId).eq("active", true).order("name"),
      supabase.from("stores").select("id, name, restaurant_group_id").eq("organization_id", activeOrgId).eq("active", true).order("name"),
    ]);
    setGrupos(g || []);
    setLojas(l || []);
  }

  const usersFiltrados = users.filter(u => {
    const matchTipo = !filtroTipo || u.user_type === filtroTipo;
    const q = busca.toLowerCase();
    const matchBusca = !busca || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    return matchTipo && matchBusca;
  });

  function lojasFiltradas(grupoId) {
    if (!grupoId) return lojas;
    return lojas.filter(l => l.restaurant_group_id === grupoId);
  }

  // ── Criar usuário ─────────────────────────────────────────────────────────
  async function criarUsuario() {
    setErroSalvar("");
    if (!novoUser.email.trim() || !novoUser.fullName.trim() || !novoUser.userType) {
      setErroSalvar("Preencha e-mail, nome completo e tipo de acesso.");
      return;
    }
    if (novoUser.password && novoUser.password.length < 6) {
      setErroSalvar("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    const orgAlvo = isSuperAdmin ? novoUser.organizationId : activeOrgId;
    if (!orgAlvo) { setErroSalvar("Selecione uma organização."); return; }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          email: novoUser.email.trim().toLowerCase(),
          fullName: novoUser.fullName.trim(),
          userType: novoUser.userType,
          organizationId: orgAlvo,
          restaurantGroupId: novoUser.restaurantGroupId || null,
          storeId: novoUser.storeId || null,
          phone: novoUser.phone || null,
          password: novoUser.password || null,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) { setErroSalvar(json.error || "Um erro ocorreu, por favor tente novamente."); setSaving(false); return; }
      setModalNovoOpen(false);
      setNovoUser({ email: "", fullName: "", userType: "", organizationId: orgId || "", restaurantGroupId: "", storeId: "", phone: "", password: "" });
      buscarUsuarios();
    } catch { setErroSalvar("Um erro ocorreu, por favor tente novamente."); }
    setSaving(false);
  }

  // ── Editar usuário (dados cadastrais) ─────────────────────────────────────
  async function salvarEdicao() {
    if (!editUser.full_name?.trim()) { alert("Preencha o nome completo."); return; }
    setSavingEdit(true);
    const { error } = await supabase.from("user_profiles").update({
      full_name: editUser.full_name.trim(),
      user_type: editUser.user_type,
      restaurant_group_id: editUser.restaurant_group_id || null,
      store_id: editUser.store_id || null,
      phone: editUser.phone || null,
      active: editUser.active,
    }).eq("id", editUser.id);
    setSavingEdit(false);
    if (error) { alert("Um erro ocorreu, por favor tente novamente."); return; }
    setModalEditarOpen(false);
    buscarUsuarios();
  }

  // ── Trocar senha (via Edge Function) ─────────────────────────────────────
  async function alterarSenha() {
    setErroSenha("");
    setSenhaAlteradaOk(false);
    if (!novaSenha || novaSenha.length < 6) { setErroSenha("A senha deve ter no mínimo 6 caracteres."); return; }
    if (!editUser.auth_user_id) { setErroSenha("Este usuário não possui conta de acesso vinculada."); return; }

    setSavingPassword(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/set-user-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ profileId: editUser.id, newPassword: novaSenha }),
      });
      const json = await resp.json();
      if (!resp.ok) { setErroSenha(json.error || "Um erro ocorreu, por favor tente novamente."); setSavingPassword(false); return; }
      setNovaSenha("");
      setSenhaAlteradaOk(true);
      setMostrarSecaoSenha(false);
    } catch { setErroSenha("Um erro ocorreu, por favor tente novamente."); }
    setSavingPassword(false);
  }

  function abrirEditar(user) {
    setEditUser({ ...user });
    setNovaSenha("");
    setErroSenha("");
    setSenhaAlteradaOk(false);
    setMostrarSecaoSenha(false);
    setModalEditarOpen(true);
  }

  async function toggleAtivo(user) {
    await supabase.from("user_profiles").update({ active: !user.active }).eq("id", user.id);
    buscarUsuarios();
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <button onClick={goBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 font-semibold transition-colors min-h-[44px] group cursor-pointer">
          <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" /> Voltar
        </button>
        {callerType && tiposCriáveis.length > 0 && (
          <button
            onClick={() => { setNovoUser({ email: "", fullName: "", userType: "", organizationId: orgId || "", restaurantGroupId: "", storeId: "", phone: "", password: "" }); setErroSalvar(""); setModalNovoOpen(true); }}
            disabled={!activeOrgId && !isSuperAdmin}
            className="bg-gradient-to-r from-rose-500 to-rose-600 text-white px-4 py-2.5 rounded-xl font-bold hover:from-rose-600 hover:to-rose-700 shadow-md hover:shadow-lg flex items-center gap-2 transition-all active:scale-[0.97] cursor-pointer disabled:opacity-50"
          >
            <Plus size={16} /> Novo Usuário
          </button>
        )}
      </div>

      {/* Seletor org (super admin) */}
      {isSuperAdmin && (
        <div className="bg-white p-4 rounded-xl mb-6 border border-slate-200 shadow-sm">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Organização</label>
          <select className="bg-slate-50 p-3 rounded-lg w-full border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-400" value={selectedOrgId} onChange={e => setSelectedOrgId(e.target.value)}>
            <option value="">Selecione...</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      )}

      {!activeOrgId ? (
        <div className="text-center text-slate-400 py-12">Selecione uma organização para ver os usuários</div>
      ) : (
        <>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Buscar por nome ou e-mail..." className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white w-full focus:outline-none focus:ring-2 focus:ring-rose-400 text-sm" value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            <select className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-400 text-sm" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              <option value="">Todos os tipos</option>
              {Object.entries(TIPO_CONFIG).map(([val, cfg]) => <option key={val} value={val}>{cfg.label}</option>)}
            </select>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="text-center py-12"><div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : usersFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-400 mb-1">Nenhum usuário encontrado</p>
              <p className="text-slate-400 text-xs">Crie o primeiro usuário clicando em "Novo Usuário"</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {usersFiltrados.map(user => (
                <div key={user.id} className={`p-4 rounded-xl border flex justify-between items-start gap-3 transition-all shadow-sm ${user.active ? "bg-white border-slate-200 hover:border-rose-300 hover:bg-rose-50" : "bg-slate-100 border-slate-200 opacity-60"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <BadgeTipo tipo={user.user_type} />
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${user.active ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-200 text-slate-500 border-slate-300"}`}>
                        {user.active ? "Ativo" : "Inativo"}
                      </span>
                      {!user.auth_user_id && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-amber-50 text-amber-600 border-amber-200">sem login</span>
                      )}
                    </div>
                    <p className="font-bold text-slate-800 truncate">{user.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                      {user.organization?.name && <p className="truncate">{user.organization.name}</p>}
                      {user.group?.name && <p className="truncate text-violet-500">{user.group.name}</p>}
                      {user.store?.name && <p className="truncate text-blue-500">{user.store.name}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => abrirEditar(user)} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-colors cursor-pointer" title="Editar">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => toggleAtivo(user)} className="cursor-pointer">
                      {user.active ? <ToggleRight className="text-green-600" size={28} /> : <ToggleLeft className="text-slate-400" size={28} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── MODAL NOVO USUÁRIO ─────────────────────────────────────────────── */}
      {modalNovoOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-xl flex items-center gap-2">
                <ShieldCheck size={20} className="text-rose-500" /> Novo Usuário
              </h3>
              <button onClick={() => setModalNovoOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>

            {/* Banner dinâmico conforme senha preenchida ou não */}
            <div className={`text-xs mb-5 rounded-lg p-3 border ${novoUser.password ? "bg-green-50 border-green-200 text-green-700" : "bg-rose-50 border-rose-100 text-rose-600"}`}>
              {novoUser.password
                ? "Usuário será criado com a senha definida e poderá acessar imediatamente."
                : "Sem senha definida, um e-mail de convite será enviado para o usuário definir a sua."}
            </div>

            {erroSalvar && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{erroSalvar}</div>
            )}

            <div className="space-y-3">
              {isSuperAdmin && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Organização *</label>
                  <select className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none" value={novoUser.organizationId} onChange={e => setNovoUser({ ...novoUser, organizationId: e.target.value, restaurantGroupId: "", storeId: "" })}>
                    <option value="">Selecione...</option>
                    {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo *</label>
                <input className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none" placeholder="Nome e sobrenome" value={novoUser.fullName} onChange={e => setNovoUser({ ...novoUser, fullName: e.target.value })} autoFocus />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail *</label>
                <input type="email" className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none" placeholder="email@empresa.com" value={novoUser.email} onChange={e => setNovoUser({ ...novoUser, email: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Acesso *</label>
                <select className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none" value={novoUser.userType} onChange={e => setNovoUser({ ...novoUser, userType: e.target.value })}>
                  <option value="">Selecione...</option>
                  {tiposCriáveis.map(t => <option key={t} value={t}>{TIPO_CONFIG[t]?.label || t}</option>)}
                </select>
              </div>

              {(novoUser.userType === "group_director" || novoUser.userType === "store_manager" || novoUser.userType === "disp_compartilhado") && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Grupo</label>
                  <select className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none" value={novoUser.restaurantGroupId} onChange={e => setNovoUser({ ...novoUser, restaurantGroupId: e.target.value, storeId: "" })}>
                    <option value="">Nenhum</option>
                    {grupos.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              )}

              {(novoUser.userType === "store_manager" || novoUser.userType === "disp_compartilhado") && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loja</label>
                  <select className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none" value={novoUser.storeId} onChange={e => setNovoUser({ ...novoUser, storeId: e.target.value })}>
                    <option value="">Nenhuma</option>
                    {lojasFiltradas(novoUser.restaurantGroupId).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone <span className="text-slate-300 font-normal normal-case">(opcional)</span></label>
                <input type="tel" className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none" placeholder="(11) 99999-9999" value={novoUser.phone} onChange={e => setNovoUser({ ...novoUser, phone: e.target.value })} />
              </div>

              {/* Senha inicial */}
              <div className="pt-1 border-t border-slate-100">
                <CampoSenha
                  label="Senha Inicial (opcional)"
                  value={novoUser.password}
                  onChange={v => setNovoUser({ ...novoUser, password: v })}
                  placeholder="Deixe em branco para enviar convite por e-mail"
                />
              </div>
            </div>

            <button onClick={criarUsuario} disabled={saving} className="mt-5 bg-gradient-to-r from-rose-500 to-rose-600 text-white w-full py-3 rounded-xl font-bold min-h-[48px] shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60">
              {saving ? "Criando..." : novoUser.password ? "Criar Usuário com Senha" : "Criar e Enviar Convite"}
            </button>
            <button onClick={() => setModalNovoOpen(false)} className="mt-2 w-full text-slate-400 hover:text-slate-600 py-3 min-h-[44px] font-semibold rounded-xl hover:bg-slate-50 transition-all cursor-pointer">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR USUÁRIO ───────────────────────────────────────────── */}
      {modalEditarOpen && editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-xl">Editar Usuário</h3>
              <button onClick={() => setModalEditarOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo *</label>
                <input className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none" value={editUser.full_name} onChange={e => setEditUser({ ...editUser, full_name: e.target.value })} autoFocus />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail</label>
                <input disabled className="border border-slate-100 p-3 w-full rounded-lg bg-slate-50 text-slate-400 cursor-not-allowed" value={editUser.email || ""} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Acesso *</label>
                <select className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none" value={editUser.user_type} onChange={e => setEditUser({ ...editUser, user_type: e.target.value })}>
                  {tiposCriáveis.map(t => <option key={t} value={t}>{TIPO_CONFIG[t]?.label || t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Grupo</label>
                <select className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none" value={editUser.restaurant_group_id || ""} onChange={e => setEditUser({ ...editUser, restaurant_group_id: e.target.value || null, store_id: null })}>
                  <option value="">Nenhum</option>
                  {grupos.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loja</label>
                <select className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none" value={editUser.store_id || ""} onChange={e => setEditUser({ ...editUser, store_id: e.target.value || null })}>
                  <option value="">Nenhuma</option>
                  {lojasFiltradas(editUser.restaurant_group_id).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone</label>
                <input type="tel" className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none" placeholder="(11) 99999-9999" value={editUser.phone || ""} onChange={e => setEditUser({ ...editUser, phone: e.target.value })} />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="text-sm font-semibold text-slate-700">Usuário ativo</label>
                <button onClick={() => setEditUser({ ...editUser, active: !editUser.active })} className="cursor-pointer">
                  {editUser.active ? <ToggleRight className="text-green-600" size={32} /> : <ToggleLeft className="text-slate-400" size={32} />}
                </button>
              </div>
            </div>

            <button onClick={salvarEdicao} disabled={savingEdit} className="mt-5 bg-gradient-to-r from-rose-500 to-rose-600 text-white w-full py-3 rounded-xl font-bold min-h-[48px] shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60">
              {savingEdit ? "Salvando..." : "Salvar Alterações"}
            </button>

            {/* ── Seção Trocar Senha ────────────────────────────────────────── */}
            <div className="mt-4 border-t border-slate-100 pt-4">
              <button
                onClick={() => { setMostrarSecaoSenha(v => !v); setErroSenha(""); setSenhaAlteradaOk(false); setNovaSenha(""); }}
                className="w-full flex items-center justify-between text-slate-500 hover:text-rose-600 transition-colors cursor-pointer py-1 group"
              >
                <span className="text-sm font-semibold flex items-center gap-2 group-hover:text-rose-600">
                  <KeyRound size={16} /> Trocar Senha
                </span>
                <span className="text-xs text-slate-400">{mostrarSecaoSenha ? "Fechar ▲" : "Expandir ▼"}</span>
              </button>

              {mostrarSecaoSenha && (
                <div className="mt-3 space-y-3">
                  {!editUser.auth_user_id && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      Este usuário não possui conta de acesso vinculada. Crie o usuário com e-mail e senha primeiro.
                    </p>
                  )}

                  {senhaAlteradaOk && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-semibold">
                      Senha alterada com sucesso!
                    </div>
                  )}

                  {erroSenha && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{erroSenha}</div>
                  )}

                  <CampoSenha
                    label="Nova Senha"
                    value={novaSenha}
                    onChange={setNovaSenha}
                  />

                  <button
                    onClick={alterarSenha}
                    disabled={savingPassword || !editUser.auth_user_id}
                    className="w-full py-2.5 rounded-xl font-bold text-sm min-h-[44px] border-2 border-rose-400 text-rose-600 hover:bg-rose-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <KeyRound size={15} />
                    {savingPassword ? "Alterando..." : "Confirmar Nova Senha"}
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => setModalEditarOpen(false)} className="mt-3 w-full text-slate-400 hover:text-slate-600 py-3 min-h-[44px] font-semibold rounded-xl hover:bg-slate-50 transition-all cursor-pointer">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
