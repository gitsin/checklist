import { useState } from "react";
import { supabase } from "../supabaseClient";

export function useKioskData(user) {
  const [tasks, setTasks] = useState([]);
  const [reviewTasks, setReviewTasks] = useState([]);
  const [teamOverdueTasks, setTeamOverdueTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  function getLocalDate() {
    const date = new Date();
    const offset = date.getTimezoneOffset();
    date.setMinutes(date.getMinutes() - offset);
    return date.toISOString().split('T')[0];
  }

  function isManager() {
    const role = user.role_name?.toLowerCase() || "";
    return role.includes("gerente") || role.includes("diretor") || role.includes("admin") || role.includes("gestão") || role.includes("lider");
  }

  async function fetchData() {
    setLoading(true);
    const today = getLocalDate();

    // 1. BUSCA TAREFAS DO PRÓPRIO USUÁRIO
    const { data: todayItems, error: err1a } = await supabase
      .from('checklist_items')
      .select(`
        *,
        template:task_templates (
          id, title, description, frequency_type, due_time, requires_photo_evidence, role_id, role:roles (name),
          routine_items(routine_templates(id, title))
        )
      `)
      .eq('store_id', user.store_id)
      .eq('scheduled_date', today);

    const { data: overdueItems, error: err1b } = await supabase
      .from('checklist_items')
      .select(`
        *,
        template:task_templates (
          id, title, description, frequency_type, due_time, requires_photo_evidence, role_id, role:roles (name),
          routine_items(routine_templates(id, title))
        )
      `)
      .eq('store_id', user.store_id)
      .lt('scheduled_date', today)
      .in('status', ['PENDING', 'RETURNED']);

    // Tarefas atrasadas finalizadas hoje (scheduled < hoje, mas completed_at = hoje)
    const { data: overdueFinishedToday } = await supabase
      .from('checklist_items')
      .select(`
        *,
        template:task_templates (
          id, title, description, frequency_type, due_time, requires_photo_evidence, role_id, role:roles (name),
          routine_items(routine_templates(id, title))
        )
      `)
      .eq('store_id', user.store_id)
      .lt('scheduled_date', today)
      .in('status', ['COMPLETED', 'WAITING_APPROVAL'])
      .gte('completed_at', `${today}T03:00:00Z`); // midnight São Paulo = 03:00 UTC

    if (!err1a && !err1b) {
      const allItems = [...(todayItems || []), ...(overdueItems || []), ...(overdueFinishedToday || [])];

      const seen = new Map();
      allItems.forEach(item => {
        const key = item.template_id || `raw-${item.id}`;
        if (!seen.has(key)) {
          seen.set(key, item);
        } else {
          const existing = seen.get(key);
          if (item.scheduled_date === today && existing.scheduled_date !== today) {
            seen.set(key, item);
          }
        }
      });

      const uniqueItems = Array.from(seen.values());

      const filtered = uniqueItems.filter(item => {
        if (!item.template) return false;
        if (item.store_id !== user.store_id) return false;
        return !item.template.role_id || item.template.role_id === user.role_id;
      });

      const sorted = filtered.sort((a, b) => {
        // Próprias tarefas em WAITING_APPROVAL ficam no final (já submetidas)
        if (a.status === 'WAITING_APPROVAL' && b.status !== 'WAITING_APPROVAL') return 1;
        if (a.status !== 'WAITING_APPROVAL' && b.status === 'WAITING_APPROVAL') return -1;
        // Ordena pela data de vencimento: mais antiga primeiro
        if (a.scheduled_date !== b.scheduled_date) return a.scheduled_date.localeCompare(b.scheduled_date);
        // Dentro do mesmo dia, pelo horário mais cedo primeiro
        const timeA = a.template?.due_time || '23:59';
        const timeB = b.template?.due_time || '23:59';
        return timeA.localeCompare(timeB);
      });
      setTasks(sorted);
    }

    // 2. BUSCA TAREFAS PARA REVISÃO (Apenas gestores)
    if (isManager()) {
      // Busca subordinados diretos primeiro — usados tanto na revisão quanto nas atrasadas
      const { data: subordinates } = await supabase
        .from('employee')
        .select('id, full_name, role_id')
        .eq('manager_id', user.id)
        .eq('active', true);

      // Revisão: apenas tarefas finalizadas pelos subordinados diretos deste gestor
      if (subordinates && subordinates.length > 0) {
        const subIds = subordinates.map(s => s.id);
        const { data: reviewItems, error: err2 } = await supabase
          .from('checklist_items')
          .select(`
              *,
              template:task_templates (
                title, description, requires_photo_evidence,
                routine_items(routine_templates(id, title))
              ),
              worker:completed_by (full_name)
          `)
          .eq('store_id', user.store_id)
          .eq('status', 'WAITING_APPROVAL')
          .in('completed_by', subIds);

        if (!err2) setReviewTasks(reviewItems || []);
      } else {
        setReviewTasks([]);
      }

      // 3. BUSCA TAREFAS ATRASADAS DOS SUBORDINADOS
      if (subordinates && subordinates.length > 0) {
        const subRoleIds = subordinates.map(s => String(s.role_id)).filter(Boolean);

        const { data: overdueTeamItems, error: err3a } = await supabase
          .from('checklist_items')
          .select(`
              *,
              template:task_templates (
                title, description, frequency_type, due_time, role_id, role:roles (name),
                routine_items(routine_templates(id, title))
              ),
              worker:completed_by (full_name)
          `)
          .eq('store_id', user.store_id)
          .lt('scheduled_date', today)
          .in('status', ['PENDING', 'RETURNED']);

        const { data: todayTeamItems, error: err3b } = await supabase
          .from('checklist_items')
          .select(`
              *,
              template:task_templates (
                title, description, frequency_type, due_time, role_id, role:roles (name),
                routine_items(routine_templates(id, title))
              ),
              worker:completed_by (full_name)
          `)
          .eq('store_id', user.store_id)
          .eq('scheduled_date', today)
          .in('status', ['PENDING', 'RETURNED']);

        if (!err3a && !err3b) {
          const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const allTeamItems = [...(overdueTeamItems || []), ...(todayTeamItems || [])];

          const overdue = allTeamItems.filter(item => {
            if (!item.template) return false;
            const taskRoleId = item.template.role_id;
            if (!taskRoleId || !subRoleIds.includes(String(taskRoleId))) return false;
            if (item.scheduled_date < today) return true;
            if (item.status === 'RETURNED') return true;
            const dueTime = item.template?.due_time;
            if (!dueTime) return false;
            return nowStr > dueTime.slice(0, 5);
          });

          overdue.sort((a, b) => {
            if (a.status === 'RETURNED' && b.status !== 'RETURNED') return -1;
            if (a.status !== 'RETURNED' && b.status === 'RETURNED') return 1;
            if (a.scheduled_date !== b.scheduled_date) {
              return a.scheduled_date.localeCompare(b.scheduled_date);
            }
            const tA = a.template?.due_time || '23:59';
            const tB = b.template?.due_time || '23:59';
            return tA.localeCompare(tB);
          });
          setTeamOverdueTasks(overdue);
        } else {
          setTeamOverdueTasks([]);
        }
      } else {
        setTeamOverdueTasks([]);
      }
    }

    setLoading(false);
  }

  return { tasks, reviewTasks, teamOverdueTasks, loading, setLoading, fetchData, isManager };
}
