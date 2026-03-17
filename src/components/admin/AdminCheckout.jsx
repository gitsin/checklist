import { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { formatPrice } from '../../utils/formatPrice';
import { callEdgeFunction } from '../../utils/callEdgeFunction';
import { ArrowLeft, CreditCard, QrCode, Barcode, CheckCircle, Loader2, X, AlertTriangle } from 'lucide-react';

function formatCpfCnpj(value) {
  // Detectar se contém letras (CNPJ alfanumérico)
  const hasLetters = /[a-zA-Z]/.test(value);
  if (hasLetters) {
    // CNPJ alfanumérico: XX.XXX.XXX/XXXX-XX
    const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 14);
    if (clean.length <= 2) return clean;
    if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
    if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
    if (clean.length <= 12) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
    return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`;
  }
  // CPF ou CNPJ numérico tradicional
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) =>
      d ? `${a}.${b}.${c}-${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a
    );
  }
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a, b, c, d, e) =>
    e ? `${a}.${b}.${c}/${d}-${e}` : d ? `${a}.${b}.${c}/${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a
  );
}

function formatPhone(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, (_, a, b, c) =>
      c ? `(${a}) ${b}-${c}` : b ? `(${a}) ${b}` : a ? `(${a}` : ''
    );
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, a, b, c) =>
    c ? `(${a}) ${b}-${c}` : b ? `(${a}) ${b}` : a ? `(${a}` : ''
  );
}

function formatCep(value) {
  return value.replace(/\D/g, '').replace(/(\d{5})(\d{0,3})/, (_, a, b) =>
    b ? `${a}-${b}` : a
  );
}

function formatCardNumber(value) {
  return value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

const BILLING_TYPES = [
  { key: 'CREDIT_CARD', label: 'Cartão de Crédito', icon: CreditCard, desc: 'Cobrança automática mensal' },
  { key: 'PIX', label: 'PIX', icon: QrCode, desc: 'QR Code gerado a cada cobrança' },
  { key: 'BOLETO', label: 'Boleto', icon: Barcode, desc: 'Boleto gerado a cada cobrança' },
];

export default function AdminCheckout({ subscription, orgName, orgId, onComplete, onCancel }) {
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Step 1: Billing info
  const [billing, setBilling] = useState({
    name: orgName || '',
    cpfCnpj: '',
    email: '',
    phone: '',
    postalCode: '',
    address: '',
    addressNumber: '',
    province: '',
  });

  // Step 2: Payment method
  const [billingType, setBillingType] = useState('');

  // Step 3: Card details (only for CREDIT_CARD)
  const [card, setCard] = useState({
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
  });

  // ── Validação ──────────────────────────────────────────────────────────

  function validateStep1() {
    if (!billing.name.trim()) return 'Nome é obrigatório';
    const cpfCnpjClean = billing.cpfCnpj.replace(/[^a-zA-Z0-9]/g, '');
    if (cpfCnpjClean.length !== 11 && cpfCnpjClean.length !== 14) return 'CPF ou CNPJ inválido';
    if (!billing.phone.trim()) return 'Telefone é obrigatório';
    if (!billing.postalCode.trim() || billing.postalCode.replace(/\D/g, '').length !== 8) return 'CEP inválido';
    if (!billing.addressNumber.trim()) return 'Número do endereço é obrigatório';
    return null;
  }

  function validateStep3() {
    if (!card.holderName.trim()) return 'Nome no cartão é obrigatório';
    if (card.number.replace(/\D/g, '').length < 13) return 'Número do cartão inválido';
    const month = parseInt(card.expiryMonth);
    if (!month || month < 1 || month > 12) return 'Mês de validade inválido';
    const year = parseInt(card.expiryYear);
    if (!year || year < new Date().getFullYear() % 100) return 'Ano de validade inválido';
    if (card.ccv.length < 3) return 'CVV inválido';
    return null;
  }

  // ── Navegação ──────────────────────────────────────────────────────────

  function handleNextStep1() {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep(2);
  }

  function handleSelectBillingType(type) {
    setBillingType(type);
    setError('');
    if (type === 'CREDIT_CARD') {
      setStep(3);
    } else {
      handleSubmit(type);
    }
  }

  function handleNextStep3() {
    const err = validateStep3();
    if (err) { setError(err); return; }
    setError('');
    handleSubmit('CREDIT_CARD');
  }

  // ── Submissão ──────────────────────────────────────────────────────────

  async function handleSubmit(selectedBillingType) {
    setProcessing(true);
    setError('');

    try {
      // 1. Criar cliente no Asaas
      const customerResult = await callEdgeFunction('asaas-create-customer', {
        organizationId: orgId,
        name: billing.name,
        cpfCnpj: billing.cpfCnpj.replace(/[^a-zA-Z0-9]/g, ''),
        email: billing.email || undefined,
        mobilePhone: billing.phone.replace(/\D/g, '') || undefined,
        postalCode: billing.postalCode.replace(/\D/g, '') || undefined,
        address: billing.address || undefined,
        addressNumber: billing.addressNumber || undefined,
        province: billing.province || undefined,
      });

      const asaasCustomerId = customerResult.asaas_customer_id;

      // 2. Tokenizar cartão (se CC)
      let creditCardToken = null;
      if (selectedBillingType === 'CREDIT_CARD') {
        const tokenResult = await callEdgeFunction('asaas-tokenize-card', {
          asaasCustomerId,
          creditCard: {
            holderName: card.holderName,
            number: card.number.replace(/\D/g, ''),
            expiryMonth: card.expiryMonth.padStart(2, '0'),
            expiryYear: `20${card.expiryYear}`,
            ccv: card.ccv,
          },
          creditCardHolderInfo: {
            name: billing.name,
            email: billing.email || `${orgId}@niilu.app`,
            cpfCnpj: billing.cpfCnpj.replace(/[^a-zA-Z0-9]/g, ''),
            postalCode: billing.postalCode.replace(/\D/g, ''),
            addressNumber: billing.addressNumber,
            phone: billing.phone.replace(/\D/g, ''),
          },
        });

        creditCardToken = tokenResult.creditCardToken;

        // Salvar últimos 4 dígitos e bandeira
        await supabase.from('subscriptions').update({
          card_last_four: tokenResult.creditCardNumber,
          card_brand: tokenResult.creditCardBrand,
        }).eq('id', subscription.id);
      }

      // 3. Criar assinatura no Asaas
      await callEdgeFunction('asaas-create-subscription', {
        organizationId: orgId,
        subscriptionId: subscription.id,
        billingType: selectedBillingType,
        creditCardToken: creditCardToken || undefined,
      });

      setSuccess(true);
      setProcessing(false);

      // Aguardar 2s para o usuário ver o sucesso, depois callback
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message && err.message !== 'Failed to fetch'
        ? err.message
        : 'Erro de conexão com o servidor. Verifique sua internet e tente novamente.');
      setProcessing(false);
    }
  }

  // ── Tela de Sucesso ────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="animate-fade-in">
        <div className="max-w-lg mx-auto text-center py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Assinatura ativada!</h2>
          <p className="text-slate-500">
            {billingType === 'CREDIT_CARD'
              ? 'Seu cartão será cobrado automaticamente a cada mês.'
              : billingType === 'PIX'
              ? 'Um QR Code PIX será gerado a cada cobrança mensal.'
              : 'Um boleto será gerado a cada cobrança mensal.'}
          </p>
        </div>
      </div>
    );
  }

  // ── Processing overlay ─────────────────────────────────────────────────

  if (processing) {
    return (
      <div className="animate-fade-in">
        <div className="max-w-lg mx-auto text-center py-12">
          <Loader2 size={48} className="text-primary-500 animate-spin mx-auto mb-6" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Processando pagamento...</h2>
          <p className="text-slate-500 text-sm">Aguarde enquanto configuramos sua assinatura</p>
        </div>
      </div>
    );
  }

  // ── Step 1: Dados de cobrança ──────────────────────────────────────────

  if (step === 1) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center mb-6">
          <button onClick={onCancel} className="flex items-center gap-2 text-slate-400 hover:text-slate-800 font-medium text-sm transition-colors cursor-pointer">
            <ArrowLeft size={18} /> Voltar
          </button>
        </div>

        <div className="max-w-lg">
          <h2 className="text-xl font-bold text-slate-800 mb-1">Dados de cobrança</h2>
          <p className="text-sm text-slate-500 mb-6">
            {subscription?.max_stores || 1} loja(s) × {formatPrice(subscription?.price_per_store || 0)}/mês = <span className="font-bold text-slate-700">{formatPrice((subscription?.max_stores || 1) * (subscription?.price_per_store || 0))}/mês</span>
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="checkout-name" className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome / Razão Social *</label>
              <input id="checkout-name" type="text" value={billing.name}
                onChange={e => setBilling({ ...billing, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors" />
            </div>

            <div>
              <label htmlFor="checkout-cpfcnpj" className="block text-xs font-bold text-slate-500 uppercase mb-1">CPF / CNPJ *</label>
              <input id="checkout-cpfcnpj" type="text" value={billing.cpfCnpj} maxLength={18}
                onChange={e => setBilling({ ...billing, cpfCnpj: formatCpfCnpj(e.target.value) })}
                placeholder="000.000.000-00 ou XX.XXX.XXX/XXXX-XX"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="checkout-email" className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                <input id="checkout-email" type="email" value={billing.email}
                  onChange={e => setBilling({ ...billing, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors" />
              </div>
              <div>
                <label htmlFor="checkout-phone" className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone *</label>
                <input id="checkout-phone" type="text" value={billing.phone} maxLength={15}
                  onChange={e => setBilling({ ...billing, phone: formatPhone(e.target.value) })}
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="checkout-cep" className="block text-xs font-bold text-slate-500 uppercase mb-1">CEP *</label>
                <input id="checkout-cep" type="text" value={billing.postalCode} maxLength={9}
                  onChange={e => setBilling({ ...billing, postalCode: formatCep(e.target.value) })}
                  placeholder="00000-000"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors" />
              </div>
              <div>
                <label htmlFor="checkout-address" className="block text-xs font-bold text-slate-500 uppercase mb-1">Endereço</label>
                <input id="checkout-address" type="text" value={billing.address}
                  onChange={e => setBilling({ ...billing, address: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors" />
              </div>
              <div>
                <label htmlFor="checkout-number" className="block text-xs font-bold text-slate-500 uppercase mb-1">Número *</label>
                <input id="checkout-number" type="text" value={billing.addressNumber}
                  onChange={e => setBilling({ ...billing, addressNumber: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors" />
              </div>
            </div>

            <div>
              <label htmlFor="checkout-province" className="block text-xs font-bold text-slate-500 uppercase mb-1">Bairro</label>
              <input id="checkout-province" type="text" value={billing.province}
                onChange={e => setBilling({ ...billing, province: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors" />
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium flex items-center gap-2">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <button onClick={handleNextStep1}
            className="mt-6 w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 active:scale-95 transition-all min-h-[48px] cursor-pointer">
            Continuar
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Forma de pagamento ─────────────────────────────────────────

  if (step === 2) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center mb-6">
          <button onClick={() => { setStep(1); setError(''); }} className="flex items-center gap-2 text-slate-400 hover:text-slate-800 font-medium text-sm transition-colors cursor-pointer">
            <ArrowLeft size={18} /> Voltar
          </button>
        </div>

        <div className="max-w-lg">
          <h2 className="text-xl font-bold text-slate-800 mb-1">Forma de pagamento</h2>
          <p className="text-sm text-slate-500 mb-6">Escolha como deseja pagar sua assinatura mensal</p>

          <div className="space-y-3">
            {BILLING_TYPES.map(bt => {
              const Icon = bt.icon;
              return (
                <button
                  key={bt.key}
                  onClick={() => handleSelectBillingType(bt.key)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-primary-500 hover:bg-primary-50/30 transition-all cursor-pointer text-left min-h-[64px]"
                >
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon size={24} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{bt.label}</p>
                    <p className="text-xs text-slate-500">{bt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium flex items-center gap-2">
              <AlertTriangle size={16} /> {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Step 3: Dados do cartão ────────────────────────────────────────────

  if (step === 3) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center mb-6">
          <button onClick={() => { setStep(2); setError(''); }} className="flex items-center gap-2 text-slate-400 hover:text-slate-800 font-medium text-sm transition-colors cursor-pointer">
            <ArrowLeft size={18} /> Voltar
          </button>
        </div>

        <div className="max-w-lg">
          <h2 className="text-xl font-bold text-slate-800 mb-1">Dados do cartão</h2>
          <p className="text-sm text-slate-500 mb-6">Seus dados são enviados de forma segura e nunca armazenados</p>

          <div className="space-y-4">
            <div>
              <label htmlFor="card-holder" className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome no cartão *</label>
              <input id="card-holder" type="text" value={card.holderName}
                onChange={e => setCard({ ...card, holderName: e.target.value.toUpperCase() })}
                placeholder="Como impresso no cartão"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors uppercase" />
            </div>

            <div>
              <label htmlFor="card-number" className="block text-xs font-bold text-slate-500 uppercase mb-1">Número do cartão *</label>
              <input id="card-number" type="text" value={card.number} maxLength={19}
                onChange={e => setCard({ ...card, number: formatCardNumber(e.target.value) })}
                placeholder="0000 0000 0000 0000"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
                inputMode="numeric" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="card-month" className="block text-xs font-bold text-slate-500 uppercase mb-1">Mês *</label>
                <input id="card-month" type="text" value={card.expiryMonth} maxLength={2}
                  onChange={e => setCard({ ...card, expiryMonth: e.target.value.replace(/\D/g, '') })}
                  placeholder="MM"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors text-center"
                  inputMode="numeric" />
              </div>
              <div>
                <label htmlFor="card-year" className="block text-xs font-bold text-slate-500 uppercase mb-1">Ano *</label>
                <input id="card-year" type="text" value={card.expiryYear} maxLength={2}
                  onChange={e => setCard({ ...card, expiryYear: e.target.value.replace(/\D/g, '') })}
                  placeholder="AA"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors text-center"
                  inputMode="numeric" />
              </div>
              <div>
                <label htmlFor="card-ccv" className="block text-xs font-bold text-slate-500 uppercase mb-1">CVV *</label>
                <input id="card-ccv" type="text" value={card.ccv} maxLength={4}
                  onChange={e => setCard({ ...card, ccv: e.target.value.replace(/\D/g, '') })}
                  placeholder="000"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors text-center"
                  inputMode="numeric" />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium flex items-center gap-2">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <div className="mt-6 bg-slate-50 rounded-xl p-4 text-sm text-slate-500">
            <p className="font-bold text-slate-700 mb-1">Resumo</p>
            <p>{subscription?.max_stores || 1} loja(s) × {formatPrice(subscription?.price_per_store || 0)} = <span className="font-bold text-slate-800">{formatPrice((subscription?.max_stores || 1) * (subscription?.price_per_store || 0))}/mês</span></p>
          </div>

          <button onClick={handleNextStep3}
            className="mt-4 w-full bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 active:scale-95 transition-all min-h-[48px] cursor-pointer">
            Ativar Assinatura
          </button>
        </div>
      </div>
    );
  }

  return null;
}
