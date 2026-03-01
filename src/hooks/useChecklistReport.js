import { useState, useCallback } from "react";
import { supabase } from "../supabaseClient";

export function useChecklistReport() {
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [daysInMonth, setDaysInMonth] = useState([]);

    const fetchReport = useCallback(async (storeId, roleId, year, month) => {
        if (!storeId || !roleId || !year || !month) {
            setReportData([]);
            return;
        }

        setLoading(true);
        try {
            // 1. Determine the days in the month
            const daysCount = new Date(year, month, 0).getDate();
            const daysArray = Array.from({ length: daysCount }, (_, i) => {
                const d = new Date(year, month - 1, i + 1);
                return {
                    day: i + 1,
                    dateStr: `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
                    weekday: d.toLocaleDateString('pt-BR', { weekday: 'short' }).charAt(0).toUpperCase()
                };
            });
            setDaysInMonth(daysArray);

            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysCount).padStart(2, '0')}`;
            const today = new Date().toISOString().split('T')[0];

            // 2. Fetch Tasks mapped to this store and role
            const { data: tasksData, error: tasksErr } = await supabase
                .from('task_templates')
                .select(`
          id, title,
          routine_items!inner(
            routine_templates(id, title)
          )
        `)
                .eq('store_id', storeId)
                .eq('role_id', roleId)
                .eq('active', true);

            if (tasksErr) throw tasksErr;

            const taskIds = tasksData.map(t => t.id);

            let itemsData = [];
            if (taskIds.length > 0) {
                const { data, error: itemsErr } = await supabase
                    .from('checklist_items')
                    .select('id, template_id, scheduled_date, status, notes')
                    .eq('store_id', storeId)
                    .in('template_id', taskIds)
                    .gte('scheduled_date', startDate)
                    .lte('scheduled_date', endDate);

                if (itemsErr) throw itemsErr;
                itemsData = data || [];
            }

            // 4. Structure data by Routine -> Task -> Days
            const routinesMap = {}; // { routineId: { title, tasks: { taskId: { title, days: {} } } } }

            tasksData.forEach(task => {
                const routineTemplates = task.routine_items?.map(ri => ri.routine_templates).filter(Boolean) || [];

                routineTemplates.forEach(routine => {
                    if (!routinesMap[routine.id]) {
                        routinesMap[routine.id] = {
                            id: routine.id,
                            title: routine.title,
                            tasksMap: {}
                        };
                    }

                    if (!routinesMap[routine.id].tasksMap[task.id]) {
                        routinesMap[routine.id].tasksMap[task.id] = {
                            id: task.id,
                            title: task.title,
                            days: {}
                        };
                    }
                });
            });

            // 5. Fill matrix with checklist items
            // Map check items by template_id + scheduled_date
            const completionsMap = {}; // { [template_id_date]: item }
            // To handle multiple generation correctly, we take the most 'advanced' state if duplicated. 
            // But usually there's one per day. We'll just take the one that is COMPLETED if multiple exist, else the first.
            itemsData.forEach(item => {
                const key = `${item.template_id}_${item.scheduled_date}`;
                if (!completionsMap[key] || item.status === 'COMPLETED') {
                    completionsMap[key] = item;
                }
            });

            // Populate days
            Object.values(routinesMap).forEach(routine => {
                Object.values(routine.tasksMap).forEach(task => {
                    daysArray.forEach(d => {
                        const key = `${task.id}_${d.dateStr}`;
                        const item = completionsMap[key];

                        let cellStatus = 'empty'; // future or not mapped
                        let cellNotes = '';

                        if (item) {
                            const isDone = item.status === 'COMPLETED' || item.status === 'WAITING_APPROVAL';
                            const hasNotes = !!item.notes && item.notes.trim().length > 0;
                            const isPending = item.status === 'PENDING' || item.status === 'RETURNED';

                            if (isDone) {
                                cellStatus = hasNotes ? 'warning' : 'ok';
                            } else if (isPending && d.dateStr < today) {
                                cellStatus = 'late';
                            } else if (isPending && d.dateStr === today) {
                                // Technically pending today, we usually leave blank or maybe a specific color?
                                // Let's leave blank for today, or light gray. 'pending-today'
                                cellStatus = 'empty';
                            }
                            cellNotes = item.notes || '';
                        } else if (d.dateStr < today) {
                            // No checklist item generated in the past. 
                            // This could mean the task was inactive back then. We'll leave it empty.
                            cellStatus = 'empty';
                        }

                        task.days[d.dateStr] = { status: cellStatus, notes: cellNotes };
                    });
                });
            });

            // 6. Format to Array and sort
            const finalData = Object.values(routinesMap).map(r => ({
                id: r.id,
                title: r.title,
                tasks: Object.values(r.tasksMap).sort((a, b) => a.title.localeCompare(b.title))
            })).sort((a, b) => a.title.localeCompare(b.title));

            setReportData(finalData);

        } catch (err) {
            console.error("Error fetching report details:", err);
            // alert or toast can be handled by the component
        } finally {
            setLoading(false);
        }
    }, []);

    return { loading, reportData, daysInMonth, fetchReport };
}
