import { useState, useRef, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import {
    ArrowLeft, Store, Users, Type, CalendarClock, Clock,
    Camera, CameraOff, ChevronRight, Sparkles, CheckCircle2,
    MessageCircle, FileText, CalendarDays, CalendarRange
} from "lucide-react";

// Nomes dos dias da semana
const DIAS_SEMANA = [
    { value: 1, label: "Segunda", short: "Seg" },
    { value: 2, label: "Terça", short: "Ter" },
    { value: 3, label: "Quarta", short: "Qua" },
    { value: 4, label: "Quinta", short: "Qui" },
    { value: 5, label: "Sexta", short: "Sex" },
    { value: 6, label: "Sábado", short: "Sáb" },
    { value: 7, label: "Domingo", short: "Dom" },
];

export default function TaskWizard({ lojas, roles, onClose, onSaved }) {
    // --- STATE ---
    const [step, setStep] = useState(0);
    const [animDir, setAnimDir] = useState("forward"); // "forward" | "back"

    // Wizard data
    const [loja, setLoja] = useState(null);        // { id, name }
    const [cargo, setCargo] = useState(null);       // { id, name }
    const [titulo, setTitulo] = useState("");
    const [frequencia, setFrequencia] = useState(null); // "daily" | "weekly" | "monthly"
    const [hora, setHora] = useState("");
    const [diaSemana, setDiaSemana] = useState(null);
    const [diaMes, setDiaMes] = useState(null);
    const [instrucoes, setInstrucoes] = useState("");
    const [exigeFoto, setExigeFoto] = useState(null); // true | false

    // Aux
    const [cargosLoja, setCargosLoja] = useState([]);
    const [salvando, setSalvando] = useState(false);
    const tituloRef = useRef(null);
    const instrucoesRef = useRef(null);

    // Carrega cargos quando seleciona loja
    async function carregarCargos(lojaId) {
        const { data: emps } = await supabase
            .from("employee")
            .select("role_id")
            .eq("store_id", lojaId)
            .eq("active", true);
        const rIds = [...new Set(emps?.map(e => e.role_id) || [])];
        const filtered = roles.filter(r => rIds.includes(r.id) && r.active);
        setCargosLoja(filtered);
    }

    // Focus no input de texto quando entra no step
    useEffect(() => {
        if (step === 2) setTimeout(() => tituloRef.current?.focus(), 300);
        if (step === 5) setTimeout(() => instrucoesRef.current?.focus(), 300);
    }, [step]);

    // --- NAVEGAÇÃO ---
    function goNext() {
        setAnimDir("forward");
        setStep(prev => prev + 1);
    }

    function goBack() {
        if (step === 0) { onClose(); return; }
        setAnimDir("back");
        setStep(prev => prev - 1);
    }

    // --- SELEÇÕES COM AUTO-AVANÇO ---
    function selectLoja(l) {
        setLoja(l);
        carregarCargos(l.id);
        setCargo(null); // Reset cargo ao trocar loja
        setAnimDir("forward");
        setStep(1);
    }

    function selectCargo(r) {
        setCargo(r);
        setAnimDir("forward");
        setStep(2);
    }

    function selectFrequencia(f) {
        setFrequencia(f);
        // Reset campos condicionais
        setHora(""); setDiaSemana(null); setDiaMes(null);
        setAnimDir("forward");
        setStep(4);
    }

    function selectDiaSemana(d) {
        setDiaSemana(d);
        setAnimDir("forward");
        setStep(5);
    }

    function selectDiaMes(d) {
        setDiaMes(d);
        setAnimDir("forward");
        setStep(5);
    }

    function selectFoto(val) {
        setExigeFoto(val);
        setAnimDir("forward");
        setStep(7); // Vai direto pro resumo
    }

    // --- SALVAR ---
    async function salvar() {
        setSalvando(true);
        const { error } = await supabase.from("task_templates").insert({
            title: titulo.trim(),
            description: instrucoes.trim() || null,
            frequency_type: frequencia,
            store_id: loja.id,
            role_id: cargo.id,
            due_time: frequencia === "daily" ? (hora || null) : null,
            requires_photo_evidence: exigeFoto,
            specific_day_of_week: frequencia === "weekly" ? diaSemana : null,
            specific_day_of_month: frequencia === "monthly" ? diaMes : null,
            notify_whatsapp: false,
            active: true,
        });
        setSalvando(false);

        if (error) {
            alert("Erro ao salvar: " + error.message);
        } else {
            // Monta resumo e chama callback
            const freqMap = { daily: "Diária", weekly: "Semanal", monthly: "Mensal" };
            const diaMap = { 1: "Segunda", 2: "Terça", 3: "Quarta", 4: "Quinta", 5: "Sexta", 6: "Sábado", 7: "Domingo" };
            onSaved({
                titulo: titulo.trim(),
                descricao: instrucoes.trim(),
                frequencia: freqMap[frequencia],
                loja: loja.name,
                cargo: cargo.name,
                horario: frequencia === "daily" ? hora : null,
                foto: exigeFoto,
                whatsapp: false,
                diaSemana: frequencia === "weekly" ? diaMap[diaSemana] : null,
                diaMes: frequencia === "monthly" ? diaMes : null,
            });
        }
    }

    // --- PROGRESS BAR ---
    const totalSteps = 8; // 0..7
    const progress = ((step + 1) / totalSteps) * 100;

    // --- HELPERS VISUAIS ---
    const freqMap = { daily: "Diária", weekly: "Semanal", monthly: "Mensal" };
    const diaMap = { 1: "Segunda", 2: "Terça", 3: "Quarta", 4: "Quinta", 5: "Sexta", 6: "Sábado", 7: "Domingo" };

    // --- RENDER ---
    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
            <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">

                {/* HEADER */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center gap-3 shrink-0">
                    <button
                        onClick={goBack}
                        className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-sm truncate flex items-center gap-1.5">
                            <Sparkles size={14} /> Assistente de Criação
                        </h3>
                        <p className="text-white/60 text-[10px] font-medium">
                            Passo {step + 1} de {totalSteps}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/60 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors min-h-[44px] flex items-center"
                    >
                        Fechar
                    </button>
                </div>

                {/* PROGRESS BAR */}
                <div className="h-1 bg-purple-100 shrink-0">
                    <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* CONTENT — scrollable */}
                <div className="flex-1 overflow-y-auto p-5">
                    <div
                        key={step}
                        className={`animate-${animDir === "forward" ? "slide-in" : "slide-back"}`}
                        style={{
                            animation: animDir === "forward"
                                ? "slideIn 0.25s ease-out"
                                : "slideBack 0.25s ease-out"
                        }}
                    >

                        {/* ================================================ */}
                        {/* STEP 0: LOJA */}
                        {/* ================================================ */}
                        {step === 0 && (
                            <div>
                                <p className="text-[11px] uppercase font-bold text-purple-500 tracking-wide mb-1">Passo 1</p>
                                <h2 className="text-xl font-black text-slate-800 mb-1">Para qual loja?</h2>
                                <p className="text-sm text-slate-400 mb-5">Selecione a loja que receberá esta tarefa.</p>
                                <div className="grid grid-cols-1 gap-2.5">
                                    {lojas.filter(l => l.active).map(l => (
                                        <button
                                            key={l.id}
                                            onClick={() => selectLoja(l)}
                                            className={`flex items-center gap-3.5 p-4 rounded-xl border-2 transition-all active:scale-[0.98] text-left min-h-[56px] ${loja?.id === l.id
                                                    ? "border-purple-500 bg-purple-50 shadow-md"
                                                    : "border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/30"
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${loja?.id === l.id ? "bg-purple-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                                                <Store size={20} />
                                            </div>
                                            <span className="font-bold text-slate-700">{l.name}</span>
                                            {loja?.id === l.id && (
                                                <CheckCircle2 size={20} className="ml-auto text-purple-500 shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ================================================ */}
                        {/* STEP 1: CARGO */}
                        {/* ================================================ */}
                        {step === 1 && (
                            <div>
                                <p className="text-[11px] uppercase font-bold text-purple-500 tracking-wide mb-1">Passo 2</p>
                                <h2 className="text-xl font-black text-slate-800 mb-1">Qual cargo será responsável?</h2>
                                <p className="text-sm text-slate-400 mb-5">
                                    Cargos ativos em <span className="font-bold text-slate-600">{loja?.name}</span>
                                </p>
                                {cargosLoja.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <Users size={32} className="mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">Nenhum cargo encontrado nesta loja.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2.5">
                                        {cargosLoja.map(r => (
                                            <button
                                                key={r.id}
                                                onClick={() => selectCargo(r)}
                                                className={`flex items-center gap-3.5 p-4 rounded-xl border-2 transition-all active:scale-[0.98] text-left min-h-[56px] ${cargo?.id === r.id
                                                        ? "border-purple-500 bg-purple-50 shadow-md"
                                                        : "border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/30"
                                                    }`}
                                            >
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${cargo?.id === r.id ? "bg-purple-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                                                    <Users size={20} />
                                                </div>
                                                <span className="font-bold text-slate-700">{r.name}</span>
                                                {cargo?.id === r.id && (
                                                    <CheckCircle2 size={20} className="ml-auto text-purple-500 shrink-0" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ================================================ */}
                        {/* STEP 2: TÍTULO */}
                        {/* ================================================ */}
                        {step === 2 && (
                            <div>
                                <p className="text-[11px] uppercase font-bold text-purple-500 tracking-wide mb-1">Passo 3</p>
                                <h2 className="text-xl font-black text-slate-800 mb-1">Qual o nome da tarefa?</h2>
                                <p className="text-sm text-slate-400 mb-5">Dê um nome claro e curto. Ex: "Limpar bancadas", "Fechar caixa".</p>
                                <input
                                    ref={tituloRef}
                                    type="text"
                                    value={titulo}
                                    onChange={e => setTitulo(e.target.value)}
                                    placeholder="Nome da tarefa..."
                                    className="w-full border-2 border-slate-200 rounded-xl p-4 text-lg font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                                    maxLength={100}
                                    onKeyDown={e => { if (e.key === "Enter" && titulo.trim()) goNext(); }}
                                />
                                <p className="text-right text-[10px] text-slate-300 mt-1">{titulo.length}/100</p>

                                <button
                                    onClick={goNext}
                                    disabled={!titulo.trim()}
                                    className={`w-full mt-4 py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all min-h-[48px] active:scale-[0.98] ${titulo.trim()
                                            ? "bg-purple-600 hover:bg-purple-700 shadow-md"
                                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                        }`}
                                >
                                    Próximo <ChevronRight size={18} />
                                </button>
                            </div>
                        )}

                        {/* ================================================ */}
                        {/* STEP 3: FREQUÊNCIA */}
                        {/* ================================================ */}
                        {step === 3 && (
                            <div>
                                <p className="text-[11px] uppercase font-bold text-purple-500 tracking-wide mb-1">Passo 4</p>
                                <h2 className="text-xl font-black text-slate-800 mb-1">Com que frequência?</h2>
                                <p className="text-sm text-slate-400 mb-5">Esta tarefa será repetida automaticamente.</p>

                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { key: "daily", label: "Diária", desc: "Todos os dias", icon: <Clock size={22} />, color: "blue" },
                                        { key: "weekly", label: "Semanal", desc: "Uma vez por semana", icon: <CalendarDays size={22} />, color: "orange" },
                                        { key: "monthly", label: "Mensal", desc: "Uma vez por mês", icon: <CalendarRange size={22} />, color: "pink" },
                                    ].map(f => (
                                        <button
                                            key={f.key}
                                            onClick={() => selectFrequencia(f.key)}
                                            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all active:scale-[0.98] text-left min-h-[64px] ${frequencia === f.key
                                                    ? `border-${f.color}-500 bg-${f.color}-50 shadow-md`
                                                    : "border-slate-200 bg-white hover:border-slate-300"
                                                }`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${frequencia === f.key
                                                    ? `bg-${f.color}-500 text-white`
                                                    : `bg-${f.color}-100 text-${f.color}-500`
                                                }`}>
                                                {f.icon}
                                            </div>
                                            <div>
                                                <span className="font-bold text-slate-800 block">{f.label}</span>
                                                <span className="text-xs text-slate-400">{f.desc}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ================================================ */}
                        {/* STEP 4: CONDICIONAL (hora / dia semana / dia mês) */}
                        {/* ================================================ */}
                        {step === 4 && (
                            <div>
                                <p className="text-[11px] uppercase font-bold text-purple-500 tracking-wide mb-1">Passo 5</p>

                                {/* DIÁRIA → Horário */}
                                {frequencia === "daily" && (
                                    <>
                                        <h2 className="text-xl font-black text-slate-800 mb-1">Até que horas?</h2>
                                        <p className="text-sm text-slate-400 mb-5">Horário limite para conclusão da tarefa.</p>
                                        <div className="flex justify-center mb-6">
                                            <input
                                                type="time"
                                                value={hora}
                                                onChange={e => setHora(e.target.value)}
                                                className="text-4xl font-black text-center text-slate-800 border-2 border-slate-200 rounded-xl p-4 w-48 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                                            />
                                        </div>
                                        <button
                                            onClick={goNext}
                                            disabled={!hora}
                                            className={`w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all min-h-[48px] active:scale-[0.98] ${hora
                                                    ? "bg-purple-600 hover:bg-purple-700 shadow-md"
                                                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                                }`}
                                        >
                                            Próximo <ChevronRight size={18} />
                                        </button>
                                    </>
                                )}

                                {/* SEMANAL → Dia da semana */}
                                {frequencia === "weekly" && (
                                    <>
                                        <h2 className="text-xl font-black text-slate-800 mb-1">Em qual dia da semana?</h2>
                                        <p className="text-sm text-slate-400 mb-5">Selecione o dia em que a tarefa deve ser executada.</p>
                                        <div className="grid grid-cols-1 gap-2">
                                            {DIAS_SEMANA.map(d => (
                                                <button
                                                    key={d.value}
                                                    onClick={() => selectDiaSemana(d.value)}
                                                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all active:scale-[0.98] min-h-[48px] ${diaSemana === d.value
                                                            ? "border-orange-500 bg-orange-50 shadow-md"
                                                            : "border-slate-200 bg-white hover:border-orange-300"
                                                        }`}
                                                >
                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${diaSemana === d.value ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-500"}`}>
                                                        {d.short}
                                                    </div>
                                                    <span className="font-bold text-slate-700">{d.label}</span>
                                                    {diaSemana === d.value && (
                                                        <CheckCircle2 size={18} className="ml-auto text-orange-500" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* MENSAL → Dia do mês */}
                                {frequencia === "monthly" && (
                                    <>
                                        <h2 className="text-xl font-black text-slate-800 mb-1">Em qual dia do mês?</h2>
                                        <p className="text-sm text-slate-400 mb-5">Selecione o dia (1–31) do mês.</p>
                                        <div className="grid grid-cols-7 gap-1.5">
                                            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                                <button
                                                    key={d}
                                                    onClick={() => selectDiaMes(d)}
                                                    className={`aspect-square rounded-lg font-bold text-sm flex items-center justify-center transition-all active:scale-90 min-h-[40px] ${diaMes === d
                                                            ? "bg-pink-500 text-white shadow-md ring-2 ring-pink-300"
                                                            : "bg-slate-100 text-slate-600 hover:bg-pink-100 hover:text-pink-700"
                                                        }`}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ================================================ */}
                        {/* STEP 5: INSTRUÇÕES (opcional) */}
                        {/* ================================================ */}
                        {step === 5 && (
                            <div>
                                <p className="text-[11px] uppercase font-bold text-purple-500 tracking-wide mb-1">Passo 6</p>
                                <h2 className="text-xl font-black text-slate-800 mb-1">Alguma instrução?</h2>
                                <p className="text-sm text-slate-400 mb-4">
                                    Descreva o que deve ser feito. <span className="text-slate-300">(opcional)</span>
                                </p>
                                <textarea
                                    ref={instrucoesRef}
                                    value={instrucoes}
                                    onChange={e => setInstrucoes(e.target.value)}
                                    placeholder="Ex: Usar produto X na bancada, verificar validade dos itens..."
                                    className="w-full border-2 border-slate-200 rounded-xl p-4 text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all resize-none h-32"
                                    maxLength={500}
                                />
                                <p className="text-right text-[10px] text-slate-300 mt-1">{instrucoes.length}/500</p>

                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={goNext}
                                        className="flex-1 py-3.5 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all min-h-[48px]"
                                    >
                                        Pular
                                    </button>
                                    <button
                                        onClick={goNext}
                                        className="flex-1 py-3.5 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md flex items-center justify-center gap-2 transition-all min-h-[48px] active:scale-[0.98]"
                                    >
                                        Próximo <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ================================================ */}
                        {/* STEP 6: FOTO OBRIGATÓRIA */}
                        {/* ================================================ */}
                        {step === 6 && (
                            <div>
                                <p className="text-[11px] uppercase font-bold text-purple-500 tracking-wide mb-1">Passo 7</p>
                                <h2 className="text-xl font-black text-slate-800 mb-1">Exige foto como prova?</h2>
                                <p className="text-sm text-slate-400 mb-5">O funcionário precisará tirar uma foto ao concluir.</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => selectFoto(true)}
                                        className={`flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all active:scale-[0.96] min-h-[120px] ${exigeFoto === true
                                                ? "border-green-500 bg-green-50 shadow-md"
                                                : "border-slate-200 bg-white hover:border-green-300"
                                            }`}
                                    >
                                        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${exigeFoto === true ? "bg-green-500 text-white" : "bg-green-100 text-green-500"}`}>
                                            <Camera size={26} />
                                        </div>
                                        <span className="font-bold text-slate-700">Sim, exige</span>
                                    </button>
                                    <button
                                        onClick={() => selectFoto(false)}
                                        className={`flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all active:scale-[0.96] min-h-[120px] ${exigeFoto === false
                                                ? "border-slate-500 bg-slate-50 shadow-md"
                                                : "border-slate-200 bg-white hover:border-slate-300"
                                            }`}
                                    >
                                        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${exigeFoto === false ? "bg-slate-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                                            <CameraOff size={26} />
                                        </div>
                                        <span className="font-bold text-slate-700">Não precisa</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ================================================ */}
                        {/* STEP 7: RESUMO + SALVAR */}
                        {/* ================================================ */}
                        {step === 7 && (
                            <div>
                                <p className="text-[11px] uppercase font-bold text-purple-500 tracking-wide mb-1">Último passo</p>
                                <h2 className="text-xl font-black text-slate-800 mb-1">Tudo certo! Confira o resumo.</h2>
                                <p className="text-sm text-slate-400 mb-5">Revise os dados e clique em "Criar Tarefa".</p>

                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                                    {/* Título */}
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Título</span>
                                        <p className="font-bold text-slate-800 text-lg">{titulo}</p>
                                    </div>

                                    {/* Instruções */}
                                    {instrucoes.trim() && (
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Instruções</span>
                                            <p className="text-sm text-slate-600">{instrucoes}</p>
                                        </div>
                                    )}

                                    {/* Loja + Cargo */}
                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Loja</span>
                                            <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                                <Store size={14} className="text-purple-500" /> {loja?.name}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Cargo</span>
                                            <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                                <Users size={14} className="text-purple-500" /> {cargo?.name}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase border ${frequencia === "daily" ? "bg-blue-100 text-blue-800 border-blue-200"
                                                : frequencia === "weekly" ? "bg-orange-100 text-orange-800 border-orange-200"
                                                    : "bg-pink-100 text-pink-800 border-pink-200"
                                            }`}>
                                            {freqMap[frequencia]}
                                        </span>

                                        {frequencia === "daily" && hora && (
                                            <span className="bg-slate-200 text-slate-700 text-[10px] px-2.5 py-1 rounded-full font-bold border border-slate-300">
                                                ⏰ Até {hora}
                                            </span>
                                        )}
                                        {frequencia === "weekly" && diaSemana && (
                                            <span className="bg-orange-100 text-orange-800 text-[10px] px-2.5 py-1 rounded-full font-bold border border-orange-200">
                                                {diaMap[diaSemana]}
                                            </span>
                                        )}
                                        {frequencia === "monthly" && diaMes && (
                                            <span className="bg-pink-100 text-pink-800 text-[10px] px-2.5 py-1 rounded-full font-bold border border-pink-200">
                                                Dia {diaMes}
                                            </span>
                                        )}
                                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase border ${exigeFoto
                                                ? "bg-purple-100 text-purple-800 border-purple-200"
                                                : "bg-slate-100 text-slate-500 border-slate-200"
                                            }`}>
                                            {exigeFoto ? "📷 Exige Foto" : "Sem foto"}
                                        </span>
                                    </div>
                                </div>

                                {/* Botão Salvar */}
                                <button
                                    onClick={salvar}
                                    disabled={salvando}
                                    className="w-full mt-5 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg flex items-center justify-center gap-2 text-base transition-all active:scale-[0.98] min-h-[52px]"
                                >
                                    {salvando ? (
                                        <>Salvando...</>
                                    ) : (
                                        <><CheckCircle2 size={20} /> Criar Tarefa</>
                                    )}
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Animations */}
            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(40px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes slideBack {
                    from { opacity: 0; transform: translateX(-40px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}
