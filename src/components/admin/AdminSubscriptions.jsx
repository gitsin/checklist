import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { ArrowLeft, CreditCard, Pencil, X, AlertTriangle, Plus, Minus, ShieldAlert } from 'lucide-react';

function formatPrice(value) {
  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStatusConfig(status) {
  const map = {
    trialing: { label: 'Em Trial', bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' },
    active: { label: 'Ativo', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    past_due: { label: 'Inadimplente', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
    canceled: { label: 'Cancelado', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  };
  return map[status] || { label: status, bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' };
}

function getTrialDaysRemaining(trialEndsAt) {
  if (!trialEndsAt) return null;
  const now = new Date();
  const end = new Date(trialEndsAt);
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

export default function AdminSubscriptions({ goBack, orgId, isSuperAdmin }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [storeCountsByOrg, setStoreCountsByOrg] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ status: '', max_stores: '', price_per_store: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // holding_owner state
  const [ownerSub, setOwnerSub] = useState(null);
  const [ownerStoreCount, setOwnerStoreCount] = useState(0);
  const [currentPricing, setCurrentPricing] = useState(null);

  // owner action modals
  const [addSlotsModal, setAddSlotsModal] = useState(false);
  const [addSlotsQty, setAddSlotsQty] = useState(1);
  const [addSlotsError, setAddSlotsError] = useState('');
  const [reduceSlotsModal, setReduceSlotsModal] = useState(false);
  const [reduceNewTotal, setReduceNewTotal] = useState('');
  const [reduceSlotsError, setReduceSlotsError] = useState('');
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelStep, setCancelStep] = useState(1);
  const [cancelConfirmText, setCancelConfirmText] = useState('');
  const [ownerSaving, setOwnerSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    if (isSuperAdmin) {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('*, organizations(name, slug, billing_email)')
        .order('created_at', { ascending: false });

      const { data: stores } = await supabase
        .from('stores')
        .select('organization_id')
        .eq('active', true);

      setSubscriptions(subs || []);

      const counts = {};
      (stores || []).forEach(s => {
        counts[s.organization_id] = (counts[s.organization_id] || 0) + 1;
      });
      setStoreCountsByOrg(counts);
    } else {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*, organizations(name)')
        .eq('organization_id', orgId)
        .single();

      const { count } = await supabase
        .from('stores')
        .select('id', { count: 'exact' })
        .eq('organization_id', orgId)
        .eq('active', true);

      const { data: pricingData } = await supabase.rpc('get_current_pricing');
      const pricing = Array.isArray(pricingData) ? pricingData[0] : pricingData;
      setCurrentPricing(pricing || null);

      setOwnerSub(sub);
      setOwnerStoreCount(count || 0);
    }
    setLoading(false);
  }

  // ── Owner action helpers ──────────────────────────────────────────

  function getDaysRemaining(periodEnd) {
    if (!periodEnd) return 0;
    const now = new Date();
    const end = new Date(periodEnd);
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }

  function calcProRata(slots, pricePerStore, daysRemaining) {
    return slots * pricePerStore * (daysRemaining / 30);
  }

  function getOwnerPrice() {
    return currentPricing ? Number(currentPricing.price_per_store) : Number(ownerSub?.price_per_store || 0);
  }

  function openAddSlots() {
    setAddSlotsQty(1);
    setAddSlotsError('');
    setAddSlotsModal(true);
  }

  async function handleAddSlots() {
    const qty = parseInt(addSlotsQty);
    if (!qty || qty < 1) {
      setAddSlotsError('Mínimo de 1 loja adicional');
      return;
    }
    setOwnerSaving(true);
    const { error } = await supabase
      .from('subscriptions')
      .update({
        max_stores: ownerSub.max_stores + qty,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ownerSub.id);

    if (error) {
      setAddSlotsError('Um erro ocorreu, por favor tente novamente');
      setOwnerSaving(false);
      return;
    }
    setOwnerSaving(false);
    setAddSlotsModal(false);
    await fetchData();
  }

  function openReduceSlots() {
    setReduceNewTotal(String(ownerSub.max_stores - 1));
    setReduceSlotsError('');
    setReduceSlotsModal(true);
  }

  async function handleReduceSlots() {
    const newTotal = parseInt(reduceNewTotal);
    if (!newTotal || newTotal < 1) {
      setReduceSlotsError('Mínimo de 1 loja');
      return;
    }
    if (newTotal < ownerStoreCount) {
      setReduceSlotsError(`Não é possível reduzir abaixo de ${ownerStoreCount} (lojas ativas)`);
      return;
    }
    setOwnerSaving(true);
    const { error } = await supabase
      .from('subscriptions')
      .update({
        pending_changes: { type: 'reduce', new_max_stores: newTotal },
        updated_at: new Date().toISOString(),
      })
      .eq('id', ownerSub.id);

    if (error) {
      setReduceSlotsError('Um erro ocorreu, por favor tente novamente');
      setOwnerSaving(false);
      return;
    }
    setOwnerSaving(false);
    setReduceSlotsModal(false);
    await fetchData();
  }

  function openCancelModal() {
    setCancelStep(1);
    setCancelConfirmText('');
    setCancelModal(true);
  }

  async function handleCancel() {
    setOwnerSaving(true);
    const { error } = await supabase
      .from('subscriptions')
      .update({
        pending_changes: { type: 'cancel' },
        updated_at: new Date().toISOString(),
      })
      .eq('id', ownerSub.id);

    if (error) {
      setOwnerSaving(false);
      return;
    }
    setOwnerSaving(false);
    setCancelModal(false);
    await fetchData();
  }

  // ── Super Admin helpers ─────────────────────────────────────────────

  function getActiveStores(orgId) {
    return storeCountsByOrg[orgId] || 0;
  }

  function getMRR() {
    return subscriptions
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + getActiveStores(s.organization_id) * Number(s.price_per_store), 0);
  }

  function countByStatus(status) {
    return subscriptions.filter(s => s.status === status).length;
  }

  const filteredSubs = filter === 'all'
    ? subscriptions
    : subscriptions.filter(s => s.status === filter);

  // ── Edit modal ──────────────────────────────────────────────────────

  function openEdit(sub) {
    setEditForm({
      status: sub.status,
      max_stores: String(sub.max_stores),
      price_per_store: String(sub.price_per_store),
    });
    setFormError('');
    setEditModal(sub);
  }

  async function handleSave() {
    setFormError('');
    const maxStores = parseInt(editForm.max_stores);
    if (!maxStores || maxStores < 1) {
      setFormError('Mínimo de 1 loja');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: editForm.status,
        max_stores: maxStores,
        price_per_store: parseFloat(editForm.price_per_store),
        updated_at: new Date().toISOString(),
      })
      .eq('id', editModal.id);

    if (error) {
      setFormError('Um erro ocorreu, por favor tente novamente');
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditModal(null);
    await fetchData();
  }

  // ── Loading ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center mb-6">
          <button onClick={goBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-800 font-medium text-sm transition-colors cursor-pointer">
            <ArrowLeft size={18} /> Voltar
          </button>
        </div>
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  // ── Holding Owner View ──────────────────────────────────────────────

  if (!isSuperAdmin) {
    if (!ownerSub) {
      return (
        <div className="animate-fade-in">
          <div className="flex items-center mb-6">
            <button onClick={goBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-800 font-medium text-sm transition-colors cursor-pointer">
              <ArrowLeft size={18} /> Voltar
            </button>
          </div>
          <div className="text-center py-16 text-slate-400">
            <CreditCard size={48} className="mx-auto mb-4" />
            <p className="font-medium">Nenhuma assinatura encontrada</p>
          </div>
        </div>
      );
    }

    const sc = getStatusConfig(ownerSub.status);
    const trialDays = getTrialDaysRemaining(ownerSub.trial_ends_at);
    const usagePercent = ownerSub.max_stores > 0
      ? Math.min(100, Math.round((ownerStoreCount / ownerSub.max_stores) * 100))
      : 0;

    return (
      <div className="animate-fade-in">
        <div className="flex items-center mb-6">
          <button onClick={goBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-800 font-medium text-sm transition-colors cursor-pointer">
            <ArrowLeft size={18} /> Voltar
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-800">{ownerSub.organizations?.name}</h3>
            <span className={`${sc.bg} ${sc.text} text-xs font-bold px-3 py-1 rounded-full`}>
              {sc.label}
            </span>
          </div>

          {trialDays !== null && trialDays > 0 && (
            <p className="text-violet-600 text-sm font-medium mb-4">
              {trialDays} dias restantes de trial
            </p>
          )}

          {/* Barra de uso */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-500">Lojas ativas</span>
              <span className="font-bold text-slate-700">{ownerStoreCount} / {ownerSub.max_stores}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${usagePercent >= 100 ? 'bg-red-500' : usagePercent >= 80 ? 'bg-amber-500' : 'bg-primary-500'}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>

          <div className="space-y-2 text-sm text-slate-500">
            <p>Preço: <span className="font-bold text-slate-700">{formatPrice(ownerSub.price_per_store)}/loja</span></p>
            {ownerSub.current_period_start && (
              <p>Período: {new Date(ownerSub.current_period_start).toLocaleDateString('pt-BR')} — {new Date(ownerSub.current_period_end).toLocaleDateString('pt-BR')}</p>
            )}
          </div>

          {/* Pending changes badges */}
          {ownerSub.pending_changes?.type === 'reduce' && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 font-medium">
              Redução agendada para {ownerSub.pending_changes.new_max_stores} lojas no próximo ciclo
            </div>
          )}
          {ownerSub.pending_changes?.type === 'cancel' && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
              Cancelamento agendado para {ownerSub.current_period_end ? new Date(ownerSub.current_period_end).toLocaleDateString('pt-BR') : 'fim do ciclo'}
            </div>
          )}

          {/* Action buttons */}
          {ownerSub.status === 'active' && !ownerSub.pending_changes && (
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={openAddSlots}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-primary-500 text-primary-600 font-bold text-sm hover:bg-primary-50 active:scale-95 transition-all cursor-pointer min-h-[44px]"
              >
                <Plus size={16} /> Adicionar Lojas
              </button>
              {ownerSub.max_stores > 1 && (
                <button
                  onClick={openReduceSlots}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-300 text-slate-600 font-bold text-sm hover:bg-slate-50 active:scale-95 transition-all cursor-pointer min-h-[44px]"
                >
                  <Minus size={16} /> Reduzir Lojas
                </button>
              )}
            </div>
          )}
        </div>

        {/* Cancel link */}
        {ownerSub.status === 'active' && !ownerSub.pending_changes && (
          <button
            onClick={openCancelModal}
            className="mt-4 text-red-400 hover:text-red-600 text-sm font-medium transition-colors cursor-pointer"
          >
            Cancelar assinatura
          </button>
        )}

        {/* ── Modal Adicionar Lojas ────────────────────────────────── */}
        {addSlotsModal && (() => {
          const price = getOwnerPrice();
          const daysLeft = getDaysRemaining(ownerSub.current_period_end);
          const qty = parseInt(addSlotsQty) || 0;
          const proRata = calcProRata(qty, price, daysLeft);
          const newTotal = ownerSub.max_stores + (qty > 0 ? qty : 0);
          const nextCycleTotal = newTotal * price;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setAddSlotsModal(false)}>
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-slate-800">Adicionar Lojas</h3>
                  <button onClick={() => setAddSlotsModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-4">
                  <label htmlFor="add-slots-qty" className="block text-xs font-bold text-slate-500 uppercase mb-2">Quantas lojas adicionar?</label>
                  <input
                    id="add-slots-qty"
                    type="number"
                    min="1"
                    value={addSlotsQty}
                    onChange={e => setAddSlotsQty(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
                  />
                </div>

                {qty > 0 && (
                  <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
                    <p className="text-slate-600">
                      {qty} {qty === 1 ? 'loja adicional' : 'lojas adicionais'} × {formatPrice(price)} × ({daysLeft} dias restantes / 30)
                    </p>
                    <p className="font-bold text-slate-800">
                      Cobrança imediata (pró-rata): <span className="text-primary-600">{formatPrice(proRata)}</span>
                    </p>
                    <hr className="border-slate-200" />
                    <p className="text-slate-600">
                      A partir do próximo ciclo: <span className="font-bold text-slate-800">{formatPrice(nextCycleTotal)}/mês</span> ({newTotal} lojas × {formatPrice(price)})
                    </p>
                  </div>
                )}

                {addSlotsError && <p className="text-red-500 text-xs font-bold mb-4 text-center">{addSlotsError}</p>}

                <div className="flex gap-3">
                  <button onClick={() => setAddSlotsModal(false)}
                    className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 active:scale-95 transition-all min-h-[48px] cursor-pointer">
                    Cancelar
                  </button>
                  <button onClick={handleAddSlots} disabled={ownerSaving}
                    className="flex-1 bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 active:scale-95 transition-all min-h-[48px] disabled:opacity-50 cursor-pointer">
                    {ownerSaving ? 'Salvando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Modal Reduzir Lojas ──────────────────────────────────── */}
        {reduceSlotsModal && (() => {
          const price = getOwnerPrice();
          const newTotal = parseInt(reduceNewTotal) || 0;
          const nextCycleValue = newTotal * price;
          const periodEndDate = ownerSub.current_period_end
            ? new Date(ownerSub.current_period_end).toLocaleDateString('pt-BR')
            : '—';

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setReduceSlotsModal(false)}>
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-slate-800">Reduzir Lojas</h3>
                  <button onClick={() => setReduceSlotsModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-4">
                  <label htmlFor="reduce-new-total" className="block text-xs font-bold text-slate-500 uppercase mb-2">Novo total de lojas</label>
                  <input
                    id="reduce-new-total"
                    type="number"
                    min="1"
                    max={ownerSub.max_stores - 1}
                    value={reduceNewTotal}
                    onChange={e => setReduceNewTotal(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-700">
                  A redução será aplicada no início do próximo ciclo ({periodEndDate}). Até lá, suas {ownerSub.max_stores} lojas continuam disponíveis.
                </div>

                {newTotal > 0 && (
                  <p className="text-sm text-slate-600 mb-4">
                    Novo valor mensal: <span className="font-bold">{newTotal} lojas × {formatPrice(price)} = {formatPrice(nextCycleValue)}</span>
                  </p>
                )}

                {reduceSlotsError && <p className="text-red-500 text-xs font-bold mb-4 text-center">{reduceSlotsError}</p>}

                <div className="flex gap-3">
                  <button onClick={() => setReduceSlotsModal(false)}
                    className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 active:scale-95 transition-all min-h-[48px] cursor-pointer">
                    Cancelar
                  </button>
                  <button onClick={handleReduceSlots} disabled={ownerSaving}
                    className="flex-1 bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 active:scale-95 transition-all min-h-[48px] disabled:opacity-50 cursor-pointer">
                    {ownerSaving ? 'Salvando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Modal Cancelamento ───────────────────────────────────── */}
        {cancelModal && (() => {
          const periodEndDate = ownerSub.current_period_end
            ? new Date(ownerSub.current_period_end).toLocaleDateString('pt-BR')
            : '—';

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setCancelModal(false)}>
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                {cancelStep === 1 ? (
                  <>
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-lg font-bold text-slate-800">Tem certeza que deseja cancelar?</h3>
                      <button onClick={() => setCancelModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="space-y-4 text-sm text-slate-600 mb-6">
                      <p className="font-bold text-slate-800">Sua equipe conta com o Niilu todos os dias.</p>
                      <p>Ao cancelar, no final do ciclo atual ({periodEndDate}):</p>
                      <ul className="space-y-2 ml-4">
                        <li>• Seus colaboradores perderão acesso ao checklist diário</li>
                        <li>• O histórico de tarefas e relatórios ficará indisponível</li>
                        <li>• As rotinas e configurações da sua operação serão pausadas</li>
                      </ul>
                      <p className="font-bold text-slate-800">Precisa de ajuda? Muitas vezes, ajustar o plano resolve. Você pode reduzir lojas ou falar com nosso time.</p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => setCancelModal(false)}
                        className="w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 active:scale-95 transition-all min-h-[48px] cursor-pointer"
                      >
                        Manter Assinatura
                      </button>
                      <button
                        onClick={() => setCancelStep(2)}
                        className="w-full text-red-400 hover:text-red-600 text-sm font-medium transition-colors cursor-pointer py-2"
                      >
                        Continuar cancelamento
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-lg font-bold text-slate-800">Confirmar cancelamento</h3>
                      <button onClick={() => setCancelModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="space-y-3 text-sm text-slate-600 mb-5">
                      <p>Sua assinatura será cancelada ao final do período atual (<span className="font-bold">{periodEndDate}</span>).</p>
                      <p>Até lá, você e sua equipe continuam com acesso normal.</p>
                      <p>Você pode reativar a qualquer momento antes dessa data.</p>
                    </div>

                    <div className="mb-5">
                      <label htmlFor="cancel-confirm" className="block text-xs font-bold text-slate-500 uppercase mb-2">
                        Digite CANCELAR para confirmar
                      </label>
                      <input
                        id="cancel-confirm"
                        type="text"
                        placeholder="Digite CANCELAR"
                        value={cancelConfirmText}
                        onChange={e => setCancelConfirmText(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-red-500 focus:outline-none text-slate-800 transition-colors"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setCancelStep(1)}
                        className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 active:scale-95 transition-all min-h-[48px] cursor-pointer"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={cancelConfirmText !== 'CANCELAR' || ownerSaving}
                        className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 active:scale-95 transition-all min-h-[48px] disabled:opacity-50 cursor-pointer"
                      >
                        {ownerSaving ? 'Processando...' : 'Confirmar Cancelamento'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // ── Super Admin View ────────────────────────────────────────────────

  const mrr = getMRR();
  const activeCount = countByStatus('active');
  const trialCount = countByStatus('trialing');
  const canceledCount = countByStatus('canceled');

  const summaryCards = [
    { label: 'MRR', value: formatPrice(mrr), color: 'text-primary-700 bg-primary-50 border-primary-100' },
    { label: 'Ativos', value: String(activeCount), color: 'text-green-700 bg-green-50 border-green-100' },
    { label: 'Trials Ativos', value: String(trialCount), color: 'text-violet-700 bg-violet-50 border-violet-100' },
    { label: 'Cancelados', value: String(canceledCount), color: 'text-red-700 bg-red-50 border-red-100' },
  ];

  const filterOptions = [
    { key: 'all', label: 'Todos', count: subscriptions.length },
    { key: 'trialing', label: 'Em Trial', count: trialCount },
    { key: 'active', label: 'Ativos', count: activeCount },
    { key: 'past_due', label: 'Inadimplentes', count: countByStatus('past_due') },
    { key: 'canceled', label: 'Cancelados', count: canceledCount },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button onClick={goBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-800 font-medium text-sm transition-colors cursor-pointer">
          <ArrowLeft size={18} /> Voltar
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {summaryCards.map(card => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
            <p className="text-xs font-bold uppercase opacity-70 mb-1">{card.label}</p>
            <p className="text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {filterOptions.map(opt => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer min-h-[32px] ${
              filter === opt.key
                ? 'bg-primary-500 text-white'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {opt.label} ({opt.count})
          </button>
        ))}
      </div>

      {/* Lista */}
      {filteredSubs.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CreditCard size={48} className="mx-auto mb-4" />
          <p className="font-medium">Nenhuma assinatura encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSubs.map(sub => {
            const sc = getStatusConfig(sub.status);
            const activeStores = getActiveStores(sub.organization_id);
            const trialDays = getTrialDaysRemaining(sub.trial_ends_at);
            const isOverLimit = activeStores > sub.max_stores;
            const monthlyTotal = activeStores * Number(sub.price_per_store);

            return (
              <div
                key={sub.id}
                className={`bg-white rounded-xl border-l-4 border p-4 transition-all shadow-sm ${sc.border}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-slate-800">{sub.organizations?.name}</span>
                      <span className={`${sc.bg} ${sc.text} text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                        {sc.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 mb-1">
                      <span>Lojas: <span className="font-bold text-slate-600">{activeStores}/{sub.max_stores}</span></span>
                      <span>{formatPrice(sub.price_per_store)}/loja</span>
                      {sub.status === 'active' && (
                        <span className="font-bold text-slate-600">Total: {formatPrice(monthlyTotal)}/mês</span>
                      )}
                    </div>

                    {trialDays !== null && trialDays > 0 && sub.status === 'trialing' && (
                      <p className="text-violet-600 text-xs font-medium">{trialDays} dias restantes de trial</p>
                    )}

                    {isOverLimit && (
                      <p className="text-amber-600 text-xs font-medium flex items-center gap-1 mt-1">
                        <AlertTriangle size={12} /> Excedente: {activeStores - sub.max_stores} loja(s) acima do limite
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => openEdit(sub)}
                    aria-label="Editar"
                    className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors p-1"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800">Editar Assinatura</h3>
              <button onClick={() => setEditModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-4">{editModal.organizations?.name}</p>

            <div className="mb-4">
              <label htmlFor="edit-status" className="block text-xs font-bold text-slate-500 uppercase mb-2">Status</label>
              <select
                id="edit-status"
                value={editForm.status}
                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
              >
                <option value="trialing">Em Trial</option>
                <option value="active">Ativo</option>
                <option value="past_due">Inadimplente</option>
                <option value="canceled">Cancelado</option>
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="edit-max-stores" className="block text-xs font-bold text-slate-500 uppercase mb-2">Máx. Lojas</label>
              <input
                id="edit-max-stores"
                type="number"
                min="1"
                value={editForm.max_stores}
                onChange={e => setEditForm({ ...editForm, max_stores: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="edit-price" className="block text-xs font-bold text-slate-500 uppercase mb-2">Preço por loja (R$)</label>
              <input
                id="edit-price"
                type="number"
                step="0.01"
                min="0.01"
                value={editForm.price_per_store}
                onChange={e => setEditForm({ ...editForm, price_per_store: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
              />
            </div>

            {formError && <p className="text-red-500 text-xs font-bold mb-4 text-center">{formError}</p>}

            <div className="flex gap-3">
              <button onClick={() => setEditModal(null)}
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
