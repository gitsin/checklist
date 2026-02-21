import { useState } from "react";
import { supabase } from "../../supabaseClient";
import {
    ArrowLeft, Search, CheckCircle, Clock,
    Hourglass, BarChart3, Users, AlertCircle, TrendingUp, Calendar,
    Filter, Layers
} from "lucide-react";

function getLocalDate() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split("T")[0];
}

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
    const [byEmployee, setByEmployee] = useState([]);
    const [byRoutine, setByRoutine] = useState([]);
    const [pendentes, setPendentes] = useState([]);
    const [dailyTrend, setDailyTrend] = useState([]);

    // ========================================================
    // BUSCA PRINCIPAL
    // ========================================================
    async function buscarDashboard() {
        if (!lojaId) return alert("Selecione uma loja.");
        if (!dataInicio || !dataFim) return alert("Informe o período.");

        setLoading(true);

        const hoje = getLocalDate();
        function maisRecente(d1, d2) { return d1 > d2 ? d1 : d2; }

        // 1. Checklist items
        let query = supabase.from("checklist_items").select(`
            *,
            template:task_templates!inner(title, description, due_time, role_id, role:roles(name))
        `);
        if (lojaId !== 'all') query = query.eq("store_id", lojaId);

        if (dataInicio === maisRecente(dataInicio, hoje)) {
            const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
            query = query.or(`scheduled_date.gte.${dataInicio},created_at.gt.${ontem.toISOString()}`);
        } else {
            query = query.gte("scheduled_date", dataInicio);
        }
        const { data, error } = await query.lte("scheduled_date", dataFim);

        // 2. Dados de funcionários com gestor
        let empQuery = supabase
            .from('employee')
            .select('id, full_name, role_id, manager_id, manager:manager_id(full_name), role:roles(name)');
        if (lojaId !== 'all') empQuery = empQuery.eq('store_id', lojaId);
        const { data: empData } = await empQuery;

        // 3. Rotinas com seus templates vinculados
        let routineQuery = supabase
            .from('routine_templates')
            .select('id, title, routine_items(task_template_id)');
        if (lojaId !== 'all') routineQuery = routineQuery.eq('store_id', lojaId);
        const { data: routinesData } = await routineQuery;

        if (error) {
            let fallback = supabase
                .from("checklist_items")
                .select(`*, template:task_templates!inner(title, description, due_time, role_id, role:roles(name))`)
                .gte("scheduled_date", dataInicio)
                .lte("scheduled_date", dataFim);
            if (lojaId !== 'all') fallback = fallback.eq("store_id", lojaId);
            const { data: fbData } = await fallback;
            processData(fbData || [], empData || [], routinesData || []);
        } else {
            processData(data || [], empData || [], routinesData || []);
        }

        setLoading(false);
    }

    // ========================================================
    // PROCESSAMENTO DOS DADOS
    // ========================================================
    function processData(items, empData, routines) {
        // Mapa de funcionários (id → {name, role, manager})
        const empMap = {};
        (empData || []).forEach(e => {
            empMap[e.id] = {
                name: e.full_name,
                role: e.role?.name || '—',
                manager: e.manager?.full_name || '—',
            };
        });

        // 1. CONTAGENS
        const c = { TOTAL: items.length, COMPLETED: 0, PENDING: 0, WAITING_APPROVAL: 0, RETURNED: 0, CANCELED: 0 };
        items.forEach(i => { if (c[i.status] !== undefined) c[i.status]++; });
        const executaveis = c.TOTAL - c.CANCELED;
        c.PERCENT = executaveis > 0 ? ((c.COMPLETED / executaveis) * 100).toFixed(0) : 0;
        setCounts(c);

        // 2. POR CARGO
        const roleMap = {};
        items.forEach(i => {
            const rName = i.template?.role?.name || "Geral";
            const rId = i.template?.role_id || "geral";
            if (!roleMap[rId]) roleMap[rId] = { name: rName, total: 0, done: 0 };
            roleMap[rId].total++;
            if (i.status === "COMPLETED") roleMap[rId].done++;
        });
        setByRole(
            Object.values(roleMap)
                .map(r => ({ ...r, pct: r.total > 0 ? (r.done / r.total) * 100 : 0 }))
                .sort((a, b) => b.pct - a.pct)
        );

        // 3. POR FUNCIONÁRIO (com gestor)
        const empTaskMap = {};
        items.forEach(i => {
            const empId = i.completed_by;
            if (!empId && i.status !== "COMPLETED") return;
            const emp = empId ? empMap[empId] : null;
            const empName = emp?.name || (empId ? `ID ${empId}` : "Não atribuído");
            const empRole = emp?.role || i.template?.role?.name || "—";
            const manager = emp?.manager || "—";
            const key = empId || "none";
            if (!empTaskMap[key]) empTaskMap[key] = { name: empName, role: empRole, manager, total: 0, done: 0 };
            empTaskMap[key].total++;
            if (i.status === "COMPLETED") empTaskMap[key].done++;
        });
        setByEmployee(
            Object.values(empTaskMap)
                .map(e => ({ ...e, pct: e.total > 0 ? (e.done / e.total) * 100 : 0 }))
                .sort((a, b) => {
                    const mgr = a.manager.localeCompare(b.manager, 'pt-BR');
                    if (mgr !== 0) return mgr;
                    const role = a.role.localeCompare(b.role, 'pt-BR');
                    if (role !== 0) return role;
                    return a.name.localeCompare(b.name, 'pt-BR');
                })
        );

        // 4. POR ROTINA
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
            if (item.status === 'COMPLETED') routineMap[rt.id].done++;
            else if (item.status === 'PENDING') routineMap[rt.id].pending++;
            else if (item.status === 'RETURNED') routineMap[rt.id].returned++;
            else if (item.status === 'WAITING_APPROVAL') routineMap[rt.id].waiting++;
        });
        setByRoutine(
            Object.values(routineMap)
                .map(r => ({ ...r, pct: r.total > 0 ? (r.done / r.total) * 100 : 0 }))
                .sort((a, b) => b.pct - a.pct)
        );

        // 5. PENDENTES / ATRASADAS
        const nowStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const hoje = getLocalDate();
        const pend = items
            .filter(i => ["PENDING", "RETURNED"].includes(i.status))
            .map(i => {
                const due = i.template?.due_time?.slice(0, 5);
                return {
                    id: i.id,
                    title: i.template?.title || "—",
                    role: i.template?.role?.name || "Geral",
                    due,
                    date: i.scheduled_date,
                    isLate: due && i.scheduled_date === hoje ? nowStr > due : false,
                    isReturned: i.status === "RETURNED",
                };
            })
            .sort((a, b) => {
                if (a.isLate && !b.isLate) return -1;
                if (!a.isLate && b.isLate) return 1;
                return (a.due || "99:99").localeCompare(b.due || "99:99");
            });
        setPendentes(pend);

        // 6. TENDÊNCIA DIÁRIA
        const trendMap = {};
        items.forEach(i => {
            const d = i.scheduled_date;
            if (!trendMap[d]) trendMap[d] = { date: d, total: 0, done: 0 };
            trendMap[d].total++;
            if (i.status === 'COMPLETED') trendMap[d].done++;
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

            {/* ============================== */}
            {/* FILTROS */}
            {/* ============================== */}
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
                        <input
                            type="date"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-colors"
                            value={dataInicio}
                            onChange={e => setDataInicio(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                            <Calendar size={10} className="inline mr-1" />Data Fim
                        </label>
                        <input
                            type="date"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 p-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-colors"
                            value={dataFim}
                            onChange={e => setDataFim(e.target.value)}
                        />
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
            {/* DASHBOARD COMPLETO */}
            {/* ============================== */}
            {counts && (
                <div className="space-y-6">

                    {/* CARDS DE RESUMO */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        <SummaryCard icon={<BarChart3 size={20} />} label="Total" value={counts.TOTAL} color="bg-white" border="border-slate-200" iconBg="bg-slate-100" iconColor="text-slate-600" textColor="text-slate-800" />
                        <SummaryCard icon={<CheckCircle size={20} />} label="Concluídas" value={counts.COMPLETED} color="bg-white" border="border-emerald-200" iconBg="bg-emerald-50" iconColor="text-emerald-600" textColor="text-emerald-700" />
                        <SummaryCard icon={<Clock size={20} />} label="Pendentes" value={counts.PENDING} color="bg-white" border="border-red-200" iconBg="bg-red-50" iconColor="text-red-500" textColor="text-red-600" />
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
                                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${(counts.COMPLETED / counts.TOTAL) * 100}%` }} title={`Concluídas: ${counts.COMPLETED}`} />
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
                                            <div
                                                className={`w-full rounded-sm transition-all duration-700 ${pctBg(d.pct)}`}
                                                style={{ height: `${Math.max(d.pct, 4)}%` }}
                                            />
                                        </div>
                                        <span className="text-[7px] sm:text-[8px] text-slate-400 whitespace-nowrap truncate w-full text-center">
                                            {d.date.slice(5).replace('-', '/')}
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

                    {/* COLABORADORES EM ATENÇÃO */}
                    {byEmployee.filter(e => e.pct < 60 && e.total > 0).length > 0 && (
                        <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 shadow-sm">
                            <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                                <AlertCircle size={18} className="text-amber-600" /> Atenção — Baixo Desempenho
                                <span className="bg-amber-200 text-amber-800 text-xs font-black px-2.5 py-0.5 rounded-full ml-1">
                                    {byEmployee.filter(e => e.pct < 60 && e.total > 0).length}
                                </span>
                            </h3>
                            <div className="space-y-2">
                                {byEmployee.filter(e => e.pct < 60 && e.total > 0).map((e, idx) => (
                                    <div key={idx} className="flex items-center justify-between gap-3 bg-white border border-amber-200 rounded-lg px-4 py-2.5">
                                        <div className="min-w-0">
                                            <span className="font-bold text-slate-800 text-sm">{e.name}</span>
                                            <span className="text-slate-400 text-xs ml-2">{e.role}</span>
                                            {e.manager !== '—' && <span className="text-slate-300 text-xs ml-2">· {e.manager}</span>}
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-xs text-slate-500">{e.done}/{e.total} tarefas</span>
                                            <span className="font-black text-red-600 text-sm">{e.pct.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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

                    {/* EFICIÊNCIA POR CARGO */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Users size={18} className="text-teal-600" /> Eficiência por Cargo
                        </h3>
                        {byRole.length === 0 ? (
                            <p className="text-slate-400 text-sm">Sem dados.</p>
                        ) : (
                            <div className="space-y-4">
                                {byRole.map(r => (
                                    <div key={r.name}>
                                        <div className="flex justify-between text-sm mb-1.5">
                                            <span className="font-bold text-slate-700">{r.name}</span>
                                            <span className={`font-black ${pctColor(r.pct)}`}>{r.done}/{r.total} ({r.pct.toFixed(0)}%)</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-700 ${pctBg(r.pct)}`} style={{ width: `${r.pct}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* DESEMPENHO POR FUNCIONÁRIO */}
                    {byEmployee.length > 0 && (
                        <div className="bg-white p-3 sm:p-5 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Users size={18} className="text-teal-600" /> Desempenho por Funcionário
                            </h3>
                            <table className="w-full text-sm min-w-[680px]">
                                <thead>
                                    <tr className="text-left text-[10px] uppercase text-slate-500 border-b-2 border-slate-100">
                                        <th className="pb-3 pr-4">Gestor</th>
                                        <th className="pb-3 pr-4">Funcionário</th>
                                        <th className="pb-3 pr-4">Cargo</th>
                                        <th className="pb-3 pr-4 text-center">Atribuídas</th>
                                        <th className="pb-3 pr-4 text-center">Concluídas</th>
                                        <th className="pb-3 text-right">%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {byEmployee.map((e, idx) => (
                                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="py-3 pr-4 text-slate-400 text-xs whitespace-nowrap">{e.manager}</td>
                                            <td className="py-3 pr-4 font-bold text-slate-800">{e.name}</td>
                                            <td className="py-3 pr-4 text-slate-500">{e.role}</td>
                                            <td className="py-3 pr-4 text-center text-slate-600 font-semibold">{e.total}</td>
                                            <td className="py-3 pr-4 text-center text-slate-600 font-semibold">{e.done}</td>
                                            <td className={`py-3 text-right font-black ${pctColor(e.pct)}`}>{e.pct.toFixed(0)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TAREFAS PENDENTES / ATRASADAS */}
                    {pendentes.length > 0 && (
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <AlertCircle size={18} className="text-red-500" /> Tarefas Pendentes
                                <span className="bg-red-100 text-red-600 text-xs font-black px-2.5 py-0.5 rounded-full ml-1">{pendentes.length}</span>
                            </h3>
                            <div className="space-y-2">
                                {pendentes.map(t => (
                                    <div
                                        key={t.id}
                                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border transition-colors ${t.isLate ? "bg-red-50 border-red-200" : t.isReturned ? "bg-orange-50 border-orange-200" : "bg-slate-50 border-slate-200"}`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800 text-sm truncate">{t.title}</span>
                                                {t.isLate && <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase whitespace-nowrap animate-pulse">Atrasada</span>}
                                                {t.isReturned && <span className="bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase whitespace-nowrap">Devolvida</span>}
                                            </div>
                                            <span className="text-[10px] text-slate-500">{t.role} · {t.date}</span>
                                        </div>
                                        {t.due && (
                                            <span className={`text-sm font-bold whitespace-nowrap ml-3 flex items-center gap-1 ${t.isLate ? "text-red-500" : "text-slate-500"}`}>
                                                <Clock size={12} /> {t.due}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
}

// ========================================================
// SUB-COMPONENTE: Card de Resumo
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
