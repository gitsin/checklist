import { useState } from "react";
import { formatPrice } from "../../utils/formatPrice";
import { X, Plus } from "lucide-react";

function getDaysRemaining(periodEnd) {
  if (!periodEnd) return 0;
  const now = new Date();
  const end = new Date(periodEnd);
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
}

export default function StoreLimitUpgradeModal({ upgradeInfo, saving, onConfirm, onClose }) {
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");

  const price = upgradeInfo.pricePerStore;
  const daysLeft = getDaysRemaining(upgradeInfo.periodEnd);
  const parsedQty = parseInt(qty) || 0;
  const proRata = parsedQty * price * (daysLeft / 30);
  const newTotal = upgradeInfo.currentMaxStores + (parsedQty > 0 ? parsedQty : 0);
  const nextCycleTotal = newTotal * price;

  async function handleConfirm() {
    const q = parseInt(qty);
    if (!q || q < 1) {
      setError("Mínimo de 1 loja adicional");
      return;
    }
    setError("");
    const success = await onConfirm(q);
    if (!success) {
      setError("Um erro ocorreu, por favor tente novamente");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-slate-800">Adicionar Lojas</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-5">
          Seu plano atual: <span className="font-bold text-slate-700">{upgradeInfo.storeCount}/{upgradeInfo.maxStores}</span> lojas.
          Adicione mais lojas para continuar crescendo.
        </p>

        <div className="mb-4">
          <label htmlFor="upgrade-qty" className="block text-xs font-bold text-slate-500 uppercase mb-2">Quantas lojas adicionar?</label>
          <input
            id="upgrade-qty"
            type="number"
            min="1"
            value={qty}
            onChange={e => setQty(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:outline-none text-slate-800 transition-colors"
          />
        </div>

        {parsedQty > 0 && (
          <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
            <p className="text-slate-600">
              {parsedQty} {parsedQty === 1 ? "loja adicional" : "lojas adicionais"} × {formatPrice(price)} × ({daysLeft} dias restantes / 30)
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

        {error && <p className="text-red-500 text-xs font-bold mb-4 text-center">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 active:scale-95 transition-all min-h-[48px] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 bg-primary-500 text-white font-bold py-3 rounded-xl hover:bg-primary-600 active:scale-95 transition-all min-h-[48px] disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Salvando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
