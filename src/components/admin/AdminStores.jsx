import { useState } from "react";
import { supabase } from "../../supabaseClient";
import { ArrowLeft, Plus, Pencil, ToggleLeft, ToggleRight, MessageCircle } from "lucide-react";

export default function AdminStores({ goBack, lojas, onUpdate }) {
  const [novaLojaNome, setNovaLojaNome] = useState("");
  const [modalEditarLojaOpen, setModalEditarLojaOpen] = useState(false);
  const [lojaEmEdicao, setLojaEmEdicao] = useState(null);
  const [editLojaData, setEditLojaData] = useState({ name: "", shortName: "", code: "", whatsapp_phone: "", whatsapp_api_key: "", whatsapp_enabled: false });

  async function criarLoja() {
    if (!novaLojaNome) return alert("Digite o nome da loja");
    const { error } = await supabase.from("stores").insert({ name: novaLojaNome, timezone: 'America/Sao_Paulo', active: true });
    if (error) alert("Erro: " + error.message); else { setNovaLojaNome(""); onUpdate(); }
  }

  async function toggleStatusLoja(loja) {
    const { error } = await supabase.from("stores").update({ active: !loja.active }).eq("id", loja.id);
    if (error) alert("Erro: " + error.message); else onUpdate();
  }

  function abrirModalEditarLoja(loja) {
    setLojaEmEdicao(loja);
    setEditLojaData({ name: loja.name || "", shortName: loja.shortName || "", code: loja.InternalCode || "", whatsapp_phone: loja.whatsapp_phone || "", whatsapp_api_key: loja.whatsapp_api_key || "", whatsapp_enabled: loja.whatsapp_enabled || false });
    setModalEditarLojaOpen(true);
  }

  async function salvarEdicaoLoja() {
    if (!editLojaData.name) return alert("Nome obrigatório");
    const { error } = await supabase.from("stores").update({
      name: editLojaData.name, shortName: editLojaData.shortName, InternalCode: editLojaData.code,
      whatsapp_phone: editLojaData.whatsapp_phone || null, whatsapp_api_key: editLojaData.whatsapp_api_key || null, whatsapp_enabled: editLojaData.whatsapp_enabled
    }).eq("id", lojaEmEdicao.id);
    if (error) alert(error.message); else { setModalEditarLojaOpen(false); onUpdate(); }
  }

  return (
    <div className="animate-fade-in">
      <button onClick={goBack} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-slate-700 font-semibold transition-colors min-h-[44px] group"><ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" /> Voltar</button>

      <div className="bg-white p-6 rounded-xl mb-8 border border-slate-200 shadow-sm">
        <h3 className="text-xl font-bold mb-4 text-slate-800">Adicionar Nova Loja</h3>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <input type="text" placeholder="Nome da Loja" className="flex-1 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors" value={novaLojaNome} onChange={(e) => setNovaLojaNome(e.target.value)} />
          <button onClick={criarLoja} className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 font-bold flex items-center justify-center gap-2 min-h-[48px] w-full sm:w-auto shadow-md hover:shadow-lg transition-all active:scale-[0.97]"><Plus size={18} /> Criar</button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {lojas.map(loja => (
          <div key={loja.id} className={`p-4 rounded-lg flex justify-between items-center border-l-8 ${loja.active ? 'bg-white text-slate-800 border-green-500' : 'bg-slate-300 text-slate-500 border-slate-500'}`}>
            <div><span className="font-bold text-lg block">{loja.name}</span><span className="text-xs text-slate-500">Cod: {loja.InternalCode || '-'}</span>{loja.whatsapp_enabled && <span className="ml-2 inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold"><MessageCircle size={10} /> WhatsApp</span>}</div>
            <div className="flex gap-2">
              <button onClick={() => toggleStatusLoja(loja)}>{loja.active ? <ToggleRight className="text-green-600" size={30} /> : <ToggleLeft size={30} />}</button>
              <button onClick={() => abrirModalEditarLoja(loja)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"><Pencil size={18} /></button>
            </div>
          </div>
        ))}
      </div>

      {modalEditarLojaOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-md text-slate-800 max-h-[90dvh] overflow-y-auto">
            <h3 className="font-bold text-xl mb-4">Editar Loja</h3>
            <div className="mb-3"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label><input className="border p-2 w-full rounded" value={editLojaData.name} onChange={e => setEditLojaData({ ...editLojaData, name: e.target.value })} /></div>
            <div className="mb-3"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Curto</label><input className="border p-2 w-full rounded" value={editLojaData.shortName} onChange={e => setEditLojaData({ ...editLojaData, shortName: e.target.value })} /></div>
            <div className="mb-4"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código ERP</label><input className="border p-2 w-full rounded" value={editLojaData.code} onChange={e => setEditLojaData({ ...editLojaData, code: e.target.value })} /></div>

            <div className="border-t pt-4 mt-2 mb-4">
              <h4 className="font-bold text-sm text-green-700 flex items-center gap-2 mb-3"><MessageCircle size={16} /> Configuração WhatsApp</h4>
              <div className="mb-3"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone Comercial</label><input className="border p-2 w-full rounded" placeholder="+5511999999999" value={editLojaData.whatsapp_phone} onChange={e => setEditLojaData({ ...editLojaData, whatsapp_phone: e.target.value })} /></div>
              <div className="mb-3"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chave API Meta</label><input className="border p-2 w-full rounded font-mono text-xs" placeholder="EAABs..." value={editLojaData.whatsapp_api_key} onChange={e => setEditLojaData({ ...editLojaData, whatsapp_api_key: e.target.value })} /></div>
              <div className="flex items-center gap-3"><button type="button" onClick={() => setEditLojaData({ ...editLojaData, whatsapp_enabled: !editLojaData.whatsapp_enabled })}>{editLojaData.whatsapp_enabled ? <ToggleRight className="text-green-600" size={30} /> : <ToggleLeft className="text-slate-400" size={30} />}</button><span className="text-sm font-bold text-slate-600">{editLojaData.whatsapp_enabled ? 'Notificações Ativas' : 'Notificações Desativadas'}</span></div>
            </div>

            <button onClick={salvarEdicaoLoja} className="bg-gradient-to-r from-blue-500 to-blue-600 text-white w-full py-3 rounded-xl font-bold min-h-[48px] shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all active:scale-[0.98]">Salvar</button>
            <button onClick={() => setModalEditarLojaOpen(false)} className="mt-2 w-full text-slate-400 hover:text-slate-600 py-3 min-h-[44px] font-semibold rounded-xl hover:bg-slate-50 transition-all">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}