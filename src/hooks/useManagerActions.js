import { useState } from "react";
import { supabase } from "../supabaseClient";

export function useManagerActions(user, fetchData, reviewTasks, teamOverdueTasks, setLoading) {
  const [modalReturnOpen, setModalReturnOpen] = useState(false);
  const [modalApproveOpen, setModalApproveOpen] = useState(false);
  const [taskToReview, setTaskToReview] = useState(null);
  const [returnNote, setReturnNote] = useState("");

  function handleManagerApprove(taskId) {
    const task = reviewTasks.find(t => t.id === taskId) || teamOverdueTasks.find(t => t.id === taskId);
    if (!task) return;
    setTaskToReview(task);
    setModalApproveOpen(true);
  }

  async function confirmApprove() {
    if (!taskToReview) return;

    setLoading(true);
    const { error } = await supabase.from('checklist_items').update({
      status: 'COMPLETED'
    }).eq('id', taskToReview.id);

    setLoading(false);
    setModalApproveOpen(false);

    if (!error) fetchData();
    else alert("Erro: " + error.message);
  }

  function openReturnModal(item) {
    setTaskToReview(item);
    setReturnNote("");
    setModalReturnOpen(true);
  }

  async function confirmReturn() {
    if (!returnNote.trim()) return alert("Escreva uma instrução para o funcionário saber o que corrigir.");

    const { error } = await supabase.from('checklist_items').update({
      status: 'RETURNED',
      notes: returnNote
    }).eq('id', taskToReview.id);

    if (!error) {
      setModalReturnOpen(false);
      fetchData();
    } else {
      alert("Erro ao devolver: " + error.message);
    }
  }

  return {
    modalReturnOpen, setModalReturnOpen,
    modalApproveOpen, setModalApproveOpen,
    taskToReview,
    returnNote, setReturnNote,
    handleManagerApprove, confirmApprove, openReturnModal, confirmReturn,
  };
}
