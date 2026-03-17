import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { formatPrice } from '../../utils/formatPrice';
import { ArrowLeft, Plus, X, DollarSign, ToggleLeft, ToggleRight, CalendarDays, BadgeCheck } from 'lucide-react';

function isCurrentlyActive(plan) {
  if (!plan.active) return false;
  const today = new Date().toISOString().split('T')[0];
  if (plan.valid_from > today) return false;
  if (plan.valid_until && plan.valid_until < today) return false;
  return true;
}

export default function AdminPricing({ goBack }) {
  const [plans, setPlans] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [newPlan, setNewPlan] = useState({
    price_per_store: '',
    valid_from: today,
    valid_until: '',
  });

  useEffect(() => { fetchPlans(); fetchCurrentPrice(); }, []);

  async function fetchPlans() {
    setLoading(true);
    const { data } = await supabase
      .from('pricing_plans')
      .select('*')
      .order('valid_from', { ascending: false });
    setPlans(data || []);
    setLoading(false);
  }

  async function fetchCurrentPrice() {
    const { data } = await supabase.rpc('get_current_pricing');
    const row = Array.isArray(data) ? data[0] : data;
    setCurrentPrice(row || null);
  }

  async function handleToggle(plan) {
    await supabase
      .from('pricing_plans')
      .update({ active: !plan.active })
      .eq('id', plan.id);
    await fetchPlans();
    await fetchCurrentPrice();
  }

  function openModal() {
    setNewPlan({ price_per_store: '', valid_from: today, valid_until: '' });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave() {
    setFormError('');
    const price = parseFloat(newPlan.price_per_store);
    if (!price || price <= 0) {
      setFormError('Preço deve ser maior que zero');
      return;
    }
    if (!newPlan.valid_from) {
      setFormError('Data de início é obrigatória');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('pricing_plans')
      .insert({
        name: 'standard',
        price_per_store: price,
        valid_from: newPlan.valid_from,
        valid_until: newPlan.valid_until || null,
        active: true,
      });

    if (error) {
      setFormError('Um erro ocorreu, por favor tente novamente');
      setSaving(false);
      return;
    }

    setSaving(false);
    setModalOpen(false);
    await fetchPlans();
    await fetchCurrentPrice();
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={goBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-800 font-medium text-sm transition-colors cursor-pointer">
          <ArrowLeft size={18} /> Voltar
        </button>
        <button onClick={openModal} className="bg-primary-500 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-primary-600 active:scale-95 transition-all text-sm flex items-center gap-2 cursor-pointer min-h-[44px]">
          <Plus size={16} /> Novo Plano
        </button>
      </div>

      {/* Preço vigente */}
      {currentPrice && (
        <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign size={20} className="text-white" />
          </div>
          <p className="text-sm font-bold text-primary-700">
            Preço vigente: {formatPrice(currentPrice.price_per_store)}/loja
          </p>
        </div>
      )}

      {/* Lista de planos */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Carregando...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <DollarSign size={48} className="mx-auto mb-4" />
          <p className="font-medium">Nenhum plano cadastrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => {
            const vigente = isCurrentlyActive(plan);
            return (
              <div key={plan.id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 transition-all ${
                !plan.active ? 'opacity-50 border-slate-200' : vigente ? 'border-primary-200 shadow-sm' : 'border-slate-200'
              }`}>
                {/* Preço */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-800 text-lg">{formatPrice(plan.price_per_store)}</span>
                    {vigente && (
                      <span className="bg-primary-100 text-primary-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <BadgeCheck size={10} /> Vigente
                      </span>
                    )}
                    {!plan.active && (
                      <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Inativo
                      </span>
                    )}
                    {plan.active && !vigente && plan.valid_from > today && (
                      <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Futuro
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <CalendarDays size={11} /> Início: {new Date(plan.valid_from + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                    {plan.valid_until && (
                      <span>Fim: {new Date(plan.valid_until + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    )}
                    {!plan.valid_until && <span>Sem data fim</span>}
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => handleToggle(plan)}
                  aria-label="Alternar status"
                  className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {plan.active
                    ? <ToggleRight size={28} className="text-primary-500" />
                    : <ToggleLeft size={28} />
                  }
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Novo Plano */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800">Novo Plano de Preço</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <label htmlFor="price" className="block text-xs font-bold text-slate-500 uppercase mb-2">Preço por loja (R$)</label>
              <input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                value={newPlan.price_per_store}
                onChange={e => setNewPlan({ ...newPlan, price_per_store: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
                placeholder="97.00"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="valid_from" className="block text-xs font-bold text-slate-500 uppercase mb-2">Vigência início</label>
              <input
                id="valid_from"
                type="date"
                value={newPlan.valid_from}
                onChange={e => setNewPlan({ ...newPlan, valid_from: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="valid_until" className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Vigência fim <span className="text-slate-300 normal-case">(opcional)</span>
              </label>
              <input
                id="valid_until"
                type="date"
                value={newPlan.valid_until}
                onChange={e => setNewPlan({ ...newPlan, valid_until: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
              />
            </div>

            {formError && <p className="text-red-500 text-xs font-bold mb-4 text-center">{formError}</p>}

            <div className="flex gap-3">
              <button onClick={() => setModalOpen(false)}
                className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 active:scale-95 transition-all min-h-[48px] cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 active:scale-95 transition-all min-h-[48px] disabled:opacity-50 cursor-pointer">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
