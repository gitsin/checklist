import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { gerarSlug } from "../../utils/slugify";
import { ArrowLeft, Plus, Pencil, ToggleLeft, ToggleRight, Building2, X, Info } from "lucide-react";

export default function AdminOrganizations({ goBack }) {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalNovaOpen, setModalNovaOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [novaOrg, setNovaOrg] = useState({ name: "", billing_email: "", plan: "trial", max_stores: 3 });
  const [editOrg, setEditOrg] = useState(null);

  useEffect(() => { buscarOrgs(); }, []);

  async function buscarOrgs() {
    setLoading(true);
    const { data } = await supabase
      .from("organizations")
      .select("*, restaurant_groups(count), stores(count), subscriptions(max_stores, status)")
      .not("stores.restaurant_group_id", "is", null)
      .order("name");
    setOrgs(data || []);
    setLoading(false);
  }


  async function criarOrg() {
    if (!novaOrg.name.trim()) return alert("Preencha o nome da organização");
    const slug = gerarSlug(novaOrg.name);
    const { error } = await supabase.from("organizations").insert({
      name: novaOrg.name.trim(),
      slug,
      billing_email: novaOrg.billing_email || null,
      plan: novaOrg.plan,
      max_stores: parseInt(novaOrg.max_stores) || 3,
    });
    if (error) {
      if (error.code === '23505') alert("Já existe uma organização com esse nome");
      else alert("Um erro ocorreu, por favor tente novamente.");
      return;
    }
    setModalNovaOpen(false);
    setNovaOrg({ name: "", billing_email: "", plan: "trial", max_stores: 3 });
    buscarOrgs();
  }

  async function salvarEdicao() {
    if (!editOrg.name.trim()) return alert("Preencha o nome da organização");
    const slug = gerarSlug(editOrg.name);
    const { error } = await supabase.from("organizations").update({
      name: editOrg.name.trim(),
      slug,
      billing_email: editOrg.billing_email || null,
      plan: editOrg.plan,
      max_stores: parseInt(editOrg.max_stores) || 3,
      logo_url: editOrg.logo_url || null,
    }).eq("id", editOrg.id);
    if (error) {
      if (error.code === '23505') alert("Já existe uma organização com esse nome");
      else alert("Um erro ocorreu, por favor tente novamente.");
      return;
    }
    setModalEditarOpen(false);
    buscarOrgs();
  }

  async function toggleStatus(org) {
    await supabase.from("organizations").update({ active: !org.active }).eq("id", org.id);
    buscarOrgs();
  }

  const planLabels = { trial: "Trial", standard: "Assinatura", starter: "Assinatura", professional: "Assinatura", enterprise: "Assinatura" };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <button onClick={goBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 font-semibold transition-colors min-h-[44px] group cursor-pointer">
          <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" /> Voltar
        </button>
        <button
          onClick={() => { setNovaOrg({ name: "", billing_email: "", plan: "trial", max_stores: 3 }); setModalNovaOpen(true); }}
          className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:from-indigo-600 hover:to-indigo-700 shadow-md hover:shadow-lg flex items-center gap-2 transition-all active:scale-[0.97] cursor-pointer"
        >
          <Plus size={16} /> Nova Organização
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-12">
          <Building2 size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400">Nenhuma organização cadastrada</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {orgs.map(org => (
            <div key={org.id} className={`p-5 rounded-xl flex justify-between items-start border-l-8 ${org.active ? 'bg-white text-slate-800 border-indigo-500' : 'bg-slate-300 text-slate-500 border-slate-500'}`}>
              <div>
                <div className="font-bold text-lg flex items-center gap-2">
                  <Building2 size={18} className={org.active ? 'text-indigo-500' : 'text-slate-400'} />
                  {org.name}
                </div>
                <div className="flex gap-2 mt-2 flex-wrap items-center">
                  <span className="text-[10px] font-bold uppercase bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                    {planLabels[org.plan] || org.plan}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {org.stores?.[0]?.count || 0} lojas · {org.restaurant_groups?.[0]?.count || 0} grupos
                  </span>
                  {org.subscriptions?.[0]?.max_stores && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {org.subscriptions[0].max_stores} contratadas
                    </span>
                  )}
                </div>
                {org.billing_email && (
                  <div className="text-xs text-slate-400 mt-1">{org.billing_email}</div>
                )}
              </div>
              <div className="flex gap-2 items-center shrink-0">
                <button onClick={() => { setEditOrg({ ...org }); setModalEditarOpen(true); }} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors cursor-pointer">
                  <Pencil size={18} />
                </button>
                <button onClick={() => toggleStatus(org)} className="cursor-pointer">
                  {org.active ? <ToggleRight className="text-green-600" size={30} /> : <ToggleLeft size={30} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL NOVA ORGANIZAÇÃO */}
      {modalNovaOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md text-slate-800 max-h-[90dvh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-xl">Nova Organização</h3>
              <button onClick={() => setModalNovaOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>

            <p className="text-xs text-slate-400 mb-5 flex items-start gap-1.5">
              <Info size={14} className="shrink-0 mt-0.5" />
              Uma organização representa a empresa (holding) que gerencia os restaurantes.
            </p>

            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Empresa</label>
              <input
                className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none"
                placeholder="Ex: Grupo Sabor, Rede Bom Prato..."
                value={novaOrg.name}
                onChange={e => setNovaOrg({ ...novaOrg, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email de Cobrança <span className="text-slate-300 font-normal normal-case">(opcional)</span></label>
              <input type="email" className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none" placeholder="financeiro@empresa.com" value={novaOrg.billing_email} onChange={e => setNovaOrg({ ...novaOrg, billing_email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Plano</label>
                <select className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none" value={novaOrg.plan} onChange={e => setNovaOrg({ ...novaOrg, plan: e.target.value })}>
                  <option value="trial">Trial</option>
                  <option value="standard">Assinatura</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Limite de Lojas</label>
                <input type="number" min="1" className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none" value={novaOrg.max_stores} onChange={e => setNovaOrg({ ...novaOrg, max_stores: e.target.value })} />
              </div>
            </div>

            <button onClick={criarOrg} className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white w-full py-3 rounded-xl font-bold min-h-[48px] shadow-md hover:shadow-lg hover:from-indigo-600 hover:to-indigo-700 transition-all active:scale-[0.98] cursor-pointer">Criar Organização</button>
            <button onClick={() => setModalNovaOpen(false)} className="mt-2 w-full text-slate-400 hover:text-slate-600 py-3 min-h-[44px] font-semibold rounded-xl hover:bg-slate-50 transition-all cursor-pointer">Cancelar</button>
          </div>
        </div>
      )}

      {/* MODAL EDITAR ORGANIZAÇÃO */}
      {modalEditarOpen && editOrg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md text-slate-800 max-h-[90dvh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xl">Editar Organização</h3>
              <button onClick={() => setModalEditarOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Empresa</label>
              <input className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none" value={editOrg.name} onChange={e => setEditOrg({ ...editOrg, name: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Logo URL <span className="text-slate-300 font-normal normal-case">(opcional)</span></label>
              <input className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none" placeholder="https://..." value={editOrg.logo_url || ""} onChange={e => setEditOrg({ ...editOrg, logo_url: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email de Cobrança <span className="text-slate-300 font-normal normal-case">(opcional)</span></label>
              <input type="email" className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none" value={editOrg.billing_email || ""} onChange={e => setEditOrg({ ...editOrg, billing_email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Plano</label>
                <select className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none" value={editOrg.plan} onChange={e => setEditOrg({ ...editOrg, plan: e.target.value })}>
                  <option value="trial">Trial</option>
                  <option value="standard">Assinatura</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Limite de Lojas</label>
                <input type="number" min="1" className="border border-slate-200 p-3 w-full rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none" value={editOrg.max_stores} onChange={e => setEditOrg({ ...editOrg, max_stores: e.target.value })} />
              </div>
            </div>

            <button onClick={salvarEdicao} className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white w-full py-3 rounded-xl font-bold min-h-[48px] shadow-md hover:shadow-lg hover:from-indigo-600 hover:to-indigo-700 transition-all active:scale-[0.98] cursor-pointer">Salvar Alterações</button>
            <button onClick={() => setModalEditarOpen(false)} className="mt-2 w-full text-slate-400 hover:text-slate-600 py-3 min-h-[44px] font-semibold rounded-xl hover:bg-slate-50 transition-all cursor-pointer">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
