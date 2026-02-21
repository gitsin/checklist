import { useState, useEffect } from "react";
import {
  LogOut, Camera, X, CheckCircle, Clock,
  Calendar, AlertTriangle, AlertCircle,
  Hourglass, UserCheck, CornerUpLeft, MessageSquare, FileText, Zap
} from "lucide-react";

import { useKioskData } from "../hooks/useKioskData";
import { useTaskActions } from "../hooks/useTaskActions";
import { useManagerActions } from "../hooks/useManagerActions";
import { useSpotTask } from "../hooks/useSpotTask";

export default function KioskArea({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('todo');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [photoModal, setPhotoModal] = useState(null);

  const { tasks, reviewTasks, teamOverdueTasks, loading, setLoading, fetchData, isManager } = useKioskData(user);

  const {
    processingTask,
    modalObsOpen, setModalObsOpen,
    taskToFinalize,
    obsText, setObsText,
    handleFinalizarOk, openObsModal, confirmFinalizarComObs,
  } = useTaskActions(user, fetchData);

  const {
    modalReturnOpen, setModalReturnOpen,
    modalApproveOpen, setModalApproveOpen,
    taskToReview,
    returnNote, setReturnNote,
    handleManagerApprove, confirmApprove, openReturnModal, confirmReturn,
  } = useManagerActions(user, fetchData, reviewTasks, teamOverdueTasks, setLoading);

  const {
    spotModalOpen, setSpotModalOpen,
    spotSuccessOpen, setSpotSuccessOpen,
    spotRoles, spotForm, setSpotForm, spotLoading,
    openSpotModal, handleCreateSpot,
  } = useSpotTask(user, fetchData);

  // Relógio em tempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    fetchData();
    return () => clearInterval(timer);
  }, [activeTab]);

  // --- HELPERS ---
  function isLate(dueTime) {
    if (!dueTime) return false;
    const nowStr = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return nowStr > dueTime.slice(0, 5);
  }

  const visibleTasks = tasks.filter(t => {
    if (activeTab === 'todo') return ['PENDING', 'WAITING_APPROVAL', 'RETURNED'].includes(t.status);
    if (activeTab === 'done') return ['COMPLETED'].includes(t.status);
    return false;
  });

  // --- RENDERIZAÇÃO ---
  return (
    <div className="min-h-screen bg-slate-100 pb-20 font-sans pb-safe" style={{ overscrollBehaviorY: 'contain' }}>

      {/* HEADER FIXO */}
      <div className="bg-white p-3 sm:p-4 border-b sticky top-0 z-10 shadow-sm pt-safe">
        <div className="max-w-3xl mx-auto flex justify-between items-center gap-2">
          <div>
            <h2 className="font-black text-lg sm:text-xl text-slate-800 truncate">Olá, {user.full_name.split(' ')[0]}</h2>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-slate-200">{user.store_name}</span>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-blue-100">{user.role_name}</span>
            </div>
          </div>
          <button onClick={onLogout} className="flex flex-col items-center text-red-500 hover:text-red-700 font-bold text-xs gap-1 shrink-0 min-w-[44px] min-h-[44px] justify-center">
            <LogOut size={18} /> Sair
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-3 sm:p-4">

        {/* ABAS DE NAVEGAÇÃO */}
        <div className="flex bg-white p-1 rounded-lg border border-slate-200 mb-4 sm:mb-6 shadow-sm overflow-x-auto scrollbar-hide">

          <button onClick={() => setActiveTab('todo')} className={`flex-1 py-2.5 px-3 sm:px-4 whitespace-nowrap rounded-md font-bold text-xs sm:text-sm flex justify-center items-center gap-1.5 sm:gap-2 transition-all min-h-[44px] cursor-pointer ${activeTab === 'todo' ? 'bg-primary-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
            <Clock size={16} /> A Fazer
            {(() => {
              const ownCount = tasks.filter(t => ['PENDING', 'RETURNED'].includes(t.status)).length;
              const reviewCount = isManager() ? reviewTasks.length : 0;
              const total = ownCount + reviewCount;
              return total > 0 ? (
                <span className={`ml-1 text-xs px-2 rounded-full font-black ${activeTab === 'todo' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                  {total}
                </span>
              ) : null;
            })()}
          </button>

          <button onClick={() => setActiveTab('done')} className={`flex-1 py-2.5 px-3 sm:px-4 whitespace-nowrap rounded-md font-bold text-xs sm:text-sm flex justify-center items-center gap-1.5 sm:gap-2 transition-all min-h-[44px] cursor-pointer ${activeTab === 'done' ? 'bg-success text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
            <CheckCircle size={16} /> Finalizadas
          </button>

          {isManager() && (
            <button onClick={() => setActiveTab('team')} className={`flex-1 py-2.5 px-3 sm:px-4 whitespace-nowrap rounded-md font-bold text-xs sm:text-sm flex justify-center items-center gap-1.5 sm:gap-2 transition-all min-h-[44px] cursor-pointer ${activeTab === 'team' ? 'bg-error text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
              <AlertCircle size={16} /> Atrasadas
              {teamOverdueTasks.length > 0 && <span className="ml-1 bg-white text-red-600 font-black text-xs px-2 rounded-full">{teamOverdueTasks.length}</span>}
            </button>
          )}
        </div>

        {/* LISTA DE TAREFAS (A FAZER / FINALIZADAS) */}
        {activeTab !== 'team' && (
          <div className="space-y-3">
            {!loading && visibleTasks.length === 0 && !(activeTab === 'todo' && isManager() && reviewTasks.length > 0) && (
              <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                <CheckCircle size={40} className="mx-auto mb-2 opacity-20" />
                <p className="font-medium">Nenhuma tarefa encontrada.</p>
              </div>
            )}

            {visibleTasks.map(item => {
              const isReturned = item.status === 'RETURNED';
              const isWaiting = item.status === 'WAITING_APPROVAL';
              const isPending = item.status === 'PENDING';
              const isLateTask = !isWaiting && !isReturned && activeTab === 'todo' && isLate(item.template?.due_time);
              const done = item.status === 'COMPLETED';
              const requiresPhoto = item.template?.requires_photo_evidence;

              const isSpot = item.template?.frequency_type === 'spot';
              const freqMap = { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal' };
              const freqLabel = !isSpot ? (freqMap[item.template?.frequency_type] || '') : '';

              let cardBg = 'bg-yellow-50 border-yellow-300';
              let borderLeft = 'border-l-yellow-500';
              if (isReturned) { cardBg = 'bg-orange-50 border-orange-300'; borderLeft = 'border-l-orange-500'; }
              else if (isWaiting) { cardBg = 'bg-amber-50 border-amber-300'; borderLeft = 'border-l-amber-400'; }
              else if (isLateTask) { cardBg = 'bg-red-100 border-red-400'; borderLeft = 'border-l-red-600'; }
              else if (done) { cardBg = 'bg-green-50 border-green-300'; borderLeft = 'border-l-green-500'; }

              return (
                <div key={item.id} className={`rounded-xl shadow-sm border-l-[6px] ${borderLeft} border ${cardBg} relative overflow-hidden transition-all`}>

                  {isLateTask && (
                    <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-black uppercase px-4 py-1.5 rounded-bl-xl shadow-sm z-10 flex items-center gap-1.5 animate-pulse">
                      <AlertCircle size={14} /> Atrasado
                    </div>
                  )}
                  {isReturned && (
                    <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-black uppercase px-4 py-1.5 rounded-bl-xl shadow-sm z-10 flex items-center gap-1.5">
                      <CornerUpLeft size={14} /> Devolvida
                    </div>
                  )}

                  <div className="p-3 sm:p-4">
                    {isReturned && (
                      <div className="mb-2 bg-orange-100 border border-orange-200 rounded-lg p-2.5 text-orange-900 text-sm">
                        <div className="font-bold flex items-center gap-2 mb-0.5 text-orange-700"><MessageSquare size={14} /> Instruções do Gestor:</div>
                        <p className="italic text-xs">"{item.notes}"</p>
                      </div>
                    )}

                    <h3 className="font-bold text-base text-slate-800 leading-snug pr-28 mb-1">
                      {item.template?.title}
                    </h3>

                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      {freqLabel && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700 border border-blue-200 whitespace-nowrap">
                          <Calendar size={10} /> {freqLabel}
                        </span>
                      )}
                      {isSpot && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-violet-100 text-violet-700 border border-violet-200 whitespace-nowrap">
                          <Zap size={10} />
                          {item.template?.due_time
                            ? `Fazer hoje até as ${item.template.due_time.slice(0, 5)}`
                            : 'Fazer hoje'}
                        </span>
                      )}
                      {!isSpot && item.template?.due_time && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap border ${isLateTask ? 'text-red-700 bg-red-200 border-red-300' : 'text-slate-600 bg-slate-200 border-slate-300'}`}>
                          <Clock size={10} /> Até {item.template.due_time.slice(0, 5)}
                        </span>
                      )}
                    </div>
                    {item.template?.description && (
                      <p className="text-slate-500 text-xs mb-2 line-clamp-1">{item.template.description}</p>
                    )}

                    {/* BOTÕES DE AÇÃO DO FUNCIONÁRIO */}
                    {(isPending || isReturned) && (
                      <div className="grid grid-cols-2 gap-2">
                        {/* Botão Finalizar OK */}
                        <button
                          onClick={() => handleFinalizarOk(item.id, requiresPhoto)}
                          disabled={processingTask === item.id}
                          className={`text-white font-bold rounded-lg shadow-sm h-11 flex items-center justify-center gap-2 text-sm transition-all min-h-[44px] cursor-pointer ${processingTask === item.id ? 'bg-slate-400 cursor-wait' : 'bg-primary-500 hover:bg-primary-600 active:scale-95'}`}
                        >
                          {processingTask === item.id ? (
                            <>Processando...</>
                          ) : (
                            <>
                              {requiresPhoto && <Camera size={16} />}
                              {requiresPhoto ? 'Foto e Finalizar OK' : 'Finalizar OK'}
                            </>
                          )}
                        </button>

                        {/* Botão Finalizar com Obs */}
                        <button
                          onClick={() => openObsModal(item)}
                          disabled={processingTask === item.id}
                          className="bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold rounded-lg border border-amber-300 h-11 flex items-center justify-center gap-2 text-sm transition-colors min-h-[44px] cursor-pointer"
                        >
                          <FileText size={16} />
                          {requiresPhoto ? 'Foto e Finalizar c/ obs' : 'Finalizar c/ obs'}
                        </button>
                      </div>
                    )}

                    {isWaiting && (
                      <div className="mt-2 w-full bg-amber-200 border border-amber-300 text-amber-900 p-3.5 rounded-lg flex items-center justify-center gap-2.5 font-black text-sm uppercase tracking-wide">
                        <Hourglass size={18} className="animate-pulse" /> Aguardando Revisão
                      </div>
                    )}

                    {done && <div className="mt-2 text-sm font-black text-green-800 bg-green-200 border border-green-300 p-3 rounded-lg flex items-center gap-2 w-full uppercase tracking-wide"><CheckCircle size={18} /> Finalizada</div>}
                  </div>
                </div>
              );
            })}

            {/* TAREFAS DE REVISÃO — apenas na aba "A Fazer" do gestor */}
            {activeTab === 'todo' && isManager() && reviewTasks.length > 0 && (
              <div className="space-y-4 mt-1">
                {visibleTasks.length > 0 && (
                  <div className="flex items-center gap-2 px-1">
                    <div className="flex-1 h-px bg-amber-200" />
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
                      <UserCheck size={11} /> Para revisar
                    </span>
                    <div className="flex-1 h-px bg-amber-200" />
                  </div>
                )}
                {reviewTasks.map(item => (
                  <div key={item.id} className="bg-white rounded-xl shadow-lg border border-amber-200 overflow-hidden">
                    <div className="bg-amber-50 px-5 py-3 border-b border-amber-100 flex justify-between items-center">
                      <span className="text-xs font-black text-amber-600 uppercase tracking-wide">Revisão Necessária</span>
                      <span className="text-xs font-bold text-slate-500">
                        {new Date(item.completed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-lg text-slate-800 mb-1">{item.template?.title}</h3>
                      <p className="text-sm text-slate-500 mb-4">{item.template?.description}</p>

                      <div className="flex items-center gap-3 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600"><UserCheck size={20} /></div>
                        <div className="flex-1">
                          <span className="block font-bold text-slate-700 text-sm">{item.worker?.full_name || "Funcionário"}</span>
                          <span className="text-xs text-slate-400">Finalizou com observação</span>
                        </div>
                      </div>

                      {item.notes && (
                        <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                          <div className="font-bold flex items-center gap-2 mb-1 text-amber-700 text-xs uppercase"><FileText size={14} /> Observação:</div>
                          <p className="text-slate-700 text-sm">"{item.notes}"</p>
                        </div>
                      )}

                      {item.template?.requires_photo_evidence && (
                        item.evidence_image_url ? (
                          <div className="mb-4">
                            <img
                              src={item.evidence_image_url}
                              alt="Evidência"
                              onClick={() => setPhotoModal(item.evidence_image_url)}
                              className="w-full max-h-48 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                            />
                          </div>
                        ) : (
                          <div className="mb-4 p-4 bg-slate-100 rounded border border-slate-200 text-center text-slate-400 text-xs">
                            <Camera size={24} className="mx-auto mb-1 opacity-50" />
                            Sem foto anexada
                          </div>
                        )
                      )}

                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <button onClick={() => openReturnModal(item)} className="flex-1 py-3 bg-white border-2 border-orange-300 text-orange-600 font-bold rounded-lg hover:bg-orange-50 flex items-center justify-center gap-2 transition-colors min-h-[48px] cursor-pointer">
                          <CornerUpLeft size={18} /> Devolver
                        </button>
                        <button onClick={() => handleManagerApprove(item.id)} className="flex-1 py-3 bg-success text-white font-bold rounded-lg hover:brightness-110 shadow-md flex items-center justify-center gap-2 transition-colors min-h-[48px] cursor-pointer">
                          <CheckCircle size={18} /> Aprovar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA TAREFAS ATRASADAS */}
        {activeTab === 'team' && isManager() && (
          <div className="space-y-3">
            {!loading && teamOverdueTasks.length === 0 && (
              <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                <CheckCircle size={40} className="mx-auto mb-2 opacity-20" />
                <p className="font-medium">Nenhuma tarefa atrasada!</p>
                <p className="text-xs mt-1">Todas as tarefas da equipe estão em dia.</p>
              </div>
            )}
            {teamOverdueTasks.map(item => {
              const isReturned = item.status === 'RETURNED';
              const isSpot = item.template?.frequency_type === 'spot';
              const freqMap = { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal' };
              const freqLabel = !isSpot ? (freqMap[item.template?.frequency_type] || '') : '';

              let responsavelLabel = '';
              if (isReturned && item.worker?.full_name) {
                responsavelLabel = item.worker.full_name;
              } else if (item.template?.role?.name) {
                responsavelLabel = item.template.role.name;
              }

              return (
                <div key={item.id} className={`rounded-xl shadow-sm border-l-[6px] border overflow-hidden ${isReturned
                  ? 'border-l-orange-500 bg-orange-50 border-orange-300'
                  : 'border-l-red-600 bg-red-50 border-red-300'
                  }`}>
                  <div className={`px-3 py-2 flex justify-between items-center border-b ${isReturned ? 'bg-orange-100 border-orange-200' : 'bg-red-100 border-red-200'
                    }`}>
                    <h3 className="font-bold text-sm text-slate-800 leading-snug truncate mr-2">{item.template?.title}</h3>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${isReturned
                      ? 'bg-orange-500 text-white'
                      : 'bg-red-600 text-white'
                      }`}>
                      {isReturned ? '↩ Devolvida' : '⏰ Atrasada'}
                    </span>
                  </div>

                  <div className="p-3">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      {freqLabel && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700 border border-blue-200">
                          <Calendar size={10} /> {freqLabel}
                        </span>
                      )}
                      {isSpot && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-violet-100 text-violet-700 border border-violet-200 whitespace-nowrap">
                          <Zap size={10} />
                          {item.template?.due_time
                            ? `Fazer hoje até as ${item.template.due_time.slice(0, 5)}`
                            : 'Fazer hoje'}
                        </span>
                      )}
                      {!isSpot && item.template?.due_time && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase text-red-700 bg-red-200 border border-red-300">
                          <Clock size={10} /> Até {item.template.due_time.slice(0, 5)}
                        </span>
                      )}
                      {item.template?.role?.name && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-600 border border-slate-300">
                          {item.template.role.name}
                        </span>
                      )}
                    </div>
                    {responsavelLabel && (
                      <p className="text-xs text-slate-500 mt-1">
                        <span className="font-bold text-slate-600">Responsável:</span> {responsavelLabel}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* FAB TAREFA IMEDIATA */}
      {isManager() && (
        <button
          onClick={openSpotModal}
          className="fixed bottom-6 right-4 z-40 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-full shadow-xl flex items-center gap-2 px-5 py-3.5 active:scale-95 transition-all"
        >
          <Zap size={18} /> Tarefa Imediata
        </button>
      )}

      {/* MODAIS */}

      {/* Modal Observação (Funcionário) */}
      {modalObsOpen && taskToFinalize && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full sm:max-w-sm rounded-t-xl sm:rounded-xl overflow-hidden shadow-2xl max-h-[90dvh] overflow-y-auto pb-safe">
            <div className="bg-amber-50 p-5 text-center border-b border-amber-100">
              <div className="bg-amber-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-amber-600"><FileText size={24} /></div>
              <h3 className="font-bold text-amber-900 text-lg">Finalizar com Observação</h3>
              <p className="text-xs text-amber-700 mt-1">Descreva a observação sobre esta tarefa.</p>
            </div>
            <div className="p-5">
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Observação (obrigatória)</label>
              <textarea
                className="w-full border-2 border-slate-200 rounded-lg p-3 text-slate-700 focus:outline-none focus:border-amber-400 h-32 resize-none"
                placeholder="Ex: Faltou produto, equipamento com defeito..."
                value={obsText}
                onChange={e => setObsText(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex p-4 sm:p-5 gap-2 sm:gap-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalObsOpen(false)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors min-h-[48px] cursor-pointer">Cancelar</button>
              <button onClick={confirmFinalizarComObs} className="flex-1 py-3 font-bold text-white bg-amber-500 hover:brightness-110 rounded-lg shadow-md transition-all min-h-[48px] cursor-pointer flex items-center justify-center gap-2">
                {taskToFinalize.template?.requires_photo_evidence && <Camera size={18} />}
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal DEVOLVER (Gestor) */}
      {modalReturnOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full sm:max-w-sm rounded-t-xl sm:rounded-xl overflow-hidden shadow-2xl max-h-[90dvh] overflow-y-auto pb-safe">
            <div className="bg-orange-50 p-5 text-center border-b border-orange-100">
              <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-orange-600"><CornerUpLeft size={24} /></div>
              <h3 className="font-bold text-orange-900 text-lg">Devolver Tarefa</h3>
              <p className="text-xs text-orange-700 mt-1">Explique o que precisa ser corrigido.</p>
            </div>
            <div className="p-5">
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Instruções para o funcionário</label>
              <textarea
                className="w-full border-2 border-slate-200 rounded-lg p-3 text-slate-700 focus:outline-none focus:border-orange-400 h-32 resize-none"
                placeholder="Ex: A foto ficou escura, refazer limpeza..."
                value={returnNote}
                onChange={e => setReturnNote(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex p-4 sm:p-5 gap-2 sm:gap-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalReturnOpen(false)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors min-h-[48px] cursor-pointer">Cancelar</button>
              <button onClick={confirmReturn} className="flex-1 py-3 font-bold text-white bg-orange-500 hover:brightness-110 rounded-lg shadow-md transition-all min-h-[48px] cursor-pointer">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal APROVAR (Gestor) */}
      {modalApproveOpen && taskToReview && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full sm:max-w-sm rounded-t-xl sm:rounded-xl overflow-hidden shadow-2xl max-h-[90dvh] overflow-y-auto pb-safe">
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                <CheckCircle size={32} className="text-white" />
              </div>
              <h3 className="font-black text-white text-xl">Aprovar Tarefa?</h3>
              <p className="text-emerald-50 text-sm mt-1">Confira os detalhes antes de finalizar.</p>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tarefa</span>
                  <p className="font-bold text-slate-800 text-lg leading-tight">{taskToReview.template?.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{taskToReview.template?.description}</p>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 shrink-0 uppercase text-xs">
                    {taskToReview.worker?.full_name?.substring(0, 2) || 'Fn'}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Realizada por</span>
                    <p className="font-bold text-slate-700 text-sm">{taskToReview.worker?.full_name}</p>
                    <p className="text-[10px] text-slate-400">
                      {taskToReview.completed_at ? new Date(taskToReview.completed_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setModalApproveOpen(false)}
                  className="py-3.5 bg-slate-100 font-bold text-slate-600 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmApprove}
                  className="py-3.5 bg-success font-bold text-white rounded-xl hover:brightness-110 shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? 'Aprovando...' : <><CheckCircle size={18} /> Confirmar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal TAREFA IMEDIATA */}
      {spotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full sm:max-w-sm rounded-t-xl sm:rounded-xl overflow-hidden shadow-2xl max-h-[90dvh] overflow-y-auto pb-safe">
            <div className="bg-violet-50 p-5 text-center border-b border-violet-100">
              <div className="bg-violet-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-violet-600"><Zap size={24} /></div>
              <h3 className="font-bold text-violet-900 text-lg">Nova Tarefa Imediata</h3>
              <p className="text-xs text-violet-700 mt-1">A tarefa aparecerá para os funcionários do cargo selecionado.</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Título *</label>
                <input
                  type="text"
                  className="w-full border-2 border-slate-200 rounded-lg p-3 text-slate-700 focus:outline-none focus:border-violet-400"
                  placeholder="Ex: Limpar a área externa urgente"
                  value={spotForm.title}
                  onChange={e => setSpotForm(f => ({ ...f, title: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Descrição (opcional)</label>
                <textarea
                  className="w-full border-2 border-slate-200 rounded-lg p-3 text-slate-700 focus:outline-none focus:border-violet-400 h-20 resize-none"
                  placeholder="Detalhes adicionais..."
                  value={spotForm.description}
                  onChange={e => setSpotForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Cargo responsável *</label>
                <select
                  className="w-full border-2 border-slate-200 rounded-lg p-3 text-slate-700 focus:outline-none focus:border-violet-400 bg-white"
                  value={spotForm.role_id}
                  onChange={e => setSpotForm(f => ({ ...f, role_id: e.target.value }))}
                >
                  <option value="">Selecione um cargo...</option>
                  {spotRoles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Hora limite (opcional)</label>
                <input
                  type="time"
                  className="w-full border-2 border-slate-200 rounded-lg p-3 text-slate-700 focus:outline-none focus:border-violet-400"
                  value={spotForm.due_time}
                  onChange={e => setSpotForm(f => ({ ...f, due_time: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between py-2 border-t border-slate-100">
                <span className="text-sm font-bold text-slate-600">Exige foto</span>
                <button
                  onClick={() => setSpotForm(f => ({ ...f, requires_photo: !f.requires_photo }))}
                  className={`w-12 h-6 rounded-full transition-colors ${spotForm.requires_photo ? 'bg-violet-500' : 'bg-slate-200'}`}
                >
                  <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${spotForm.requires_photo ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-slate-100">
                <span className="text-sm font-bold text-slate-600">Notificar WhatsApp</span>
                <button
                  onClick={() => setSpotForm(f => ({ ...f, notify_whatsapp: !f.notify_whatsapp }))}
                  className={`w-12 h-6 rounded-full transition-colors ${spotForm.notify_whatsapp ? 'bg-violet-500' : 'bg-slate-200'}`}
                >
                  <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${spotForm.notify_whatsapp ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
            <div className="flex p-4 sm:p-5 gap-2 sm:gap-3 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setSpotModalOpen(false)}
                className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors min-h-[48px] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSpot}
                disabled={spotLoading || !spotForm.title.trim() || !spotForm.role_id}
                className="flex-1 py-3 font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-md transition-all min-h-[48px] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {spotLoading ? 'Criando...' : <><Zap size={16} /> Criar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal SUCESSO TAREFA IMEDIATA */}
      {spotSuccessOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full sm:max-w-sm rounded-t-xl sm:rounded-xl overflow-hidden shadow-2xl pb-safe">
            <div className="bg-violet-50 p-6 text-center border-b border-violet-100">
              <div className="bg-violet-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 text-violet-600">
                <Zap size={28} />
              </div>
              <h3 className="font-bold text-violet-900 text-lg">Tarefa criada!</h3>
              <p className="text-xs text-violet-700 mt-1">A tarefa imediata foi enviada para os funcionários do cargo selecionado.</p>
            </div>
            <div className="p-5">
              <button
                onClick={() => setSpotSuccessOpen(false)}
                className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all active:scale-95 min-h-[48px] cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lightbox - Foto */}
      {photoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPhotoModal(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 transition-colors z-10"
            onClick={() => setPhotoModal(null)}
          >
            <X size={32} />
          </button>
          <img
            src={photoModal}
            alt="Evidência ampliada"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

    </div>
  );
}
