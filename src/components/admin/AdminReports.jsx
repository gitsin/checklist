import { useState } from "react";
import { supabase } from "../../supabaseClient";
import { getEffectiveDueTime } from "../../utils/scheduleOverrides";
import {
    ArrowLeft, Search, CheckCircle, Clock,
    Hourglass, BarChart3, Users, AlertCircle, TrendingUp, Calendar,
    Filter, Layers, ChevronDown, ChevronRight, CalendarClock, AlertTriangle
} from "lucide-react";

function getLocalDate() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split("T")[0];
}

function getNowTime() {
    return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Helper: tarefa concluída = COMPLETED ou APPROVED
const isDone = (status) => status === 'COMPLETED' || status === 'APPROVED';

// ========================================================
// SUB-COMPONENTES
// ========================================================

function SummaryCard({ icon, label, value, color, border, iconBg = "bg-slate-100", iconColor = "text-slate-600", textColor = "text-slate-800" }) {
    return (
        <div className={`${color} ${border} border p-3 sm:p-4 rounded-xl text-center transition-all hover:shadow-md duration-200 shadow-sm`}>
            <div className="flex justify-center mb-2">
                <div className={`${iconBg} ${iconColor} p-1.5 rounded-lg`}>{icon}</div>
            </div>
            <div className={`text-xl sm:text-2xl font-black ${textColor}`}>{value}</div>
            <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-500 mt-1">{label}</div>
        </div>
    );
}

function CollapsibleSection({ icon, title, count, color, badge, children, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors"
            >
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    {icon} {title}
                    {count > 0 && (
                        <span className={`${badge} text-xs font-black px-2.5 py-0.5 rounded-full ml-1`}>{count}</span>
                    )}
                </h3>
                {open ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
            </button>
            {open && <div className="px-5 pb-5">{children}</div>}
        </div>
    );
}

function TaskRow({ task }) {
    return (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border transition-colors ${
            task.isLate ? "bg-red-50 border-red-200"
            : task.isReturned ? "bg-orange-50 border-orange-200"
            : task.isWaiting ? "bg-amber-50 border-amber-200"
            : "bg-slate-50 border-slate-200"
        }`}>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm truncate">{task.title}</span>
                    {task.isLate && <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase whitespace-nowrap">Atrasada</span>}
                    {task.isReturned && <span className="bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase whitespace-nowrap">Devolvida</span>}
                </div>
                <span className="text-[10px] text-slate-500">
                    {task.role} · {task.date}
                    {task.completedBy && ` · Enviada por: ${task.completedBy}`}
                </span>
            </div>
            {task.due && (
                <span className={`text-sm font-bold whitespace-nowrap ml-3 flex items-center gap-1 ${task.isLate ? "text-red-500" : "text-slate-500"}`}>
                    <Clock size={12} /> {task.due}
                </span>
            )}
        </div>
    );
}

// ========================================================
// COMPONENTE PRINCIPAL
// ========================================================
export default function AdminReports({ goBack, lojas }) {
    const hoje = getLocalDate();

    // --- FILTROS ---
    const [lojaId, setLojaId] = useState("");
    const [dataInicio, setDataInicio] = useState(hoje);
    const [dataFim, setDataFim] = useState(hoje);

    // --- DADOS ---
    const [loading, setLoading] = useState(false);
    const [counts, setCounts] = useState(null);
    const [byRole, setByRole] = useState([]);
    const [byRoutine, setByRoutine] = useState([]);
    const [programadas, setProgramadas] = useState([]);
    const [atrasadas, setAtrasadas] = useState([]);
    const [emRevisao, setEmRevisao] = useState([]);
    const [dailyTrend, setDailyTrend] = useState([]);

    // ========================================================
    // BUSCA PRINCIPAL
    // ========================================================
    async function buscarDashboard() {
        if (!lojaId) return alert("Selecione uma loja.");
        if (!dataInicio || !dataFim) return alert("Informe o período.");

        setLoading(true);

        const selectFields = `*, template:task_templates!inner(title, description, due_time, role_id, role:roles(name))`;

        function baseQ() {
            let q = supabase.from("checklist_items").select(selectFields);
            if (lojaId !== 'all') q = q.eq("store_id", lojaId);
            return q;
        }

        // 1+2. Tarefas do período + atrasadas (em paralelo)
        const queries = [
            baseQ().gte("scheduled_date", dataInicio).lte("scheduled_date", dataFim),
        ];
        if (dataFim >= hoje) {
            queries.push(
                baseQ().lt("scheduled_date", dataInicio)
                    .or(`status.in.(PENDING,RETURNED,WAITING_APPROVAL),completed_at.gte.${hoje}T00:00:00`)
            );
        }

        // 4. Rotinas (independente — pode rodar em paralelo)
        let routineQuery = supabase
            .from('routine_templates')
            .select('id, title, routine_items(task_template_id)');
        if (lojaId !== 'all') routineQuery = routineQuery.eq('store_id', lojaId);

        const [rangeResult, extraResult, routineResult] = await Promise.all([
            queries[0],
            queries[1] || Promise.resolve({ data: [] }),
            routineQuery,
        ]);

        // Mescla e deduplica por id
        const allItems = [...(rangeResult.data || []), ...(extraResult.data || [])];
        const uniqueById = [...new Map(allItems.map(i => [i.id, i])).values()];

        // Deduplica por template_id (mesma lógica do kiosk)
        const seen = new Map();
        uniqueById.forEach(item => {
            const key = item.template_id || `raw-${item.id}`;
            if (!seen.has(key)) {
                seen.set(key, item);
            } else {
                const existing = seen.get(key);
                if (item.scheduled_date >= dataInicio && existing.scheduled_date < dataInicio) {
                    seen.set(key, item);
                } else if (item.scheduled_date > existing.scheduled_date) {
                    seen.set(key, item);
                }
            }
        });
        const items = Array.from(seen.values());

        // 3. Busca nomes dos colaboradores (depende dos items)
        const profileIds = [...new Set(items.map(i => i.completed_by).filter(Boolean))];
        let profilesData = [];
        if (profileIds.length > 0) {
            const { data: pd } = await supabase
                .from('user_profiles')
                .select('id, full_name, manager_id, role_id, role:roles(name)')
                .in('id', profileIds);
            profilesData = pd || [];

            const managerIds = [...new Set(profilesData.map(p => p.manager_id).filter(Boolean))]
                .filter(mid => !profileIds.includes(mid));
            if (managerIds.length > 0) {
                const { data: mgrs } = await supabase
                    .from('user_profiles')
                    .select('id, full_name')
                    .in('id', managerIds);
                (mgrs || []).forEach(m => { profilesData.push(m); });
            }
        }

        const routinesData = routineResult.data;

        processData(items, profilesData, routinesData || []);
        setLoading(false);
    }

    // ========================================================
    // PROCESSAMENTO
    // ========================================================
    function processData(items, empData, routines) {
        const nameMap = {};
        (empData || []).forEach(e => { nameMap[e.id] = e.full_name; });

        const nowStr = getNowTime();
        const hojeLocal = getLocalDate();

        // Classifica cada item
        function classifyItem(item) {
            const due = getEffectiveDueTime(item)?.slice(0, 5);
            const isToday = item.scheduled_date === hojeLocal;
            const isPastDate = item.scheduled_date < hojeLocal;
            const isPastDue = due && isToday && nowStr > due;
            return { due, isToday, isPastDate, isPastDue };
        }

        // 1. CONTAGENS GERAIS
        const c = { TOTAL: items.length, COMPLETED: 0, APPROVED: 0, PENDING: 0, WAITING_APPROVAL: 0, RETURNED: 0, CANCELED: 0 };
        items.forEach(i => { if (c[i.status] !== undefined) c[i.status]++; });
        const executaveis = c.TOTAL - c.CANCELED;
        c.DONE = c.COMPLETED + c.APPROVED;
        c.PERCENT = executaveis > 0 ? ((c.DONE / executaveis) * 100).toFixed(0) : 0;
        setCounts(c);

        // Pré-classifica items abertos (evita chamar classifyItem 2x)
        const classificationCache = new Map();
        items.forEach(i => {
            if (i.status === 'PENDING' || i.status === 'RETURNED') {
                classificationCache.set(i.id, classifyItem(i));
            }
        });

        // 2. POR CARGO (tabela principal)
        const roleMap = {};
        items.forEach(i => {
            const rName = i.template?.role?.name || "Geral";
            const rId = i.template?.role_id || "geral";
            if (!roleMap[rId]) roleMap[rId] = { name: rName, total: 0, done: 0, scheduled: 0, late: 0, waiting: 0 };
            roleMap[rId].total++;

            if (isDone(i.status)) {
                roleMap[rId].done++;
            } else if (i.status === 'WAITING_APPROVAL') {
                roleMap[rId].waiting++;
            } else {
                const cls = classificationCache.get(i.id);
                if (cls && (cls.isPastDate || cls.isPastDue)) {
                    roleMap[rId].late++;
                } else if (cls) {
                    roleMap[rId].scheduled++;
                }
            }
        });
        setByRole(
            Object.values(roleMap)
                .map(r => ({ ...r, pct: r.total > 0 ? (r.done / r.total) * 100 : 0 }))
                .sort((a, b) => b.pct - a.pct)
        );

        // 3. POR ROTINA
        const tplToRoutine = {};
        (routines || []).forEach(rt => {
            (rt.routine_items || []).forEach(ri => {
                if (ri.task_template_id) tplToRoutine[ri.task_template_id] = { id: rt.id, title: rt.title };
            });
        });
        const routineMap = {};
        items.forEach(item => {
            const rt = tplToRoutine[item.template_id];
            if (!rt) return;
            if (!routineMap[rt.id]) routineMap[rt.id] = { title: rt.title, total: 0, done: 0, pending: 0, returned: 0, waiting: 0 };
            routineMap[rt.id].total++;
            if (isDone(item.status)) routineMap[rt.id].done++;
            else if (item.status === 'PENDING') routineMap[rt.id].pending++;
            else if (item.status === 'RETURNED') routineMap[rt.id].returned++;
            else if (item.status === 'WAITING_APPROVAL') routineMap[rt.id].waiting++;
        });
        setByRoutine(
            Object.values(routineMap)
                .map(r => ({ ...r, pct: r.total > 0 ? (r.done / r.total) * 100 : 0 }))
                .sort((a, b) => b.pct - a.pct)
        );

        // 4. LISTAS DE TAREFAS (3 categorias)
        const openItems = items.filter(i => ['PENDING', 'RETURNED'].includes(i.status));
        const waitingItems = items.filter(i => i.status === 'WAITING_APPROVAL');

        const scheduledList = [];
        const lateList = [];

        openItems.forEach(i => {
            const cached = classificationCache.get(i.id) || classifyItem(i);
            const { due, isPastDate, isPastDue } = cached;
            const row = {
                id: i.id,
                title: i.template?.title || "—",
                role: i.template?.role?.name || "Geral",
                due,
                date: i.scheduled_date,
                isLate: isPastDate || isPastDue,
                isReturned: i.status === "RETURNED",
            };
            if (row.isLate) lateList.push(row);
            else scheduledList.push(row);
        });

        const sortByDue = (a, b) => (a.due || "99:99").localeCompare(b.due || "99:99");
        setProgramadas(scheduledList.sort(sortByDue));
        setAtrasadas(lateList.sort(sortByDue));

        setEmRevisao(waitingItems.map(i => ({
            id: i.id,
            title: i.template?.title || '—',
            role: i.template?.role?.name || 'Geral',
            date: i.scheduled_date,
            completedBy: i.completed_by ? (nameMap[i.completed_by] || '—') : '—',
            isWaiting: true,
        })).sort((a, b) => a.date.localeCompare(b.date)));

        // 5. TENDÊNCIA DIÁRIA
        const trendMap = {};
        items.forEach(i => {
            const d = i.scheduled_date;
            if (!trendMap[d]) trendMap[d] = { date: d, total: 0, done: 0 };
            trendMap[d].total++;
            if (isDone(i.status)) trendMap[d].done++;
        });
        setDailyTrend(
            Object.values(trendMap)
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(d => ({ ...d, pct: d.total > 0 ? Math.round((d.done / d.total) * 100) : 0 }))
        );
    }

    // ========================================================
    // HELPERS DE COR
    // ========================================================
    function pctColor(pct) {
        if (pct >= 90) return "text-emerald-600";
        if (pct >= 60) return "text-amber-600";
        return "text-red-600";
    }
    function pctBg(pct) {
        if (pct >= 90) return "bg-emerald-500";
        if (pct >= 60) return "bg-amber-500";
        return "bg-red-500";
    }

    // ========================================================
    // RENDER
    // ========================================================
    return (
        <div className="animate-fade-in">
            {/* HEADER */}
            <button
                onClick={goBack}
                className="flex items-center gap-2 mb-6 text-slate-400 hover:text-slate-700 font-semibold transition-colors min-h-[44px] group"
            >
                <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" /> Voltar
            </button>

            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
                <BarChart3 className="text-teal-600" />
                Painel Gerencial
            </h2>

            {/* FILTROS */}
            <div className="mb-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <Filter size={14} className="text-slate-400" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filtrar</span>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Loja</label>
                        <select
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-colors"
                            value={lojaId}
                            onChange={e => setLojaId(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            <option value="all">Todas as lojas</option>
                            {lojas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                            <Calendar size={10} className="inline mr-1" />Data Início
                        </label>
                        <input type="date" className="w-full bg-slate-50 border border-slate-200 text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-colors" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                            <Calendar size={10} className="inline mr-1" />Data Fim
                        </label>
                        <input type="date" className="w-full bg-slate-50 border border-slate-200 text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-colors" value={dataFim} onChange={e => setDataFim(e.target.value)} />
                    </div>
                    <button
                        onClick={buscarDashboard}
                        disabled={loading}
                        className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-50 shadow-md hover:shadow-lg min-h-[44px] w-full"
                    >
                        {loading ? "Carregando..." : <><Search size={18} /> Consultar</>}
                    </button>
                </div>
            </div>

            {/* ESTADO VAZIO */}
            {!counts && !loading && (
                <div className="text-center py-20 text-slate-500">
                    <BarChart3 size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Selecione uma loja e o período para visualizar o painel.</p>
                </div>
            )}

            {/* ============================== */}
            {/* DASHBOARD */}
            {/* ============================== */}
            {counts && (
                <div className="space-y-6">

                    {/* CARDS DE RESUMO */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        <SummaryCard icon={<BarChart3 size={20} />} label="Total" value={counts.TOTAL} color="bg-white" border="border-slate-200" iconBg="bg-slate-100" iconColor="text-slate-600" textColor="text-slate-800" />
                        <SummaryCard icon={<CheckCircle size={20} />} label="Concluídas" value={counts.DONE} color="bg-white" border="border-emerald-200" iconBg="bg-emerald-50" iconColor="text-emerald-600" textColor="text-emerald-700" />
                        <SummaryCard icon={<Clock size={20} />} label="Pendentes" value={counts.PENDING + counts.RETURNED} color="bg-white" border="border-red-200" iconBg="bg-red-50" iconColor="text-red-500" textColor="text-red-600" />
                        <SummaryCard icon={<Hourglass size={20} />} label="Em Revisão" value={counts.WAITING_APPROVAL} color="bg-white" border="border-amber-200" iconBg="bg-amber-50" iconColor="text-amber-600" textColor="text-amber-700" />
                    </div>

                    {/* TAXA DE CONCLUSÃO */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <TrendingUp size={18} className="text-teal-600" /> Taxa de Conclusão
                            </h3>
                            <span className={`text-3xl font-black ${pctColor(counts.PERCENT)}`}>{counts.PERCENT}%</span>
                        </div>
                        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
                            {counts.TOTAL > 0 && (<>
                                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${(counts.DONE / counts.TOTAL) * 100}%` }} title={`Concluídas: ${counts.DONE}`} />
                                <div className="bg-amber-400 h-full transition-all duration-500" style={{ width: `${(counts.WAITING_APPROVAL / counts.TOTAL) * 100}%` }} title={`Em Revisão: ${counts.WAITING_APPROVAL}`} />
                                <div className="bg-orange-400 h-full transition-all duration-500" style={{ width: `${(counts.RETURNED / counts.TOTAL) * 100}%` }} title={`Devolvidas: ${counts.RETURNED}`} />
                                <div className="bg-red-400 h-full transition-all duration-500" style={{ width: `${(counts.PENDING / counts.TOTAL) * 100}%` }} title={`Pendentes: ${counts.PENDING}`} />
                                <div className="bg-slate-300 h-full transition-all duration-500" style={{ width: `${(counts.CANCELED / counts.TOTAL) * 100}%` }} title={`Canceladas: ${counts.CANCELED}`} />
                            </>)}
                        </div>
                        <div className="flex flex-wrap gap-4 mt-3 text-[10px] font-bold uppercase text-slate-500">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Concluídas</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />Em Revisão</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />Devolvidas</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />Pendentes</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />Canceladas</span>
                        </div>
                    </div>

                    {/* TENDÊNCIA DIÁRIA */}
                    {dailyTrend.length > 1 && (
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <TrendingUp size={18} className="text-teal-600" /> Tendência Diária
                            </h3>
                            <div className="flex items-end gap-1 sm:gap-1.5 h-28">
                                {dailyTrend.map(d => (
                                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                                        <span className={`text-[8px] sm:text-[9px] font-bold leading-none ${pctColor(d.pct)}`}>{d.pct}%</span>
                                        <div className="w-full flex flex-col justify-end" style={{ height: '72px' }}>
                                            <div className={`w-full rounded-sm transition-all duration-700 ${pctBg(d.pct)}`} style={{ height: `${Math.max(d.pct, 4)}%` }} />
                                        </div>
                                        <span className="text-[7px] sm:text-[8px] text-slate-400 whitespace-nowrap truncate w-full text-center">
                                            {d.date.slice(8)}/{d.date.slice(5, 7)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-4 mt-3 text-[10px] font-bold uppercase text-slate-400">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" />≥90%</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" />60–89%</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block" />&lt;60%</span>
                            </div>
                        </div>
                    )}

                    {/* CARGOS EM ATENÇÃO */}
                    {(() => {
                        const lowPerf = byRole.filter(r => r.pct < 60 && r.total > 0);
                        if (lowPerf.length === 0) return null;
                        return (
                        <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 shadow-sm">
                            <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                                <AlertCircle size={18} className="text-amber-600" /> Atenção — Baixo Desempenho
                                <span className="bg-amber-200 text-amber-800 text-xs font-black px-2.5 py-0.5 rounded-full ml-1">
                                    {lowPerf.length}
                                </span>
                            </h3>
                            <div className="space-y-2">
                                {lowPerf.map((r, idx) => (
                                    <div key={idx} className="flex items-center justify-between gap-3 bg-white border border-amber-200 rounded-lg px-4 py-2.5">
                                        <span className="font-bold text-slate-800 text-sm">{r.name}</span>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-xs text-slate-500">{r.done}/{r.total} tarefas</span>
                                            <span className="font-black text-red-600 text-sm">{r.pct.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        );
                    })()}

                    {/* DESEMPENHO POR ROTINA */}
                    {byRoutine.length > 0 && (
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Layers size={18} className="text-violet-600" /> Desempenho por Rotina
                            </h3>
                            <div className="space-y-4">
                                {byRoutine.map(r => (
                                    <div key={r.title}>
                                        <div className="flex justify-between items-center mb-1.5 gap-2 flex-wrap">
                                            <span className="font-bold text-slate-700 text-sm">{r.title}</span>
                                            <div className="flex items-center gap-3 text-xs shrink-0">
                                                {r.pending > 0 && <span className="text-red-500 font-bold">{r.pending} pend.</span>}
                                                {r.returned > 0 && <span className="text-orange-500 font-bold">{r.returned} devol.</span>}
                                                {r.waiting > 0 && <span className="text-amber-500 font-bold">{r.waiting} revis.</span>}
                                                <span className={`font-black ${pctColor(r.pct)}`}>{r.done}/{r.total} ({r.pct.toFixed(0)}%)</span>
                                            </div>
                                        </div>
                                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                                            <div className="bg-emerald-500 h-full transition-all duration-700" style={{ width: `${(r.done / r.total) * 100}%` }} />
                                            <div className="bg-amber-400 h-full transition-all duration-700" style={{ width: `${(r.waiting / r.total) * 100}%` }} />
                                            <div className="bg-orange-400 h-full transition-all duration-700" style={{ width: `${(r.returned / r.total) * 100}%` }} />
                                            <div className="bg-red-400 h-full transition-all duration-700" style={{ width: `${(r.pending / r.total) * 100}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DESEMPENHO POR CARGO (tabela) */}
                    {byRole.length > 0 && (
                        <div className="bg-white p-3 sm:p-5 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Users size={18} className="text-teal-600" /> Desempenho por Cargo
                            </h3>
                            <table className="w-full text-sm min-w-[600px]">
                                <thead>
                                    <tr className="text-left text-[10px] uppercase text-slate-500 border-b-2 border-slate-100">
                                        <th className="pb-3 pr-4">Cargo</th>
                                        <th className="pb-3 pr-4 text-center">Atribuídas</th>
                                        <th className="pb-3 pr-4 text-center">Programadas</th>
                                        <th className="pb-3 pr-4 text-center">Atrasadas</th>
                                        <th className="pb-3 pr-4 text-center">Em Revisão</th>
                                        <th className="pb-3 pr-4 text-center">Concluídas</th>
                                        <th className="pb-3 text-right">% Conclusão</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {byRole.map((r, idx) => (
                                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="py-3 pr-4 font-bold text-slate-800">{r.name}</td>
                                            <td className="py-3 pr-4 text-center text-slate-600 font-semibold">{r.total}</td>
                                            <td className="py-3 pr-4 text-center text-slate-600">{r.scheduled}</td>
                                            <td className="py-3 pr-4 text-center">{r.late > 0 ? <span className="text-red-600 font-bold">{r.late}</span> : <span className="text-slate-400">0</span>}</td>
                                            <td className="py-3 pr-4 text-center">{r.waiting > 0 ? <span className="text-amber-600 font-bold">{r.waiting}</span> : <span className="text-slate-400">0</span>}</td>
                                            <td className="py-3 pr-4 text-center text-emerald-600 font-semibold">{r.done}</td>
                                            <td className={`py-3 text-right font-black ${pctColor(r.pct)}`}>{r.pct.toFixed(0)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TAREFAS PROGRAMADAS (colapsável) */}
                    {programadas.length > 0 && (
                        <CollapsibleSection
                            icon={<CalendarClock size={18} className="text-blue-500" />}
                            title="Tarefas Programadas"
                            count={programadas.length}
                            badge="bg-blue-100 text-blue-600"
                            defaultOpen={false}
                        >
                            <div className="space-y-2">
                                {programadas.map(t => <TaskRow key={t.id} task={t} />)}
                            </div>
                        </CollapsibleSection>
                    )}

                    {/* TAREFAS ATRASADAS (colapsável) */}
                    {atrasadas.length > 0 && (
                        <CollapsibleSection
                            icon={<AlertTriangle size={18} className="text-red-500" />}
                            title="Tarefas Atrasadas"
                            count={atrasadas.length}
                            badge="bg-red-100 text-red-600"
                        >
                            <div className="space-y-2">
                                {atrasadas.map(t => <TaskRow key={t.id} task={t} />)}
                            </div>
                        </CollapsibleSection>
                    )}

                    {/* TAREFAS EM REVISÃO (colapsável) */}
                    {emRevisao.length > 0 && (
                        <CollapsibleSection
                            icon={<Hourglass size={18} className="text-amber-500" />}
                            title="Tarefas em Revisão"
                            count={emRevisao.length}
                            badge="bg-amber-100 text-amber-600"
                        >
                            <div className="space-y-2">
                                {emRevisao.map(t => <TaskRow key={t.id} task={t} />)}
                            </div>
                        </CollapsibleSection>
                    )}

                </div>
            )}
        </div>
    );
}
