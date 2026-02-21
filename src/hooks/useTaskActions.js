import { useState } from "react";
import { supabase } from "../supabaseClient";

export function useTaskActions(user, fetchData) {
  const [processingTask, setProcessingTask] = useState(null);
  const [modalObsOpen, setModalObsOpen] = useState(false);
  const [taskToFinalize, setTaskToFinalize] = useState(null);
  const [obsText, setObsText] = useState("");

  // Finalizar OK (vai direto para COMPLETED)
  async function handleFinalizarOk(taskId, requiresPhoto) {
    if (processingTask === taskId) return;
    setProcessingTask(taskId);

    try {
      if (requiresPhoto) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.style.display = 'none';
        document.body.appendChild(input);

        return new Promise((resolve) => {
          input.onchange = async (e) => {
            if (e.target.files && e.target.files.length > 0) {
              const file = e.target.files[0];
              await finalizarTarefaInternal(taskId, file, null, 'COMPLETED');
            } else {
              setProcessingTask(null);
            }
            document.body.removeChild(input);
            resolve();
          };
          input.click();
        });
      }

      await finalizarTarefaInternal(taskId, null, null, 'COMPLETED');
    } catch (error) {
      console.error("Erro ao finalizar:", error);
      alert("Erro ao finalizar a tarefa. Tente novamente.");
      setProcessingTask(null);
    }
  }

  // Abre modal para Finalizar com Observação
  function openObsModal(item) {
    setTaskToFinalize(item);
    setObsText("");
    setModalObsOpen(true);
  }

  // Confirma Finalizar com Observação (vai para WAITING_APPROVAL)
  async function confirmFinalizarComObs() {
    if (!obsText.trim()) return alert("A observação é obrigatória.");
    if (!taskToFinalize) return;

    const requiresPhoto = taskToFinalize.template?.requires_photo_evidence;

    setModalObsOpen(false);
    setProcessingTask(taskToFinalize.id);

    try {
      if (requiresPhoto) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.style.display = 'none';
        document.body.appendChild(input);

        return new Promise((resolve) => {
          input.onchange = async (e) => {
            if (e.target.files && e.target.files.length > 0) {
              const file = e.target.files[0];
              await finalizarTarefaInternal(taskToFinalize.id, file, obsText, 'WAITING_APPROVAL');
            } else {
              setProcessingTask(null);
            }
            document.body.removeChild(input);
            resolve();
          };
          input.click();
        });
      }

      await finalizarTarefaInternal(taskToFinalize.id, null, obsText, 'WAITING_APPROVAL');
    } catch (error) {
      console.error("Erro ao finalizar com obs:", error);
      alert("Erro ao finalizar a tarefa. Tente novamente.");
      setProcessingTask(null);
    }
  }

  // Função interna que salva a tarefa
  async function finalizarTarefaInternal(taskId, photoFile, obs, status) {
    try {
      let evidenceImageUrl = null;

      if (photoFile) {
        const fileName = `${user.store_id}/${taskId}_${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('task-evidence')
          .upload(fileName, photoFile, { contentType: photoFile.type });

        if (uploadError) {
          throw new Error(`Erro no upload da foto: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('task-evidence')
          .getPublicUrl(fileName);

        evidenceImageUrl = urlData.publicUrl;
      }

      const updateData = {
        status: status,
        completed_at: new Date().toISOString(),
        completed_by: user.id
      };

      if (evidenceImageUrl) {
        updateData.evidence_image_url = evidenceImageUrl;
      }

      if (obs) {
        updateData.notes = obs;
      }

      const { error } = await supabase.from('checklist_items').update(updateData).eq('id', taskId);

      if (error) throw error;

      await fetchData();
    } catch (error) {
      alert("Erro ao salvar: " + error.message);
    } finally {
      setProcessingTask(null);
    }
  }

  return {
    processingTask,
    modalObsOpen, setModalObsOpen,
    taskToFinalize,
    obsText, setObsText,
    handleFinalizarOk, openObsModal, confirmFinalizarComObs,
  };
}
