import { useState } from "react";
import { supabase } from "../supabaseClient";

export function useSpotTask(user, fetchData) {
  const [spotModalOpen, setSpotModalOpen] = useState(false);
  const [spotSuccessOpen, setSpotSuccessOpen] = useState(false);
  const [spotRoles, setSpotRoles] = useState([]);
  const [spotForm, setSpotForm] = useState({
    title: '', description: '', role_id: '',
    due_time: '', requires_photo: false, notify_whatsapp: false
  });
  const [spotLoading, setSpotLoading] = useState(false);

  function getLocalDate() {
    const date = new Date();
    const offset = date.getTimezoneOffset();
    date.setMinutes(date.getMinutes() - offset);
    return date.toISOString().split('T')[0];
  }

  async function openSpotModal() {
    const { data } = await supabase.from('roles').select('id, name').order('name');
    setSpotRoles(data || []);
    setSpotForm({ title: '', description: '', role_id: '', due_time: '', requires_photo: false, notify_whatsapp: false });
    setSpotModalOpen(true);
  }

  async function handleCreateSpot() {
    if (!spotForm.title.trim() || !spotForm.role_id) return;
    setSpotLoading(true);

    const { data: tpl, error: tplErr } = await supabase
      .from('task_templates')
      .insert({
        title: spotForm.title.trim(),
        description: spotForm.description.trim() || null,
        frequency_type: 'spot',
        store_id: user.store_id,
        role_id: spotForm.role_id,
        due_time: spotForm.due_time || null,
        requires_photo_evidence: spotForm.requires_photo,
        notify_whatsapp: spotForm.notify_whatsapp,
        active: false,
      })
      .select('id')
      .single();

    if (tplErr || !tpl) {
      setSpotLoading(false);
      alert('Um erro ocorreu, por favor tente novamente.');
      return;
    }

    const { error: itemErr } = await supabase.from('checklist_items').insert({
      template_id: tpl.id,
      store_id: user.store_id,
      scheduled_date: getLocalDate(),
      status: 'PENDING',
    });

    setSpotLoading(false);
    if (itemErr) {
      alert('Um erro ocorreu, por favor tente novamente.');
      return;
    }

    setSpotModalOpen(false);
    setSpotSuccessOpen(true);
    fetchData();
  }

  return {
    spotModalOpen, setSpotModalOpen,
    spotSuccessOpen, setSpotSuccessOpen,
    spotRoles,
    spotForm, setSpotForm,
    spotLoading,
    openSpotModal, handleCreateSpot,
  };
}
