import { useState } from "react";
import {
  BookOpen, CheckSquare, Camera,
  AlertTriangle, ShieldCheck, Settings, Users, Store, Layers,
  ArrowLeft, FileText, CheckCircle, Lock,
  BarChart3, Smartphone, ArrowRight,
  CornerUpLeft, Clock, MessageCircle,
  Plus, Trash2, Upload, Search, Calendar, ChevronRight,
  LogOut, Hourglass, AlertCircle, Zap, UserCheck, TrendingUp
} from "lucide-react";

/* ─── Número de passo ─── */
function Step({ n, title, children }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1F4D3A] text-white flex items-center justify-center font-black text-sm shadow">{n}</div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-slate-800 mb-1">{title}</h4>
        <div className="text-sm text-slate-600 space-y-2">{children}</div>
      </div>
    </div>
  );
}

/* ─── Referência visual a um elemento da UI ─── */
function UiRef({ children, icon }) {
  return (
    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded border border-slate-300 whitespace-nowrap align-middle mx-0.5">
      {icon && <span className="text-slate-400">{icon}</span>}
      {children}
    </span>
  );
}

/* ─── Mock de badge de frequência ─── */
function FreqBadge({ label }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700 border border-blue-200">
      <Calendar size={10} /> {label}
    </span>
  );
}

