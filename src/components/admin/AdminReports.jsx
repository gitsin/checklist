import { useState } from "react";
import { supabase } from "../../supabaseClient";
import {
    ArrowLeft, Search, CheckCircle, Clock, XCircle, CornerUpLeft,
    Hourglass, BarChart3, Users, AlertCircle, TrendingUp, Calendar
} from "lucide-react";

// Helper: data local no formato YYYY-MM-DD
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

    // --- DADOS DO DASHBOARD ---
    const [loading, setLoading] = useState(false);
    const [counts, setCounts] = useState(null);
    const [byRole, setByRole] = useState([]);
    const [byEmployee, setByEmployee] = useState([]);
    const [pendentes, setPendentes] = useState([]);

    // ========================================================
    // BUSCA PRINCIPAL
    // ========================================================
    async function buscarDashboard() {
        if (!lojaId) return alert("Selecione uma loja.");
        if (!dataInicio || !dataFim) return alert("Informe o período.");

        setLoading(true);

        // CORREÇÃO DE FUSO HORÁRIO:
        // Se a busca inclui "hoje", precisamos garantir que tarefas criadas hoje mas com data "amanhã" (UTC) apareçam.
        const hoje = getLocalDate();
        let query = supabase.from("checklist_items").select(`*, template:task_templates!inner(title, description, due_time, role_id, role:roles(name)), worker:employee!checklist_items_completed_by_fkey(full_name, role_id, role:roles(name))`);

        if (dataInicio === maisRecente(dataInicio, hoje)) {
            // Se hoje faz parte do range, usamos created_at para garantir
            const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
            const dataCorte = ontem.toISOString();
            query = query.or(`scheduled_date.gte.${dataInicio},created_at.gt.${dataCorte}`);
        } else {
            query = query.gte("scheduled_date", dataInicio);
        }

        const { data, error } = await query
            .eq("store_id", lojaId)
            .lte("scheduled_date", dataFim);

        function maisRecente(d1, d2) { return d1 > d2 ? d1 : d2; }

        if (error) {
            console.error("Erro na query:", error);
            // Fallback: tenta sem o FK explícito
            const { data: fallback } = await supabase
                .from("checklist_items")
                .select(`
          *,
          template:task_templates!inner(
            title, description, due_time, role_id,
            role:roles(name)
          )
        `)
                .eq("store_id", lojaId)
                .gte("scheduled_date", dataInicio)
                .lte("scheduled_date", dataFim);
            processData(fallback || []);
        } else {
            processData(data || []);
        }

        setLoading(false);
    }

    // ========================================================
    // PROCESSAMENTO DOS DADOS
    // ========================================================
    function processData(items) {
        // 1. CONTAGENS
        const c = {
            TOTAL: items.length,
            COMPLETED: 0,
            PENDING: 0,
            WAITING_APPROVAL: 0,
            RETURNED: 0,
            CANCELED: 0,
        };
        items.forEach((i) => {
            if (c[i.status] !== undefined) c[i.status]++;
        });
        const executaveis = c.TOTAL - c.CANCELED;
        c.PERCENT =
            executaveis > 0 ? ((c.COMPLETED / executaveis) * 100).toFixed(0) : 0;
        setCounts(c);

        // 2. POR CARGO
        const roleMap = {};
        items.forEach((i) => {
            const rName = i.template?.role?.name || "Geral";
            const rId = i.template?.role_id || "geral";
            if (!roleMap[rId]) roleMap[rId] = { name: rName, total: 0, done: 0 };
            roleMap[rId].total++;
            if (i.status === "COMPLETED") roleMap[rId].done++;
        });
        setByRole(
            Object.values(roleMap)
                .map((r) => ({ ...r, pct: r.total > 0 ? (r.done / r.total) * 100 : 0 }))
                .sort((a, b) => b.pct - a.pct)
        );

        // 3. POR FUNCIONÁRIO
        const empMap = {};
        items.forEach((i) => {
            const empId = i.completed_by || i.completed_by_employee_id;
            if (!empId && i.status !== "COMPLETED") return; // não atribuída
            const empName =
                i.worker?.full_name || (empId ? `ID ${empId}` : "Não atribuído");
            const empRole = i.worker?.role?.name || i.template?.role?.name || "—";
            if (!empMap[empId || "none"])
                empMap[empId || "none"] = { name: empName, role: empRole, total: 0, done: 0 };
            empMap[empId || "none"].total++;
            if (i.status === "COMPLETED") empMap[empId || "none"].done++;
        });
        setByEmployee(
            Object.values(empMap)
                .map((e) => ({ ...e, pct: e.total > 0 ? (e.done / e.total) * 100 : 0 }))
                .sort((a, b) => b.pct - a.pct)
        );

        // 4. TAREFAS PENDENTES / ATRASADAS
        const now = new Date();
        const nowStr = now.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
        });
        const pend = items
            .filter((i) => ["PENDING", "RETURNED"].includes(i.status))
            .map((i) => {
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
                Dashboard de Rotinas
            </h2>

            {/* ============================== */}
            {/* 1. FILTROS */}
            {/* ============================== */}
            <div className="bg-white p-5 rounded-xl mb-6 border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Loja
                        </label>
                        <select
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 p-3 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-colors"
                            value={lojaId}
                            onChange={(e) => setLojaId(e.target.value)}
                        >
                            <option value="">-- Selecione --</option>
                            {lojas.map((l) => (
                                <option key={l.id} value={l.id}>
                                    {l.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            <Calendar size={10} className="inline mr-1" />
                            Data Início
                        </label>
                        <input
                            type="date"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 p-3 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-colors"
                            value={dataInicio}
                            onChange={(e) => setDataInicio(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            <Calendar size={10} className="inline mr-1" />
                            Data Fim
                        </label>
                        <input
                            type="date"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 p-3 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-colors"
                            value={dataFim}
                            onChange={(e) => setDataFim(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={buscarDashboard}
                        disabled={loading}
                        className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-50 shadow-md hover:shadow-lg min-h-[48px] w-full sm:w-auto"
                    >
                        {loading ? (
                            "Carregando..."
                        ) : (
                            <>
                                <Search size={18} /> Consultar
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ============================== */}
            {/* SE NÃO BUSCOU AINDA */}
            {/* ============================== */}
            {!counts && !loading && (
                <div className="text-center py-20 text-slate-500">
                    <BarChart3 size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">
                        Selecione uma loja e o período para visualizar o dashboard.
                    </p>
                </div>
            )}

            {/* ============================== */}
            {/* DASHBOARD COMPLETO */}
            {/* ============================== */}
            {counts && (
                <div className="space-y-6">
                    {/* 2. CARDS DE RESUMO */}
                    <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                        <SummaryCard
                            icon={<BarChart3 size={20} />}
                            label="Total"
                            value={counts.TOTAL}
                            color="bg-white"
                            border="border-slate-200"
                            iconBg="bg-slate-100"
                            iconColor="text-slate-600"
                            textColor="text-slate-800"
                        />
                        <SummaryCard
                            icon={<CheckCircle size={20} />}
                            label="Concluídas"
                            value={counts.COMPLETED}
                            color="bg-white"
                            border="border-emerald-200"
                            iconBg="bg-emerald-50"
                            iconColor="text-emerald-600"
                            textColor="text-emerald-700"
                        />
                        <SummaryCard
                            icon={<Clock size={20} />}
                            label="Pendentes"
                            value={counts.PENDING}
                            color="bg-white"
                            border="border-red-200"
                            iconBg="bg-red-50"
                            iconColor="text-red-500"
                            textColor="text-red-600"
                        />
                        <SummaryCard
                            icon={<Hourglass size={20} />}
                            label="Em Revisão"
                            value={counts.WAITING_APPROVAL}
                            color="bg-white"
                            border="border-amber-200"
                            iconBg="bg-amber-50"
                            iconColor="text-amber-600"
                            textColor="text-amber-700"
                        />
                        <SummaryCard
                            icon={<CornerUpLeft size={20} />}
                            label="Devolvidas"
                            value={counts.RETURNED}
                            color="bg-white"
                            border="border-orange-200"
                            iconBg="bg-orange-50"
                            iconColor="text-orange-500"
                            textColor="text-orange-600"
                        />
                        <SummaryCard
                            icon={<XCircle size={20} />}
                            label="Canceladas"
                            value={counts.CANCELED}
                            color="bg-white"
                            border="border-slate-200"
                            iconBg="bg-slate-100"
                            iconColor="text-slate-400"
                            textColor="text-slate-500"
                        />
                    </div>

                    {/* 3. BARRA DE PROGRESSO + % */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <TrendingUp size={18} className="text-teal-600" />
                                Taxa de Conclusão
                            </h3>
                            <span className={`text-3xl font-black ${pctColor(counts.PERCENT)}`}>
                                {counts.PERCENT}%
                            </span>
                        </div>
                        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
                            {counts.TOTAL > 0 && (
                                <>
                                    <div
                                        className="bg-emerald-500 h-full transition-all duration-500"
                                        style={{
                                            width: `${(counts.COMPLETED / counts.TOTAL) * 100}%`,
                                        }}
                                        title={`Concluídas: ${counts.COMPLETED}`}
                                    />
                                    <div
                                        className="bg-amber-400 h-full transition-all duration-500"
                                        style={{
                                            width: `${(counts.WAITING_APPROVAL / counts.TOTAL) * 100}%`,
                                        }}
                                        title={`Em Revisão: ${counts.WAITING_APPROVAL}`}
                                    />
                                    <div
                                        className="bg-orange-400 h-full transition-all duration-500"
                                        style={{
                                            width: `${(counts.RETURNED / counts.TOTAL) * 100}%`,
                                        }}
                                        title={`Devolvidas: ${counts.RETURNED}`}
                                    />
                                    <div
                                        className="bg-red-400 h-full transition-all duration-500"
                                        style={{
                                            width: `${(counts.PENDING / counts.TOTAL) * 100}%`,
                                        }}
                                        title={`Pendentes: ${counts.PENDING}`}
                                    />
                                    <div
                                        className="bg-slate-300 h-full transition-all duration-500"
                                        style={{
                                            width: `${(counts.CANCELED / counts.TOTAL) * 100}%`,
                                        }}
                                        title={`Canceladas: ${counts.CANCELED}`}
                                    />
                                </>
                            )}
                        </div>
                        {/* Legenda */}
                        <div className="flex flex-wrap gap-4 mt-3 text-[10px] font-bold uppercase text-slate-500">
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                                Concluídas
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                                Em Revisão
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />
                                Devolvidas
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                                Pendentes
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                                Canceladas
                            </span>
                        </div>
                    </div>

                    {/* 4. EFICIÊNCIA POR CARGO */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Users size={18} className="text-teal-600" /> Eficiência por Cargo
                        </h3>
                        {byRole.length === 0 ? (
                            <p className="text-slate-400 text-sm">Sem dados.</p>
                        ) : (
                            <div className="space-y-4">
                                {byRole.map((r) => (
                                    <div key={r.name}>
                                        <div className="flex justify-between text-sm mb-1.5">
                                            <span className="font-bold text-slate-700">{r.name}</span>
                                            <span className={`font-black ${pctColor(r.pct)}`}>
                                                {r.done}/{r.total} ({r.pct.toFixed(0)}%)
                                            </span>
                                        </div>
                                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${pctBg(r.pct)}`}
                                                style={{ width: `${r.pct}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 5. POR FUNCIONÁRIO */}
                    {byEmployee.length > 0 && (
                        <div className="bg-white p-3 sm:p-5 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Users size={18} className="text-teal-600" /> Desempenho por
                                Funcionário
                            </h3>
                            <table className="w-full text-sm min-w-[500px]">
                                <thead>
                                    <tr className="text-left text-[10px] uppercase text-slate-500 border-b-2 border-slate-100">
                                        <th className="pb-3 pr-4">Funcionário</th>
                                        <th className="pb-3 pr-4">Cargo</th>
                                        <th className="pb-3 pr-4 text-center">Atribuídas</th>
                                        <th className="pb-3 pr-4 text-center">Concluídas</th>
                                        <th className="pb-3 text-right">%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {byEmployee.map((e, idx) => (
                                        <tr
                                            key={idx}
                                            className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                        >
                                            <td className="py-3 pr-4 font-bold text-slate-800">{e.name}</td>
                                            <td className="py-3 pr-4 text-slate-500">{e.role}</td>
                                            <td className="py-3 pr-4 text-center text-slate-600 font-semibold">
                                                {e.total}
                                            </td>
                                            <td className="py-3 pr-4 text-center text-slate-600 font-semibold">
                                                {e.done}
                                            </td>
                                            <td className={`py-3 text-right font-black ${pctColor(e.pct)}`}>
                                                {e.pct.toFixed(0)}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* 6. TAREFAS PENDENTES / ATRASADAS */}
                    {pendentes.length > 0 && (
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <AlertCircle size={18} className="text-red-500" /> Tarefas Pendentes
                                <span className="bg-red-100 text-red-600 text-xs font-black px-2.5 py-0.5 rounded-full ml-1">
                                    {pendentes.length}
                                </span>
                            </h3>
                            <div className="space-y-2">
                                {pendentes.map((t) => (
                                    <div
                                        key={t.id}
                                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border transition-colors ${t.isLate
                                            ? "bg-red-50 border-red-200"
                                            : t.isReturned
                                                ? "bg-orange-50 border-orange-200"
                                                : "bg-slate-50 border-slate-200"
                                            }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800 text-sm truncate">
                                                    {t.title}
                                                </span>
                                                {t.isLate && (
                                                    <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase whitespace-nowrap animate-pulse">
                                                        Atrasada
                                                    </span>
                                                )}
                                                {t.isReturned && (
                                                    <span className="bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase whitespace-nowrap">
                                                        Devolvida
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-slate-500">
                                                {t.role} · {t.date}
                                            </span>
                                        </div>
                                        {t.due && (
                                            <span
                                                className={`text-sm font-bold whitespace-nowrap ml-3 flex items-center gap-1 ${t.isLate ? "text-red-500" : "text-slate-500"
                                                    }`}
                                            >
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
        <div
            className={`${color} ${border} border p-3 sm:p-4 rounded-xl text-center transition-all hover:shadow-md duration-200 shadow-sm`}
        >
            <div className={`flex justify-center mb-2`}>
                <div className={`${iconBg} ${iconColor} p-1.5 rounded-lg`}>{icon}</div>
            </div>
            <div className={`text-xl sm:text-2xl font-black ${textColor}`}>{value}</div>
            <div className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-500 mt-1">{label}</div>
        </div>
    );
}