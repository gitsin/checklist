/**
 * KioskShell — Tela de seleção de colaborador para dispositivos disp_compartilhado.
 * O tablet já está autenticado via Supabase Auth. Aqui o colaborador se identifica
 * pelo nome (ou futuramente por PIN) para acessar suas tarefas.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { User, LogOut, Store, KeyRound, Delete } from 'lucide-react';
import KioskArea from './KioskArea';

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
];

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0][0].toUpperCase();
}

export default function KioskShell() {
  const navigate = useNavigate();
  const { userProfile, storeId, signOut } = useAuth();

  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeUser, setActiveUser] = useState(null); // colaborador selecionado

  // PIN flow
  const [pinUser, setPinUser] = useState(null);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState(false);

  const storeName = userProfile?.store?.shortName || userProfile?.store?.name || 'Loja';

  useEffect(() => {
    if (storeId) loadColaboradores();
  }, [storeId]);

  async function loadColaboradores() {
    setLoading(true);
    const { data } = await supabase
      .from('user_profiles')
      .select('id, full_name, role_id, store_id, organization_id, pin_code, role:roles(name)')
      .eq('store_id', storeId)
      .in('user_type', ['colaborador', 'store_manager'])
      .eq('active', true)
      .order('full_name');
    setColaboradores(data || []);
    setLoading(false);
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  function handleColabSelect(colab) {
    if (colab.pin_code) {
      setPinUser(colab);
      setPinValue('');
      setPinError(false);
    } else {
      setActiveUser(colab);
    }
  }

  function handlePinDigit(digit) {
    if (pinValue.length >= 4) return;
    const next = pinValue + digit;
    setPinValue(next);
    setPinError(false);
    if (next.length === 4) {
      if (next === pinUser.pin_code) {
        setActiveUser(pinUser);
        setPinUser(null);
      } else {
        setPinError(true);
        setTimeout(() => setPinValue(''), 600);
      }
    }
  }

  function handlePinBackspace() {
    setPinValue(v => v.slice(0, -1));
    setPinError(false);
  }

  // Colaborador selecionado → monta o user no formato que KioskArea espera
  if (activeUser) {
    const kioskUser = {
      ...activeUser,
      store_name: storeName,
      role_name: activeUser.role?.name,
    };
    return (
      <KioskArea
        user={kioskUser}
        onLogout={() => setActiveUser(null)} // volta para a seleção
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-slate-200 px-4 py-2 sticky top-0 z-50 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store size={16} className="text-primary-500" />
            <span className="font-bold text-slate-700 text-sm">{storeName}</span>
          </div>
          {pinUser ? (
            <button
              onClick={() => { setPinUser(null); setPinValue(''); setPinError(false); }}
              className="text-slate-400 hover:text-slate-600 text-xs font-medium px-3 py-1.5 rounded hover:bg-slate-100 transition-colors cursor-pointer min-h-[44px]"
            >
              Voltar
            </button>
          ) : (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1 text-slate-400 hover:text-red-500 text-xs font-medium px-2 py-1.5 rounded hover:bg-red-50 transition-colors cursor-pointer min-h-[44px]"
            >
              <LogOut size={14} /> Sair
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-xl mx-auto px-4 py-8">

        {/* ── TELA PIN ── */}
        {pinUser ? (
          <div className="flex flex-col items-center animate-fade-in">
            <div className="text-center mb-8">
              <div className={`w-16 h-16 rounded-full ${AVATAR_COLORS[colaboradores.indexOf(pinUser) % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-xl mx-auto mb-3 shadow-lg`}>
                {getInitials(pinUser.full_name)}
              </div>
              <p className="font-bold text-slate-800 text-lg">{pinUser.full_name}</p>
              <p className="text-slate-400 text-sm mt-1 flex items-center gap-1 justify-center">
                <KeyRound size={14} /> Digite seu PIN
              </p>
            </div>

            {/* Indicadores de dígitos */}
            <div className="flex gap-4 mb-8">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all duration-150 ${
                  pinError ? 'border-red-400 bg-red-400' :
                  i < pinValue.length ? 'border-primary-500 bg-primary-500' : 'border-slate-300 bg-transparent'
                }`} />
              ))}
            </div>
            {pinError && <p className="text-red-500 text-sm font-medium mb-4">PIN incorreto, tente novamente</p>}

            {/* Teclado numérico */}
            <div className="grid grid-cols-3 gap-3 w-64">
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, idx) => {
                if (key === '') return <div key={idx} />;
                if (key === '⌫') return (
                  <button key={idx} onClick={handlePinBackspace}
                    className="h-14 rounded-2xl bg-slate-200 text-slate-700 font-bold text-lg flex items-center justify-center active:scale-95 transition-all hover:bg-slate-300 cursor-pointer">
                    <Delete size={20} />
                  </button>
                );
                return (
                  <button key={idx} onClick={() => handlePinDigit(key)}
                    className="h-14 rounded-2xl bg-white shadow-md text-slate-800 font-bold text-xl active:scale-95 transition-all hover:bg-slate-50 border border-slate-100 cursor-pointer">
                    {key}
                  </button>
                );
              })}
            </div>
          </div>

        ) : (
          <>
            <div className="text-center mb-8 animate-fade-in">
              <h1 className="text-3xl font-black text-slate-800 mb-1">Niilu</h1>
              <p className="text-slate-400 text-sm font-medium">Quem é você?</p>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : colaboradores.length === 0 ? (
              <div className="text-center text-slate-500 py-16">
                <User size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="font-medium">Nenhum colaborador ativo nesta loja</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                {colaboradores.map((colab, idx) => (
                  <button
                    key={colab.id}
                    onClick={() => handleColabSelect(colab)}
                    className="bg-white/95 backdrop-blur rounded-2xl p-4 text-left flex items-center gap-3 min-h-[64px] shadow-md hover:shadow-xl hover:border-primary-400 active:scale-95 transition-all border border-slate-200/50 cursor-pointer animate-slide-up"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className={`${AVATAR_COLORS[idx % AVATAR_COLORS.length]} w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
                      {getInitials(colab.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 text-sm leading-tight truncate">{colab.full_name}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                        {colab.role?.name || 'Colaborador'}
                      </div>
                    </div>
                    {colab.pin_code && <KeyRound size={14} className="text-violet-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