/* ─── Mock de badge de horário ─── */
function TimeBadge({ label, late = false }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${late ? "text-red-700 bg-red-200 border-red-300" : "text-slate-600 bg-slate-200 border-slate-300"}`}>
      <Clock size={10} /> {label}
    </span>
  );
}

/* ─── Mock de badge "Fazer hoje" (spot) ─── */
function SpotBadge({ label = "Fazer hoje" }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-violet-100 text-violet-700 border border-violet-200">
      <Zap size={10} /> {label}
    </span>
  );
}

/* ─── Mock completo de card de tarefa ─── */
function TaskCardMock({ title, freq, time, status = "pending", notes, requiresPhoto = false, late = false, spot = false }) {
  const states = {
    pending: { bg: "bg-yellow-50 border-yellow-300", bl: "border-l-yellow-500" },
    returned: { bg: "bg-orange-50 border-orange-300", bl: "border-l-orange-500" },
    waiting: { bg: "bg-amber-50 border-amber-300", bl: "border-l-amber-400" },
    done: { bg: "bg-green-50 border-green-300", bl: "border-l-green-500" },
    late: { bg: "bg-red-100 border-red-400", bl: "border-l-red-600" },
  };
  const s = late ? states.late : (states[status] || states.pending);
  return (
    <div className={`rounded-xl border-l-[6px] ${s.bl} border ${s.bg} relative overflow-hidden select-none`}>
      {late && (
        <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl flex items-center gap-1">
          <AlertCircle size={11} /> Atrasado
        </div>
      )}
      {status === "returned" && (
        <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl flex items-center gap-1">
          <CornerUpLeft size={11} /> Devolvida
        </div>
      )}
      <div className="p-3">
        {status === "returned" && notes && (
          <div className="mb-2 bg-orange-100 border border-orange-200 rounded-lg p-2 text-orange-900 text-xs">
            <div className="font-bold flex items-center gap-1 mb-0.5 text-orange-700"><MessageCircle size={12} /> Instruções do Gestor:</div>
            <p className="italic">"{notes}"</p>
          </div>
        )}
        <h3 className={`font-bold text-sm text-slate-800 leading-snug mb-1.5 ${(late || status === "returned") ? "pr-24" : ""}`}>{title}</h3>
        <div className="flex gap-1.5 flex-wrap mb-2">
          {freq && !spot && <FreqBadge label={freq} />}
          {spot && <SpotBadge label={time ? `Fazer hoje até as ${time}` : "Fazer hoje"} />}
          {time && !spot && <TimeBadge label={`Até ${time}`} late={late} />}
        </div>
        {status === "pending" || status === "returned" ? (
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className={`text-white font-bold rounded-lg h-9 flex items-center justify-center gap-1 text-xs ${late ? "bg-red-700" : "bg-[#1F4D3A]"}`}>
              {requiresPhoto && <Camera size={13} />}
              {requiresPhoto ? "Foto e Finalizar OK" : "Finalizar OK"}
            </div>
            <div className="bg-amber-100 text-amber-800 font-bold rounded-lg border border-amber-300 h-9 flex items-center justify-center gap-1 text-xs">
              <FileText size={13} /> Finalizar c/ obs
            </div>
          </div>
        ) : status === "waiting" ? (
          <div className="w-full bg-amber-200 border border-amber-300 text-amber-900 p-2.5 rounded-lg flex items-center justify-center gap-2 font-black text-xs uppercase">
            <Hourglass size={14} className="animate-pulse" /> Aguardando Revisão
          </div>
        ) : status === "done" ? (
          <div className="text-xs font-black text-green-800 bg-green-200 border border-green-300 p-2.5 rounded-lg flex items-center gap-2 w-full uppercase">
            <CheckCircle size={14} /> Finalizada
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ─── Mock de review card ─── */
function ReviewCardMock({ taskTitle, workerName, observation, hasPhoto }) {
  return (
    <div className="bg-white rounded-xl shadow border border-amber-200 overflow-hidden select-none">
      <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-100 flex justify-between items-center">
        <span className="text-[10px] font-black text-amber-600 uppercase tracking-wide">Revisão Necessária</span>
        <span className="text-[10px] font-bold text-slate-400">14:32</span>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-slate-800 mb-1 text-sm">{taskTitle}</h3>
        <div className="flex items-center gap-2 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <div className="bg-blue-100 p-1.5 rounded-full text-blue-600"><UserCheck size={16} /></div>
          <div>
            <span className="block font-bold text-slate-700 text-xs">{workerName}</span>
            <span className="text-[10px] text-slate-400">Finalizou com observação</span>
          </div>
        </div>
        {observation && (
          <div className="mb-3 p-2.5 bg-amber-50 rounded-lg border border-amber-200">
            <div className="font-bold flex items-center gap-1 mb-1 text-amber-700 text-[10px] uppercase"><FileText size={11} /> Observação:</div>
            <p className="text-slate-700 text-xs">"{observation}"</p>
          </div>
        )}
        {hasPhoto && (
          <div className="mb-3 h-20 bg-slate-200 rounded-lg border border-slate-300 flex items-center justify-center text-slate-400 text-xs gap-2">
            <Camera size={16} /> Foto de evidência
          </div>
        )}
        <div className="flex gap-2">
          <div className="flex-1 py-2 bg-white border-2 border-orange-300 text-orange-600 font-bold rounded-lg flex items-center justify-center gap-1 text-xs">
            <CornerUpLeft size={14} /> Devolver
          </div>
          <div className="flex-1 py-2 bg-[#2d7a57] text-white font-bold rounded-lg flex items-center justify-center gap-1 text-xs">
            <CheckCircle size={14} /> Aprovar
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Mock de header do kiosk ─── */
function KioskHeaderMock({ name, store, role }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center shadow-sm select-none">
      <div>
        <p className="font-black text-slate-800 text-sm">Olá, {name}</p>
        <div className="flex gap-1.5 mt-1">
          <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{store}</span>
          <span className="text-[9px] font-bold uppercase bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">{role}</span>
        </div>
      </div>
      <div className="flex flex-col items-center text-red-400 text-[10px] font-bold gap-0.5">
        <LogOut size={14} /> Sair
      </div>
    </div>
  );
}

/* ─── Mock das abas de navegação ─── */
function TabsMock({ tabs, activeIndex = 0 }) {
  return (
    <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm select-none">
      {tabs.map((tab, i) => (
        <div key={i} className={`flex-1 py-2 px-2 rounded-md font-bold text-[10px] flex justify-center items-center gap-1 ${i === activeIndex
          ? tab.color
          : "text-slate-400"}`}>
          {tab.icon} {tab.label}
          {tab.badge && <span className="ml-0.5 text-[9px] px-1.5 rounded-full font-black bg-amber-100 text-amber-700">{tab.badge}</span>}
        </div>
      ))}
    </div>
  );
}

/* ─── Callout de atenção ─── */
function Callout({ icon, color = "amber", children }) {
  const colors = {
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    violet: "bg-violet-50 border-violet-200 text-violet-800",
    green: "bg-green-50 border-green-200 text-green-800",
  };
  return (
    <div className={`p-3 rounded-xl border text-sm flex gap-2.5 ${colors[color]}`}>
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <div>{children}</div>
    </div>
  );
}

/* ================================================ */
/*              COMPONENTE PRINCIPAL                 */
/* ================================================ */
export default function UserManual({ onExit }) {
  const [activeTab, setActiveTab] = useState("operador");

  const tabs = [
    { id: "operador", label: "Operador", icon: <CheckSquare size={15} />, accent: "border-[#1F4D3A] text-[#1F4D3A]" },
    { id: "gestor", label: "Gestor", icon: <ShieldCheck size={15} />, accent: "border-violet-600 text-violet-600" },
    { id: "admin", label: "Admin", icon: <Settings size={15} />, accent: "border-slate-600 text-slate-600" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24">

      {/* HEADER */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BookOpen className="text-[#1F4D3A]" size={20} />
            <h1 className="text-lg font-bold text-slate-800">Manual do Sistema</h1>
          </div>
          <button onClick={onExit} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 font-bold text-sm min-h-[44px]">
            <ArrowLeft size={18} /> Voltar
          </button>
        </div>
        <div className="max-w-3xl mx-auto px-3 sm:px-4 flex gap-6 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 border-b-2 font-bold flex items-center gap-2 whitespace-nowrap transition-colors text-sm ${activeTab === tab.id ? tab.accent : "border-transparent text-slate-400 hover:text-slate-600"}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-3 sm:p-5 space-y-8 animate-fade-in">

        {/* ══════════════════════════════════════════════ */}
        {/*                  OPERADOR                      */}
        {/* ══════════════════════════════════════════════ */}
        {activeTab === "operador" && (
          <>
            <div className="bg-[#1F4D3A] p-5 rounded-xl text-white">
              <h2 className="text-xl font-bold mb-1">Manual do Operador</h2>
              <p className="text-emerald-200 text-sm">Como acessar o sistema, executar e finalizar tarefas no dia a dia.</p>
            </div>

            {/* SEÇÃO 1: ACESSO */}
            <section className="space-y-5">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2 border-slate-200">
                <Smartphone className="text-[#1F4D3A]" size={20} /> 1. Entrando no Sistema
              </h3>

              <Step n={1} title="Escolha a sua loja">
                <p>Na tela inicial você verá os cards de cada unidade. Toque na loja onde está trabalhando hoje.</p>
                <div className="grid grid-cols-2 gap-2 mt-2 select-none">
                  <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-4 text-center">
                    <Store size={22} className="mx-auto mb-1.5 text-blue-500" />
                    <span className="font-bold text-sm text-blue-800">Barley Rio</span>
                  </div>
                  <div className="bg-emerald-50 border border-slate-200 rounded-xl p-4 text-center">
                    <Store size={22} className="mx-auto mb-1.5 text-slate-400" />
                    <span className="font-bold text-sm text-slate-600">DK São Paulo</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1">A loja selecionada fica destacada com borda colorida.</p>
              </Step>

              <Step n={2} title="Selecione seu nome">
                <p>Após escolher a loja, toque no <strong>card com seu nome e cargo</strong>.</p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 mt-2 space-y-1.5">
                  {[
                    { ini: "J", name: "João Silva", role: "Garçom", active: true },
                    { ini: "M", name: "Maria Costa", role: "Cozinheira", active: false },
                  ].map((p, i) => (
                    <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg ${p.active ? "bg-white border border-[#1F4D3A] shadow-sm" : "bg-transparent"}`}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${p.active ? "bg-[#1F4D3A] text-white" : "bg-slate-200 text-slate-500"}`}>{p.ini}</div>
                      <div className="flex-1">
                        <span className="font-bold text-slate-800 text-sm block">{p.name}</span>
                        <span className="text-[10px] font-bold uppercase text-slate-400">{p.role}</span>
                      </div>
                      <ChevronRight size={16} className={p.active ? "text-[#1F4D3A]" : "text-slate-200"} />
                    </div>
                  ))}
                </div>
              </Step>

              <Step n={3} title="Sua área de trabalho">
                <p>Após o login você verá o painel com as abas de navegação e suas tarefas do dia.</p>
                <div className="mt-2 space-y-2">
                  <KioskHeaderMock name="João" store="Barley Rio" role="Garçom" />
                  <TabsMock
                    activeIndex={0}
                    tabs={[
                      { label: "A Fazer", icon: <Clock size={12} />, color: "bg-[#1F4D3A] text-white shadow-md", badge: "3" },
                      { label: "Finalizadas", icon: <CheckCircle size={12} />, color: "text-slate-400" },
                    ]}
                  />
                </div>
              </Step>
            </section>

            {/* SEÇÃO 2: TAREFAS */}
            <section className="space-y-5">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2 border-slate-200">
                <CheckSquare className="text-[#1F4D3A]" size={20} /> 2. Suas Tarefas do Dia
              </h3>

              <p className="text-sm text-slate-600">
                Cada tarefa aparece como um card na aba <UiRef icon={<Clock size={11} />}>A Fazer</UiRef>.
                As badges informam a frequência e o horário limite.
              </p>

              <div className="space-y-3">
                <TaskCardMock
                  title="Verificar estoque de bebidas"
                  freq="Diário"
                  time="10:00"
                  status="pending"
                />
                <TaskCardMock
                  title="Limpeza do banheiro"
                  freq="Diário"
                  status="pending"
                  requiresPhoto
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-sm space-y-2 text-slate-600">
                <p><FreqBadge label="Diário" /> <span className="mx-1">/</span> <FreqBadge label="Semanal" /> <span className="mx-1">/</span> <FreqBadge label="Mensal" /> — com que frequência essa tarefa se repete.</p>
                <p><TimeBadge label="Até 10:00" /> — horário limite para conclusão.</p>
                <p><Camera size={13} className="inline text-purple-600 mr-1" /><strong>Ícone de câmera</strong> no botão indica que a tarefa exige uma foto como evidência.</p>
              </div>

              <Callout icon={<AlertTriangle size={17} />} color="amber">
                <strong>Tarefas atrasadas</strong> ficam com fundo vermelho e exibem o banner
                <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded mx-1"><AlertCircle size={10} /> Atrasado</span>
                no canto superior. Priorize-as!
              </Callout>
            </section>

            {/* SEÇÃO 3: FINALIZANDO */}
            <section className="space-y-5">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2 border-slate-200">
                <CheckCircle className="text-green-500" size={20} /> 3. Finalizando uma Tarefa
              </h3>

              {/* Finalizar OK */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-[#1F4D3A]/10 p-3 border-b border-slate-100 flex items-center gap-2">
                  <div className="bg-[#1F4D3A] text-white font-bold rounded-lg px-3 py-1.5 text-xs flex items-center gap-1"><CheckCircle size={13} /> Finalizar OK</div>
                  <span className="text-sm font-bold text-[#1F4D3A]">Tarefa concluída normalmente</span>
                </div>
                <div className="p-4 text-sm text-slate-600">
                  Toque em <strong>Finalizar OK</strong> quando a tarefa estiver feita e não houver nada a observar.
                  O card passará para a aba <UiRef icon={<CheckCircle size={11} />}>Finalizadas</UiRef> com status verde.
                </div>
              </div>

              {/* Finalizar com Obs */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-amber-50 p-3 border-b border-amber-100 flex items-center gap-2">
                  <div className="bg-amber-100 text-amber-800 border border-amber-300 font-bold rounded-lg px-3 py-1.5 text-xs flex items-center gap-1"><FileText size={13} /> Finalizar c/ obs</div>
                  <span className="text-sm font-bold text-amber-700">Tarefa feita mas com ressalva</span>
                </div>
                <div className="p-4 text-sm text-slate-600 space-y-2">
                  <p>Use quando a tarefa foi executada mas há algo a relatar (ex: faltou produto, equipamento com defeito). Um campo de texto aparecerá para você digitar a <strong>observação</strong>.</p>
                  <p>A tarefa ficará em <strong>Aguardando Revisão</strong> até o gestor avaliar sua observação:</p>
                  <TaskCardMock title="Verificar estoque de bebidas" status="waiting" />
                </div>
              </div>

              {/* Com foto */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-purple-50 p-3 border-b border-purple-100 flex items-center gap-2">
                  <div className="bg-purple-100 text-purple-700 border border-purple-200 font-bold rounded-lg px-3 py-1.5 text-xs flex items-center gap-1"><Camera size={13} /> Tarefas com foto</div>
                </div>
                <div className="p-4 text-sm text-slate-600 space-y-2">
                  <p>Quando o botão exibir <Camera size={13} className="inline text-purple-600" /> <strong>câmera</strong>, o sistema abrirá a câmera do seu celular antes de finalizar. Tire a foto e confirme — ela será salva como evidência da execução.</p>
                  <TaskCardMock title="Limpeza do banheiro" freq="Diário" status="pending" requiresPhoto />
                </div>
              </div>
            </section>

            {/* SEÇÃO 4: TAREFA DEVOLVIDA */}
            <section className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2 border-slate-200">
                <CornerUpLeft className="text-orange-500" size={20} /> 4. Quando uma Tarefa é Devolvida
              </h3>
              <p className="text-sm text-slate-600">
                Se o gestor não aprovar sua execução, a tarefa retorna para você com o banner
                <span className="inline-flex items-center gap-1 bg-orange-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded mx-1"><CornerUpLeft size={10} /> Devolvida</span>.
                Leia a instrução e refaça a tarefa.
              </p>
              <TaskCardMock
                title="Limpeza do banheiro"
                status="returned"
                notes="A foto ficou escura. Refaça a limpeza e tire uma nova foto com boa iluminação."
              />
              <Callout icon={<AlertTriangle size={17} />} color="amber">
                Tarefas devolvidas aparecem no <strong>topo da lista</strong>. Resolva-as com prioridade pois o gestor está esperando.
              </Callout>
            </section>

            {/* SEÇÃO 5: ESTADOS */}
            <section className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2 border-slate-200">
                <Settings className="text-slate-500" size={20} /> 5. Estados de uma Tarefa
              </h3>
              <div className="space-y-2">
                {[
                  { bg: "bg-yellow-50 border-l-yellow-500 border-yellow-200", dot: "bg-yellow-400", label: "Pendente", desc: "Aguardando você executar." },
                  { bg: "bg-red-100 border-l-red-600 border-red-300", dot: "bg-red-500", label: "Atrasada", desc: "Passou do horário limite. Execute imediatamente." },
                  { bg: "bg-amber-50 border-l-amber-400 border-amber-200", dot: "bg-amber-400", label: "Aguardando Revisão", desc: "Você finalizou com observação. O gestor irá avaliar." },
                  { bg: "bg-orange-50 border-l-orange-500 border-orange-200", dot: "bg-orange-500", label: "Devolvida", desc: "Gestor pediu para refazer. Veja as instruções e reenvie." },
                  { bg: "bg-green-50 border-l-green-500 border-green-200", dot: "bg-green-500", label: "Finalizada", desc: "Concluída e aprovada. Aparece na aba Finalizadas." },
                ].map((s, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border-l-4 border ${s.bg}`}>
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${s.dot}`} />
                    <div>
                      <span className="font-bold text-slate-800 text-sm">{s.label}</span>
                      <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/*                  GESTOR                        */}
        {/* ══════════════════════════════════════════════ */}
        {activeTab === "gestor" && (
          <>
            <div className="bg-violet-600 p-5 rounded-xl text-white">
              <h2 className="text-xl font-bold mb-1">Manual do Gestor</h2>
              <p className="text-violet-200 text-sm">Aprovação de tarefas, monitoramento da equipe e criação de tarefas imediatas.</p>
            </div>

            {/* SEÇÃO 1: ACESSO */}
            <section className="space-y-5">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2 border-slate-200">
                <Users className="text-violet-500" size={20} /> 1. Acessando como Gestor
              </h3>

              <p className="text-sm text-slate-600">
                O acesso é o mesmo que o operador: escolha a loja e selecione seu nome na lista.
                O sistema detecta automaticamente que você é gestor pelo seu cargo e libera as funcionalidades extras.
              </p>

              <Step n={1} title="Abas disponíveis para o gestor">
                <p>Além de <UiRef icon={<Clock size={11} />}>A Fazer</UiRef> e <UiRef icon={<CheckCircle size={11} />}>Finalizadas</UiRef>, você terá a aba:</p>
                <TabsMock
                  activeIndex={2}
                  tabs={[
                    { label: "A Fazer", icon: <Clock size={12} />, color: "text-slate-400", badge: "2" },
                    { label: "Finalizadas", icon: <CheckCircle size={12} />, color: "text-slate-400" },
                    { label: "Atrasadas", icon: <AlertCircle size={12} />, color: "bg-red-500 text-white shadow-md", badge: "4" },
                  ]}
                />
              </Step>
            </section>

            {/* SEÇÃO 2: SUAS TAREFAS + REVISÃO */}
            <section className="space-y-5">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2 border-slate-200">
                <CheckCircle className="text-[#1F4D3A]" size={20} /> 2. Suas Tarefas e Revisões na Aba "A Fazer"
              </h3>

              <p className="text-sm text-slate-600">
                A aba <UiRef icon={<Clock size={11} />}>A Fazer</UiRef> mostra <strong>suas próprias tarefas</strong> no topo,
                e logo abaixo as <strong>tarefas da equipe aguardando revisão</strong>, separadas por um divisor:
              </p>

              <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <TaskCardMock title="Conferir relatório de caixa" freq="Diário" time="12:00" status="pending" />

                {/* divisor "Para revisar" */}
                <div className="flex items-center gap-2 px-1">
                  <div className="flex-1 h-px bg-amber-200" />
                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
                    <UserCheck size={11} /> Para revisar
                  </span>
                  <div className="flex-1 h-px bg-amber-200" />
                </div>

                <ReviewCardMock
                  taskTitle="Limpeza do banheiro"
                  workerName="João Silva"
                  observation="Faltou produto de limpeza, usei água apenas."
                  hasPhoto
                />
              </div>

              <p className="text-sm text-slate-600">
                O badge no botão da aba soma suas tarefas pendentes + revisões aguardando:
              </p>
              <TabsMock
                activeIndex={0}
                tabs={[
                  { label: "A Fazer", icon: <Clock size={12} />, color: "bg-[#1F4D3A] text-white shadow-md", badge: "5" },
                  { label: "Finalizadas", icon: <CheckCircle size={12} />, color: "text-slate-400" },
                  { label: "Atrasadas", icon: <AlertCircle size={12} />, color: "text-slate-400", badge: "2" },
                ]}
              />
            </section>

            {/* SEÇÃO 3: APROVAR / DEVOLVER */}
            <section className="space-y-5">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2 border-slate-200">
                <CheckCircle className="text-green-500" size={20} /> 3. Aprovando e Devolvendo Tarefas
              </h3>

              <p className="text-sm text-slate-600">Dentro do card de revisão, dois botões estarão disponíveis:</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-green-800">
                    <div className="bg-[#2d7a57] text-white rounded-lg px-3 py-1.5 text-xs flex items-center gap-1"><CheckCircle size={13} /> Aprovar</div>
                  </div>
                  <p className="text-sm text-slate-600">
                    Toque quando o trabalho estiver satisfatório. Uma tela de confirmação mostra os detalhes e o nome do funcionário antes de finalizar. O card muda para <strong>verde</strong>.
                  </p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-orange-800">
                    <div className="bg-orange-500 text-white rounded-lg px-3 py-1.5 text-xs flex items-center gap-1"><CornerUpLeft size={13} /> Devolver</div>
                  </div>
                  <p className="text-sm text-slate-600">
                    Toque para pedir correção. Um campo aparece para escrever a instrução. A tarefa voltará para o funcionário em <strong>laranja</strong>.
                  </p>
                </div>
              </div>

              {/* Fluxo visual */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase mb-3">Fluxo de aprovação</p>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Pendente</span>
                  <ArrowRight size={13} className="text-slate-300" />
                  <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded">Aguardando Revisão</span>
                  <ArrowRight size={13} className="text-slate-300" />
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded">Aprovada ✓</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold mt-2">
                  <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded">Aguardando Revisão</span>
                  <ArrowRight size={13} className="text-slate-300" />
                  <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">Devolvida ↩</span>
                  <ArrowRight size={13} className="text-slate-300" />
                  <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded">Re-enviada</span>
                  <ArrowRight size={13} className="text-slate-300" />
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded">Aprovada ✓</span>
                </div>
              </div>
            </section>

            {/* SEÇÃO 4: ABA ATRASADAS */}
            <section className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2 border-slate-200">
                <AlertCircle className="text-red-500" size={20} /> 4. Monitorando Tarefas Atrasadas da Equipe
              </h3>
              <p className="text-sm text-slate-600">
                A aba <UiRef icon={<AlertCircle size={11} />}>Atrasadas</UiRef> lista as tarefas dos seus subordinados
                que passaram do prazo ou estão devolvidas. O número no badge atualiza em tempo real.
              </p>
              <div className="space-y-2">
                <div className="rounded-xl border-l-[6px] border-l-red-600 border border-red-300 bg-red-50 overflow-hidden select-none">
                  <div className="bg-red-100 border-b border-red-200 px-3 py-2 flex justify-between items-center">
                    <h3 className="font-bold text-sm text-slate-800 truncate">Verificar estoque de bebidas</h3>
                    <span className="text-[10px] font-black uppercase bg-red-600 text-white px-2 py-0.5 rounded-full">⏰ Atrasada</span>
                  </div>
                  <div className="p-3">
                    <div className="flex gap-1.5">
                      <FreqBadge label="Diário" />
                      <TimeBadge label="Até 10:00" late />
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5"><span className="font-bold text-slate-600">Responsável:</span> Garçom</p>
                  </div>
                </div>
                <div className="rounded-xl border-l-[6px] border-l-orange-500 border border-orange-300 bg-orange-50 overflow-hidden select-none">
                  <div className="bg-orange-100 border-b border-orange-200 px-3 py-2 flex justify-between items-center">
                    <h3 className="font-bold text-sm text-slate-800 truncate">Limpeza do banheiro</h3>
                    <span className="text-[10px] font-black uppercase bg-orange-500 text-white px-2 py-0.5 rounded-full">↩ Devolvida</span>
                  </div>
                  <div className="p-3">
                    <FreqBadge label="Diário" />
                    <p className="text-xs text-slate-500 mt-1.5"><span className="font-bold text-slate-600">Responsável:</span> João Silva</p>
                  </div>
                </div>
              </div>
            </section>

            {/* SEÇÃO 5: TAREFA IMEDIATA */}
            <section className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2 border-slate-200">
                <Zap className="text-violet-600" size={20} /> 5. Criando uma Tarefa Imediata
              </h3>

              <p className="text-sm text-slate-600">
                Precisa delegar algo urgente que não está na rotina do dia? Use o botão flutuante que aparece no canto inferior direito da tela:
              </p>

              {/* FAB mock */}
              <div className="relative h-20 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                <div className="absolute bottom-3 right-3 bg-violet-600 text-white font-bold rounded-full px-4 py-2.5 flex items-center gap-2 text-xs shadow-xl select-none">
                  <Zap size={15} /> Tarefa Imediata
                </div>
              </div>

              <p className="text-sm text-slate-600">Ao tocar, um formulário aparece para preencher:</p>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden select-none">
                <div className="bg-violet-50 p-4 text-center border-b border-violet-100">
                  <div className="bg-violet-100 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1.5 text-violet-600"><Zap size={20} /></div>
                  <h3 className="font-bold text-violet-900">Nova Tarefa Imediata</h3>
                  <p className="text-[11px] text-violet-600 mt-0.5">A tarefa aparecerá para os funcionários do cargo selecionado.</p>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { label: "Título *", placeholder: "Ex: Limpar área externa urgente", required: true },
                    { label: "Descrição (opcional)", placeholder: "Detalhes adicionais..." },
                  ].map((f, i) => (
                    <div key={i}>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{f.label}</label>
                      <div className="w-full border-2 border-slate-200 rounded-lg p-2.5 text-slate-300 text-xs">{f.placeholder}</div>
                    </div>
                  ))}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Cargo responsável *</label>
                    <div className="w-full border-2 border-slate-200 rounded-lg p-2.5 text-slate-300 text-xs">Selecione um cargo...</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Hora limite (opcional)</label>
                    <div className="w-full border-2 border-slate-200 rounded-lg p-2.5 text-slate-300 text-xs">--:--</div>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-600">Exige foto</span>
                    <div className="w-10 h-5 bg-slate-200 rounded-full" />
                  </div>
                </div>
                <div className="flex gap-2 p-4 bg-slate-50 border-t border-slate-100">
                  <div className="flex-1 py-2.5 text-center font-bold text-slate-400 text-xs rounded-lg">Cancelar</div>
                  <div className="flex-1 py-2.5 text-center font-bold text-white bg-violet-600 text-xs rounded-lg flex items-center justify-center gap-1"><Zap size={12} /> Criar</div>
                </div>
              </div>

              <p className="text-sm text-slate-600">
                Após tocar em <strong>Criar</strong>, a tarefa aparece instantaneamente na lista de todos os funcionários do cargo selecionado, com o badge:
              </p>
              <div className="flex gap-2">
                <SpotBadge />
                <SpotBadge label="Fazer hoje até as 18:00" />
              </div>
            </section>

            {/* SEÇÃO 6: RELATÓRIOS */}
            <section className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2 border-slate-200">
                <BarChart3 className="text-teal-500" size={20} /> 6. Relatórios de Desempenho
              </h3>
              <p className="text-sm text-slate-600">
                Acesse a área Admin e toque em <UiRef icon={<BarChart3 size={11} />}>Relatórios</UiRef>.
                Selecione a loja e o período, depois toque em Consultar.
              </p>
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Total", value: "28", color: "bg-slate-100 text-slate-700" },
                    { label: "Concluídas", value: "19", color: "bg-green-100 text-green-700" },
                    { label: "Pendentes", value: "6", color: "bg-yellow-100 text-yellow-700" },
                    { label: "Em Revisão", value: "3", color: "bg-amber-100 text-amber-700" },
                  ].map((c, i) => (
                    <div key={i} className={`${c.color} rounded-xl p-3 text-center select-none`}>
                      <p className="text-2xl font-black">{c.value}</p>
                      <p className="text-[10px] font-bold uppercase">{c.label}</p>
                    </div>
                  ))}
                </div>
                {/* Barra de progresso */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                    <span>Taxa de Conclusão</span><span>68%</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#1F4D3A] rounded-full" style={{ width: "68%" }} />
                  </div>
                </div>
                {/* Tendência */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><TrendingUp size={11} /> Tendência Diária</p>
                  <div className="flex items-end gap-1 h-16">
                    {[45, 72, 60, 88, 68].map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <span className="text-[8px] font-bold text-slate-400">{v}%</span>
                        <div className="w-full rounded-t" style={{ height: `${v * 0.5}px`, backgroundColor: v >= 75 ? "#1F4D3A" : v >= 50 ? "#f59e0b" : "#ef4444" }} />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-500">Também exibe: desempenho por cargo, ranking de funcionários e lista de tarefas pendentes.</p>
              </div>
            </section>
          </>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/*                 ADMIN                          */}
        {/* ══════════════════════════════════════════════ */}
        {activeTab === "admin" && (
          <>
            <div className="bg-slate-800 p-5 rounded-xl text-white">
              <h2 className="text-xl font-bold mb-1">Manual do Administrador</h2>
              <p className="text-slate-400 text-sm">Configuração de lojas, equipe, tarefas, rotinas e relatórios.</p>
            </div>

            {/* SEÇÃO 1: ACESSO */}
            <section className="space-y-5">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2 border-slate-200">
                <Lock className="text-slate-500" size={20} /> 1. Acessando a Área Admin
              </h3>

              <Step n={1} title="Toque em Acesso Admin">
                <p>
                  Na tela inicial (seleção de lojas), role até o final da página e toque no botão
                  <UiRef icon={<Lock size={11} />}>Acesso Admin</UiRef> no rodapé.
                </p>
              </Step>
              <Step n={2} title="Digite a senha e confirme">
                <p>Uma janela solicitará a senha de administrador. Após digitar, toque em <strong>Entrar</strong>.</p>
              </Step>
              <Step n={3} title="Menu principal">
                <p>Você verá 6 opções de gestão:</p>
                <div className="grid grid-cols-3 gap-2 mt-2 select-none">
                  {[
                    { icon: <Store size={20} className="text-blue-500" />, label: "Lojas", hover: "text-blue-600" },
                    { icon: <Users size={20} className="text-green-500" />, label: "Equipe", hover: "text-green-600" },
                    { icon: <Users size={20} className="text-amber-500" />, label: "Cargos", hover: "text-amber-600" },
                    { icon: <CheckSquare size={20} className="text-purple-500" />, label: "Tarefas", hover: "text-purple-600" },
                    { icon: <Layers size={20} className="text-amber-600" />, label: "Rotinas", hover: "text-amber-700" },
                    { icon: <BarChart3 size={20} className="text-teal-500" />, label: "Relatórios", hover: "text-teal-600" },
                  ].map((item, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm">
                      {item.icon}
                      <span className="font-bold text-xs text-slate-700">{item.label}</span>
                    </div>
                  ))}
                </div>
              </Step>

              <Callout icon={<FileText size={17} />} color="blue">
                <strong>Ordem recomendada de cadastro:</strong><br />
                1. Cargos → 2. Lojas → 3. Colaboradores → 4. Tarefas → 5. Rotinas
              </Callout>
            </section>

            {/* SEÇÃO 2: LOJAS */}
            <section className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2 border-slate-200">
                <Store className="text-blue-500" size={20} /> 2. Lojas
              </h3>
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-sm text-slate-600">
                <p><strong>Criar:</strong> Preencha os campos Nome e Código Interno e toque em Salvar.</p>
                <p><strong>Editar:</strong> Toque no botão <UiRef>Editar</UiRef> no card da loja. O modal permite alterar nome, código e o ID do grupo de WhatsApp para notificações automáticas.</p>
                <p><strong>Ativar/Desativar:</strong> Lojas inativas não aparecem na tela de seleção dos colaboradores.</p>
              </div>
            </section>

            {/* SEÇÃO 3: EQUIPE */}
            <section className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2 border-slate-200">
                <Users className="text-green-500" size={20} /> 3. Equipe (Colaboradores)
              </h3>
              <Callout icon={<AlertTriangle size={17} />} color="amber">
                <strong>Pré-requisito:</strong> Cadastre os <strong>Cargos</strong> antes de adicionar colaboradores.
              </Callout>
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-sm text-slate-600">
                <p><strong>Campos obrigatórios:</strong> Nome, Loja e Cargo.</p>
                <p><strong>Campo Gestor:</strong> Associe o colaborador a um gestor para que as tarefas concluídas com observação apareçam na fila de revisão do gestor correto.</p>
                <p><strong>Filtrar:</strong> Use os seletores de Loja e Cargo no topo da lista para encontrar colaboradores rapidamente.</p>
                <p><strong>Ativar/Desativar:</strong> Colaboradores inativos não aparecem na tela de login do kiosk.</p>
              </div>
            </section>

            {/* SEÇÃO 4: CARGOS */}
            <section className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2 border-slate-200">
                <Users className="text-amber-500" size={20} /> 4. Cargos
              </h3>
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-sm text-slate-600">
                <p>Dentro do menu <UiRef>Equipe</UiRef>, alterne para a aba <UiRef>Cargos</UiRef>.</p>
                <p>Digite o nome e salve. Exemplos: <code className="bg-slate-100 px-1 rounded">Garçom</code>, <code className="bg-slate-100 px-1 rounded">Cozinheiro</code>, <code className="bg-slate-100 px-1 rounded">Gerente</code>, <code className="bg-slate-100 px-1 rounded">Barman</code>.</p>
                <p>O cargo define <strong>quem vê quais tarefas</strong> e <strong>quem é considerado gestor</strong> pelo sistema (cargos com as palavras: gerente, diretor, gestão, lider).</p>
              </div>
            </section>

            {/* SEÇÃO 5: TAREFAS */}
            <section className="space-y-5">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2 border-slate-200">
                <CheckSquare className="text-purple-500" size={20} /> 5. Modelos de Tarefa
              </h3>

              <p className="text-sm text-slate-600">
                Tarefas são os modelos que geram as atividades diárias da equipe. Há duas formas de criar:
              </p>

              {/* Duas formas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 font-bold text-purple-800 mb-2 text-sm">
                    <div className="bg-purple-600 text-white rounded-lg px-2.5 py-1 text-xs flex items-center gap-1"><Plus size={12} /> Criar Tarefa</div>
                  </div>
                  <p className="text-xs text-slate-600">Formulário direto: preencha título, loja, cargo, frequência, horário limite, foto obrigatória e rotina vinculada.</p>
                </div>
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 font-bold text-violet-800 mb-2 text-sm">
                    <div className="bg-violet-600 text-white rounded-lg px-2.5 py-1 text-xs flex items-center gap-1"><Zap size={12} /> Assistente</div>
                  </div>
                  <p className="text-xs text-slate-600">Guia passo a passo com telas dedicadas: loja → cargo → frequência → horário → foto → rotina → resumo. Ideal para novos usuários.</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-sm text-slate-600">
                <p><strong>Campos da tarefa:</strong></p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { dot: "bg-red-400", label: "Título *", desc: "Nome curto e direto" },
                    { dot: "bg-blue-400", label: "Loja *", desc: "Qual unidade" },
                    { dot: "bg-green-400", label: "Cargo *", desc: "Quem deve executar" },
                    { dot: "bg-purple-400", label: "Frequência *", desc: "Diária, Semanal, Mensal" },
                    { dot: "bg-slate-400", label: "Horário limite", desc: "Prazo do dia (HH:MM)" },
                    { dot: "bg-orange-400", label: "Dia da semana/mês", desc: "Para semanal e mensal" },
                    { icon: <Camera size={12} className="text-purple-600" />, label: "Exige foto?", desc: "Foto obrigatória na conclusão" },
                    { icon: <MessageCircle size={12} className="text-green-600" />, label: "WhatsApp?", desc: "Notificar grupo da loja" },
                    { icon: <Layers size={12} className="text-amber-600" />, label: "Rotina", desc: "Vincular a uma rotina existente" },
                  ].map((f, i) => (
                    <div key={i} className="bg-slate-50 p-2.5 rounded border border-slate-200 flex items-center gap-2">
                      {f.dot ? <span className={`w-2 h-2 rounded-full flex-shrink-0 ${f.dot}`} /> : f.icon}
                      <span><strong>{f.label}</strong> — {f.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-sm text-slate-600">
                <p className="font-bold text-slate-700">Gerando tarefas manualmente:</p>
                <p>O botão <UiRef>Gerar Tarefas de Hoje</UiRef> cria as instâncias do dia imediatamente (útil quando o cron automático das 04:00 AM não foi suficiente). Se nenhuma tarefa for gerada, aparece uma mensagem explicando o motivo (tarefas já existentes ou sem templates ativos).</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-sm text-slate-600">
                <p className="font-bold text-slate-700">Importação via CSV:</p>
                <p>Para cadastrar muitas tarefas de uma vez, toque em <UiRef icon={<Upload size={11} />}>Importar CSV</UiRef>. Baixe o modelo com as colunas: <code className="bg-slate-100 px-1 rounded text-xs">titulo, descricao, frequencia, loja, cargo, horario_limite, exige_foto, dia_semana_num, dia_mes_num, rotina</code>.</p>
              </div>
            </section>

            {/* SEÇÃO 6: ROTINAS */}
            <section className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2 border-slate-200">
                <Layers className="text-amber-500" size={20} /> 6. Rotinas
              </h3>
              <Callout icon={<AlertTriangle size={17} />} color="amber">
                <strong>Regra de Ouro:</strong> Cadastre todas as <strong>tarefas</strong> antes de criar rotinas. A rotina é um agrupador — ela organiza tarefas já existentes.
              </Callout>
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-sm text-slate-600">
                <p>Toque em <UiRef icon={<Plus size={11} />}>Nova Rotina</UiRef> e preencha:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded border"><strong>Loja</strong> — Qual unidade</div>
                  <div className="bg-slate-50 p-2.5 rounded border"><strong>Título</strong> — Ex: "Abertura"</div>
                  <div className="bg-slate-50 p-2.5 rounded border"><strong>Horário Início</strong> — Quando começa</div>
                  <div className="bg-slate-50 p-2.5 rounded border"><strong>Horário Fim</strong> — Deadline</div>
                </div>
                <p>No dropdown <UiRef>Selecionar Tarefa...</UiRef>, escolha uma tarefa e toque em adicionar. Repita para todas as tarefas da rotina. É possível reordenar e remover tarefas da lista antes de salvar.</p>
                <p>Tarefas criadas na tela de Tarefas também podem ser vinculadas a uma rotina diretamente pelo campo <strong>Rotina</strong> no formulário de criação ou edição.</p>
              </div>
            </section>

            {/* SEÇÃO 7: RELATÓRIOS */}
            <section className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2 border-slate-200">
                <BarChart3 className="text-teal-500" size={20} /> 7. Relatórios
              </h3>
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 text-sm text-slate-600">
                <p><strong>Filtros:</strong> Selecione Loja, Data Início e Data Fim, depois toque em <UiRef icon={<Search size={11} />}>Consultar</UiRef>.</p>
                <p><strong>O dashboard exibe:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>4 cards de resumo</strong> — Total, Concluídas, Pendentes, Em Revisão</li>
                  <li><strong>Taxa de Conclusão</strong> — barra de progresso com percentual</li>
                  <li><strong>Tendência Diária</strong> — gráfico de barras com % de conclusão por dia do período</li>
                  <li><strong>Colaboradores em Atenção</strong> — alerta amber para funcionários com menos de 60% de conclusão</li>
                  <li><strong>Por Rotina</strong> — tabela com taxa de conclusão por rotina</li>
                  <li><strong>Por Cargo</strong> — comparativo de eficiência entre cargos</li>
                  <li><strong>Por Funcionário</strong> — ranking com nome, cargo, total e % individual</li>
                  <li><strong>Tarefas Pendentes</strong> — lista com destaque para atrasadas</li>
                </ul>
              </div>
            </section>
          </>
        )}

      </div>
    </div>
  );
}
