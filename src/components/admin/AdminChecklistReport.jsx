import { useState, useEffect } from "react";
import React from "react";
import { Check, AlertTriangle, X as XIcon, Calendar, Filter, ArrowLeft } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { useChecklistReport } from "../../hooks/useChecklistReport";

export default function AdminChecklistReport({ goBack, lojas, allRoles }) {
    const [filterStore, setFilterStore] = useState(lojas?.length === 1 ? lojas[0].id : "");
    const [filterRole, setFilterRole] = useState("");
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [roles, setRoles] = useState([]);

    const [selectedNote, setSelectedNote] = useState(null);

    const { loading, reportData, daysInMonth, fetchReport } = useChecklistReport();

    // Load roles disponíveis para a loja selecionada (baseado nos funcionários ativos da loja)
    useEffect(() => {
        async function fetchRoles() {
            if (!filterStore) {
                setRoles([]);
                setFilterRole("");
                return;
            }

            // Busca os role_ids distintos de funcionários ativos na loja
            const { data: empData } = await supabase
                .from('employee')
                .select('role_id')
                .eq('store_id', filterStore)
                .eq('active', true);

            const roleIds = [...new Set((empData || []).map(e => e.role_id).filter(Boolean))];

            if (roleIds.length === 0) {
                setRoles([]);
                setFilterRole("");
                return;
            }

            // Filtra do cache allRoles os que existem na loja
            const source = (allRoles && allRoles.length > 0)
                ? allRoles
                : (await supabase.from('roles').select('*').order('name')).data || [];

            const storeRoles = source.filter(r => roleIds.includes(r.id) && r.active !== false);

            setRoles(storeRoles);
            setFilterRole(storeRoles[0]?.id || "");
        }

        fetchRoles();
    }, [filterStore, allRoles]);

    // Fetch report data when filters change
    useEffect(() => {
        if (filterStore && filterRole && filterYear && filterMonth) {
            fetchReport(filterStore, filterRole, filterYear, filterMonth);
        } else if (!filterRole) {
            // Se resetou o cargo (ficou sem cargos) descarregue o report
            // Isto limpa visualmente a tela
        }
    }, [filterStore, filterRole, filterYear, filterMonth, fetchReport]);

    const months = [
        { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' },
        { value: 3, label: 'Março' }, { value: 4, label: 'Abril' },
        { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
        { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' },
        { value: 9, label: 'Setembro' }, { value: 10, label: 'Outubro' },
        { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' }
    ];

    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];

    const handleCellClick = (cellStatus, notes) => {
        if ((cellStatus === 'warning' || cellStatus === 'late') && notes) {
            setSelectedNote(notes);
        }
    };

    const activeRoleName = roles.find(r => r.id === filterRole)?.name || '...';

    return (
        <div className="animate-fade-in flex flex-col h-full">
            <button
                onClick={goBack}
                className="flex items-center gap-2 mb-6 text-slate-400 hover:text-slate-700 font-semibold transition-colors min-h-[44px] group w-max"
            >
                <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" /> Voltar
            </button>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Checklists</h1>
                    <p className="text-slate-500 font-medium">Controle e matriz de rotinas mensal ({activeRoleName})</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Loja Dropdown */}
                    <select
                        className="bg-white border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-0 rounded-lg px-3 py-2 shadow-sm"
                        value={filterStore}
                        onChange={(e) => setFilterStore(e.target.value)}
                    >
                        <option value="">Selecione a loja...</option>
                        {lojas?.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                    </select>

                    {/* Cargo Dropdown */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
                        <Filter size={18} className="text-slate-400" />
                        <select
                            className="bg-transparent border-none text-sm font-bold text-slate-700 focus:outline-none focus:ring-0 w-full"
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                        >
                            {roles.length === 0 && <option value="">Sem cargos</option>}
                            {roles.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Mês Dropdown */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
                        <Calendar size={18} className="text-slate-400" />
                        <select
                            className="bg-transparent border-none text-sm font-bold text-slate-700 focus:outline-none focus:ring-0 w-full"
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                        >
                            {months.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Ano Dropdown */}
                    <select
                        className="bg-white border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-0 rounded-lg px-3 py-2 shadow-sm"
                        value={filterYear}
                        onChange={(e) => setFilterYear(parseInt(e.target.value))}
                    >
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tabela Matriz */}
            <div className="flex-1 overflow-hidden bg-white rounded-xl shadow border border-slate-200 flex flex-col relative">
                {loading && (
                    <div className="absolute inset-0 z-20 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                )}

                <div className="overflow-auto flex-1 h-full scrollbar-thin scrollbar-thumb-slate-300">
                    <table className="w-full text-left border-collapse min-w-max">
                        <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm border-b border-slate-200">
                            <tr>
                                <th className="py-3 px-4 text-xs font-black text-slate-500 uppercase tracking-wider sticky left-0 z-20 bg-slate-50 border-r border-slate-200 w-80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    Rotina / Tarefa
                                </th>
                                {daysInMonth.map(day => (
                                    <th key={day.day} className="py-2 px-1 text-center border-r border-slate-200 min-w-10">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase leading-none">{day.weekday}</div>
                                        <div className="text-sm font-black text-slate-700 leading-none mt-1">{day.day}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-200 text-sm bg-white">
                            {reportData.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={daysInMonth.length + 1} className="py-12 text-center text-slate-500 font-medium">
                                        Nenhuma tarefa ou rotina cadastrada para este cargo neste mês.
                                    </td>
                                </tr>
                            )}

                            {reportData.map((routine) => (
                                <React.Fragment key={`routine-${routine.id}`}>
                                    {/* Cabeçalho da Rotina */}
                                    <tr className="bg-slate-100/80">
                                        <td className="py-2.5 px-4 font-black text-slate-800 text-sm uppercase tracking-wide sticky left-0 bg-slate-100/80 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-10" colSpan={1}>
                                            {routine.title}
                                        </td>
                                        <td className="border-r border-slate-200 bg-slate-100/80" colSpan={daysInMonth.length}></td>
                                    </tr>

                                    {/* Tarefas */}
                                    {routine.tasks.map(task => (
                                        <tr key={`task-${task.id}`} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3 px-4 font-semibold text-slate-600 border-r border-slate-200 sticky left-0 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-10 flex items-center h-[52px]">
                                                <span className="line-clamp-2 leading-tight pr-2">{task.title}</span>
                                            </td>
                                            {daysInMonth.map(day => {
                                                const cellData = task.days[day.dateStr];
                                                const status = cellData?.status;
                                                const notes = cellData?.notes;

                                                return (
                                                    <td key={`${task.id}-${day.day}`} className="border-r border-slate-100 text-center p-1 relative h-[52px]">
                                                        {status === 'ok' && (
                                                            <div className="w-8 h-8 rounded-md bg-green-100 border border-green-200 flex items-center justify-center mx-auto text-green-600 shadow-sm">
                                                                <Check size={16} strokeWidth={3} />
                                                            </div>
                                                        )}
                                                        {status === 'warning' && (
                                                            <div
                                                                onClick={() => handleCellClick(status, notes)}
                                                                className={`w-8 h-8 rounded-md bg-amber-100 border border-amber-300 flex items-center justify-center mx-auto text-amber-600 shadow-sm ${notes ? 'cursor-pointer hover:bg-amber-200 transition-colors ring-2 ring-amber-100 ring-offset-1' : ''}`}
                                                                title={notes ? "Clique para ver a observação" : ""}
                                                            >
                                                                <AlertTriangle size={15} strokeWidth={2.5} />
                                                            </div>
                                                        )}
                                                        {status === 'late' && (
                                                            <div
                                                                onClick={() => handleCellClick(status, notes)}
                                                                className={`w-8 h-8 rounded-md bg-red-100 border border-red-300 flex items-center justify-center mx-auto text-red-600 shadow-sm ${notes ? 'cursor-pointer hover:bg-red-200' : ''}`}
                                                            >
                                                                <XIcon size={16} strokeWidth={3} />
                                                            </div>
                                                        )}
                                                        {status === 'empty' && (
                                                            <div className="w-8 h-8 rounded-md bg-transparent mx-auto"></div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* LEGENDA */}
                <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-wrap gap-6 items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-green-100 border border-green-200 flex items-center justify-center text-green-600"><Check size={12} strokeWidth={3} /></div>
                        REALIZADO
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-red-100 border border-red-300 flex items-center justify-center text-red-600"><XIcon size={12} strokeWidth={3} /></div>
                        NÃO REALIZADO (Atrasado)
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600"><AlertTriangle size={12} strokeWidth={2.5} /></div>
                        REALIZADO C/ OBS
                    </div>
                </div>
            </div>

            {/* Modal de Observação */}
            {selectedNote && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in"
                    onClick={() => setSelectedNote(null)}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-amber-100 p-4 shrink-0 border-b border-amber-200 flex justify-between items-center">
                            <div className="flex items-center gap-2 font-bold text-amber-900">
                                <AlertTriangle size={18} /> Observação da Tarefa
                            </div>
                            <button
                                onClick={() => setSelectedNote(null)}
                                className="text-amber-700 hover:text-amber-900 bg-amber-200/50 hover:bg-amber-200 p-1.5 rounded-lg transition-colors"
                            >
                                <XIcon size={16} />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{selectedNote}</p>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
                            <button
                                onClick={() => setSelectedNote(null)}
                                className="w-full py-2.5 bg-white border border-slate-300 font-bold text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
