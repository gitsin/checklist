import { useState } from "react";
import {
  BookOpen, CheckSquare, Camera, AlertTriangle,
  ShieldCheck, Settings, Users, Store, Layers,
  ArrowLeft, FileText, CheckCircle, Lock, Eye,
  BarChart3, Smartphone, MousePointer, ArrowRight,
  XCircle, CornerUpLeft, Clock, MessageCircle,
  Plus, Trash2, Upload, Search, Calendar, ChevronRight
} from "lucide-react";

/* ─── sub-component: "mock button" visual ─── */
function MockBtn({ children, color = "bg-blue-600", className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${color} text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm select-none ${className}`}>
      {children}
    </span>
  );
}

/* ─── sub-component: UI highlight callout ─── */
function UiRef({ children, icon }) {
  return (
    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded border border-slate-300 whitespace-nowrap align-middle">
      {icon && <span className="text-slate-400">{icon}</span>}
      {children}
    </span>
  );
}

/* ─── sub-component: numbered step ─── */
function Step({ n, title, children }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow">{n}</div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-slate-800 mb-1">{title}</h4>
        <div className="text-sm text-slate-600 space-y-2">{children}</div>
      </div>
    </div>
  );
}

/* ─── sub-component: visual card mock  ─── */
function MockCard({ children, border = "border-slate-200", bg = "bg-white" }) {
  return (
    <div className={`${bg} ${border} border rounded-xl p-3 text-center text-xs font-bold text-slate-500 shadow-sm select-none`}>
      {children}
    </div>
  );
}

/* ─── sub-component: status badge explaining task colors ─── */
function StatusBadge({ color, label, desc }) {
  return (
    <div className="flex items-center gap-3 bg-white p-3 rounded-lg border">
      <span className={`w-4 h-4 rounded-full ${color} flex-shrink-0 ring-2 ring-offset-1 ${color.replace('bg-', 'ring-')}`} />
      <div>
        <span className="font-bold text-slate-800 text-sm">{label}</span>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

/* ================================================ */
/*              COMPONENTE PRINCIPAL                 */
/* ================================================ */
export default function UserManual({ onExit }) {
  const [activeTab, setActiveTab] = useState("operador");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">

      {/* ═══════════ HEADER ═══════════ */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BookOpen className="text-blue-600" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-800">Manual Niilu</h1>
          </div>
          <button onClick={onExit} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 font-bold text-sm min-h-[44px]">
            <ArrowLeft size={18} /> Voltar
          </button>
        </div>

        {/* TABS */}
        <div className="max-w-4xl mx-auto px-3 sm:px-4 flex gap-4 sm:gap-6 overflow-x-auto scrollbar-hide">
          {[
            { id: "operador", label: "Operador", icon: <CheckSquare size={16} />, accent: "blue" },
            { id: "gestor", label: "Gestor", icon: <ShieldCheck size={16} />, accent: "purple" },
            { id: "admin", label: "Admin", icon: <Settings size={16} />, accent: "slate" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 border-b-2 font-bold flex items-center gap-2 whitespace-nowrap transition-colors text-sm ${activeTab === tab.id
                  ? `border-${tab.accent}-600 text-${tab.accent}-600`
                  : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-3 sm:p-6 animate-fade-in">

        {/* ═══════════════════════════════════════ */}
        {/*          TAB: OPERADOR                  */}
        {/* ═══════════════════════════════════════ */}
        {activeTab === "operador" && (
          <div className="space-y-8">

            {/* Intro */}
            <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
              <h2 className="text-xl font-bold text-blue-800 mb-1">Manual do Operador</h2>
              <p className="text-blue-600 text-sm">Passo a passo para o dia a dia: como entrar, executar tarefas e registrar problemas.</p>
            </div>

            {/* ── SEÇÃO 1: Acesso ── */}
            <section className="space-y-5">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2">
                <Smartphone className="text-blue-500" /> 1. Entrando no Sistema
              </h3>

              <Step n={1} title="Escolha a sua loja">
                <p>
                  A tela inicial mostra cards coloridos com o nome de cada unidade.
                  Toque no card da loja onde você está trabalhando hoje.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <MockCard border="border-blue-400" bg="bg-blue-50">
                    <Store size={20} className="mx-auto mb-1 text-blue-500" />
                    Barley Rio
                  </MockCard>
                  <MockCard border="border-emerald-400" bg="bg-emerald-50">
                    <Store size={20} className="mx-auto mb-1 text-emerald-500" />
                    DK São Paulo
                  </MockCard>
                </div>
              </Step>

              <Step n={2} title="Selecione seu nome">
                <p>
                  Após escolher a loja, aparece a lista de colaboradores daquela unidade.
                  Toque no <strong>card com seu nome e cargo</strong> para entrar.
                </p>
                <div className="flex items-center gap-2 bg-slate-100 p-3 rounded-lg mt-2 text-xs">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">J</div>
                  <div className="text-left">
                    <span className="font-bold text-slate-800">João Silva</span>
                    <span className="block text-slate-400 text-[10px] uppercase">Garçom</span>
                  </div>
                  <ChevronRight size={16} className="ml-auto text-slate-300" />
                </div>
              </Step>

              <Step n={3} title="Navegue pelas rotinas">
                <p>
                  Dentro da sua área você verá <strong>abas no topo</strong> com os nomes das rotinas
                  (ex: <UiRef>☀ Abertura</UiRef>, <UiRef>🌙 Fechamento</UiRef>).
                  Toque na aba para ver as tarefas daquele período.
                </p>
              </Step>
            </section>

            {/* ── SEÇÃO 2: Executando Tarefas ── */}
            <section className="space-y-5">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2">
                <CheckSquare className="text-green-500" /> 2. Executando Tarefas
              </h3>

              <p className="text-sm text-slate-600">
                Cada tarefa aparece como um card. No canto inferior do card você encontra até <strong>3 botões</strong>:
              </p>

              {/* Botão Concluir */}
              <div className="bg-green-50 p-4 rounded-xl border border-green-200 space-y-2">
                <div className="flex items-center gap-2">
                  <MockBtn color="bg-green-600"><CheckCircle size={14} /> Concluir</MockBtn>
                  <span className="text-sm font-bold text-green-700">— Tarefa feita!</span>
                </div>
                <p className="text-sm text-slate-600">
                  Toque em <strong>Concluir</strong> quando terminar a tarefa. O card muda para
                  <span className="inline-block w-3 h-3 rounded-full bg-amber-400 mx-1 align-middle" /> <strong>amarelo</strong> (Aguardando Aprovação do Gestor).
                </p>
              </div>

              {/* Tarefa com Foto */}
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-2">
                <div className="flex items-center gap-2">
                  <MockBtn color="bg-purple-600"><Camera size={14} /> Tirar Foto</MockBtn>
                  <span className="text-sm font-bold text-purple-700">— Tarefa com evidência</span>
                </div>
                <p className="text-sm text-slate-600">
                  Tarefas que mostram o ícone <Camera size={14} className="inline text-purple-500" /> exigem
                  uma foto como prova. Toque em <strong>"Tirar Foto"</strong>, capture a imagem e confirme.
                  Só depois o botão <strong>Concluir</strong> ficará disponível.
                </p>
              </div>

              {/* Botão Depois */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-2">
                <div className="flex items-center gap-2">
                  <MockBtn color="bg-blue-500"><Clock size={14} /> Depois</MockBtn>
                  <span className="text-sm font-bold text-blue-700">— Pular por enquanto</span>
                </div>
                <p className="text-sm text-slate-600">
                  Se precisar fazer outra coisa antes, toque em <strong>Depois</strong>.
                  A tarefa volta para a lista e continua pendente (vermelha).
                </p>
              </div>

              {/* Botão Cancelar */}
              <div className="bg-red-50 p-4 rounded-xl border border-red-200 space-y-2">
                <div className="flex items-center gap-2">
                  <MockBtn color="bg-red-500"><XCircle size={14} /> Cancelar</MockBtn>
                  <span className="text-sm font-bold text-red-700">— Não é possível realizar</span>
                </div>
                <p className="text-sm text-slate-600">
                  Se não for possível cumprir a tarefa (ex: "Faltou produto de limpeza"),
                  toque em <strong>Cancelar</strong>. Será obrigatório digitar uma <strong>justificativa</strong> no
                  campo de texto que aparece. O gerente verá a justificativa.
                </p>
              </div>
            </section>

            {/* ── SEÇÃO 3: Entendendo as cores ── */}
            <section className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2">
                <Eye className="text-slate-500" /> 3. Significado das Cores
              </h3>
              <p className="text-sm text-slate-600 mb-3">Cada card de tarefa muda de cor conforme o andamento:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <StatusBadge color="bg-red-500" label="Vermelha — Pendente" desc="Tarefa não iniciada. Aguardando você." />
                <StatusBadge color="bg-amber-400" label="Amarela — Em Revisão" desc="Você concluiu, aguardando aprovação do gestor." />
                <StatusBadge color="bg-green-500" label="Verde — Aprovada" desc="Gestor aprovou. Tudo certo!" />
                <StatusBadge color="bg-orange-500" label="Laranja — Devolvida" desc="Gestor pediu para refazer. Corrija e envie novamente." />
                <StatusBadge color="bg-slate-400" label="Cinza — Cancelada" desc="Você cancelou com justificativa." />
              </div>
            </section>

            {/* ── Dicas ── */}
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-sm text-amber-800 flex gap-3">
              <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <strong>Dica:</strong> Tarefas <strong>devolvidas</strong> (laranja) aparecem novamente na sua lista.
                Corrija o que o gestor apontou e toque em <strong>Concluir</strong> de novo.
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/*           TAB: GESTOR                   */}
        {/* ═══════════════════════════════════════ */}
        {activeTab === "gestor" && (
          <div className="space-y-8">

            <div className="bg-purple-50 p-5 rounded-xl border border-purple-100">
              <h2 className="text-xl font-bold text-purple-800 mb-1">Manual do Gestor</h2>
              <p className="text-purple-600 text-sm">Revisão de qualidade, aprovação de tarefas e acompanhamento da equipe.</p>
            </div>

            {/* ── SEÇÃO 1: Acesso do Gestor ── */}
            <section className="space-y-5">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2">
                <Users className="text-purple-500" /> 1. Acessando como Gestor
              </h3>

              <Step n={1} title="Faça login com seu nome">
                <p>
                  O gestor entra da mesma forma que o operador: escolhe a <strong>loja</strong> e depois
                  seleciona seu <strong>nome</strong> na lista. O sistema reconhece automaticamente
                  que seu cargo é de gestão.
                </p>
              </Step>

              <Step n={2} title="Aba de Revisão">
                <p>
                  Dentro do painel de tarefas, você verá uma aba especial:
                  <UiRef icon={<ShieldCheck size={12} />}>Em Revisão</UiRef>.
                  Nela ficam todas as tarefas que os operadores marcaram como concluídas,
                  aguardando sua validação.
                </p>
              </Step>
            </section>

            {/* ── SEÇÃO 2: Aprovando / Devolvendo ── */}
            <section className="space-y-5">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2">
                <CheckCircle className="text-green-500" /> 2. Aprovando e Devolvendo Tarefas
              </h3>

              <p className="text-sm text-slate-600">
                Ao abrir uma tarefa em revisão, dois botões aparecerão:
              </p>

              {/* Aprovar */}
              <div className="bg-green-50 p-4 rounded-xl border border-green-200 space-y-2">
                <div className="flex items-center gap-2">
                  <MockBtn color="bg-green-600"><CheckCircle size={14} /> Aprovar</MockBtn>
                </div>
                <p className="text-sm text-slate-600">
                  Toque em <strong>Aprovar</strong> quando o trabalho estiver satisfatório.
                  O card muda para <span className="inline-block w-3 h-3 rounded-full bg-green-500 mx-1 align-middle" /> <strong>verde</strong> e
                  sai da fila de pendências. Se a tarefa tem foto, você pode verificar a imagem antes de aprovar.
                </p>
              </div>

              {/* Devolver */}
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 space-y-2">
                <div className="flex items-center gap-2">
                  <MockBtn color="bg-orange-500"><CornerUpLeft size={14} /> Devolver</MockBtn>
                </div>
                <p className="text-sm text-slate-600">
                  Se a foto estiver ruim ou o trabalho foi mal feito, toque em <strong>Devolver</strong>.
                  Um campo de <strong>observação</strong> aparecerá — escreva o que precisa ser corrigido.
                  A tarefa volta para o funcionário em
                  <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mx-1 align-middle" /> <strong>laranja</strong>.
                </p>
              </div>

              {/* Fluxo visual */}
              <div className="bg-white p-4 rounded-xl border shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase mb-3">Fluxo de vida de uma tarefa</p>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded">Pendente</span>
                  <ArrowRight size={14} className="text-slate-300" />
                  <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded">Em Revisão</span>
                  <ArrowRight size={14} className="text-slate-300" />
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded">Aprovada ✓</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold mt-2 ml-0 sm:ml-[140px]">
                  <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded">Em Revisão</span>
                  <ArrowRight size={14} className="text-slate-300" />
                  <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">Devolvida ↩</span>
                  <ArrowRight size={14} className="text-slate-300" />
                  <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded">Re-enviada</span>
                  <ArrowRight size={14} className="text-slate-300" />
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded">Aprovada ✓</span>
                </div>
              </div>
            </section>

            {/* ── SEÇÃO 3: Relatórios ── */}
            <section className="space-y-5">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2">
                <BarChart3 className="text-teal-500" /> 3. Dashboard de Relatórios
              </h3>

              <Step n={1} title="Acesse a Administração">
                <p>
                  Na tela inicial, toque em <UiRef icon={<Lock size={12} />}>Acesso Admin</UiRef> no rodapé.
                  Digite a senha <strong>1234</strong> e confirme.
                </p>
              </Step>

              <Step n={2} title='Toque em "Relatórios"'>
                <p>
                  No menu principal da Administração, toque no card <UiRef icon={<BarChart3 size={12} />}>Relatórios</UiRef>.
                </p>
              </Step>

              <Step n={3} title="Filtre por loja e período">
                <p>
                  Selecione a <strong>Loja</strong>, escolha <strong>Data Início</strong> e <strong>Data Fim</strong>,
                  e toque em <MockBtn color="bg-teal-600"><Search size={12} /> Consultar</MockBtn>.
                </p>
              </Step>

              <Step n={4} title="Leia os indicadores">
                <p>O dashboard mostra:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li><strong>Cards de resumo</strong> — Total, Concluídas, Pendentes, Em Revisão, Devolvidas, Canceladas</li>
                  <li><strong>Barra de progresso</strong> — % de conclusão com cores por status</li>
                  <li><strong>Eficiência por cargo</strong> — Barras comparativas</li>
                  <li><strong>Ranking de funcionários</strong> — Tabela com % individual</li>
                  <li><strong>Tarefas pendentes/atrasadas</strong> — Lista com destaque em vermelho</li>
                </ul>
              </Step>
            </section>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/*          TAB: ADMINISTRADOR              */}
        {/* ═══════════════════════════════════════ */}
        {activeTab === "admin" && (
          <div className="space-y-8">

            <div className="bg-slate-100 p-5 rounded-xl border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-1">Manual do Administrador</h2>
              <p className="text-slate-600 text-sm">Configuração completa: lojas, equipe, tarefas, rotinas e relatórios.</p>
            </div>

            {/* ── Acesso Admin ── */}
            <section className="space-y-5">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2">
                <Lock className="text-slate-500" /> 1. Acessando a Administração
              </h3>

              <Step n={1} title="Botão Acesso Admin">
                <p>
                  Na tela inicial (seleção de lojas), role até o rodapé e toque em
                  <UiRef icon={<Lock size={12} />}>Acesso Admin</UiRef>.
                </p>
              </Step>

              <Step n={2} title="Digite a senha">
                <p>
                  Uma janela aparecerá pedindo a <strong>senha de administrador</strong>.
                  Digite <code className="bg-slate-200 px-1.5 py-0.5 rounded text-sm font-mono">1234</code> e
                  toque em <MockBtn color="bg-blue-600">Entrar</MockBtn>.
                </p>
              </Step>

              <Step n={3} title="Menu principal">
                <p>Você verá 6 opções no menu:</p>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <MockCard><Store size={18} className="mx-auto mb-1 text-blue-500" />Lojas</MockCard>
                  <MockCard><Users size={18} className="mx-auto mb-1 text-green-500" />Equipe</MockCard>
                  <MockCard><Users size={18} className="mx-auto mb-1 text-amber-500" />Cargos</MockCard>
                  <MockCard><CheckSquare size={18} className="mx-auto mb-1 text-purple-500" />Tarefas</MockCard>
                  <MockCard><Layers size={18} className="mx-auto mb-1 text-amber-600" />Rotinas</MockCard>
                  <MockCard><BarChart3 size={18} className="mx-auto mb-1 text-teal-500" />Relatórios</MockCard>
                </div>
              </Step>
            </section>

            {/* ── LOJAS ── */}
            <section className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2">
                <Store className="text-blue-500" /> 2. Lojas
              </h3>

              <div className="bg-white p-4 rounded-xl border space-y-3">
                <p className="text-sm text-slate-600">
                  <strong>Criar loja:</strong> No topo, preencha os campos
                  <UiRef>Nome da Loja</UiRef> e <UiRef>Código</UiRef>,
                  depois toque em <MockBtn color="bg-blue-600"><Plus size={12} /> Criar</MockBtn>.
                </p>
                <p className="text-sm text-slate-600">
                  <strong>Editar loja:</strong> Toque no botão <MockBtn color="bg-slate-600">Editar</MockBtn> no card da loja.
                  Um modal abrirá com os campos para alterar nome, código e configurações de WhatsApp.
                </p>
                <p className="text-sm text-slate-600">
                  <strong>WhatsApp:</strong> Dentro do modal de edição, preencha o campo
                  <UiRef icon={<MessageCircle size={12} />}>ID do Grupo WhatsApp</UiRef> para
                  receber notificações automáticas naquele grupo.
                </p>
                <p className="text-sm text-slate-600">
                  <strong>Ativar/Desativar:</strong> Use o botão <MockBtn color="bg-green-600">Ativa</MockBtn> /
                  <MockBtn color="bg-red-500" className="ml-1">Inativa</MockBtn> para controlar
                  se a loja aparece na tela de seleção do operador.
                </p>
              </div>
            </section>

            {/* ── EQUIPE ── */}
            <section className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2">
                <Users className="text-green-500" /> 3. Equipe (Colaboradores)
              </h3>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-sm text-amber-800 flex gap-2">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <span><strong>Pré-requisito:</strong> Cadastre primeiro os <strong>Cargos</strong> antes de adicionar colaboradores.</span>
              </div>

              <div className="bg-white p-4 rounded-xl border space-y-3">
                <p className="text-sm text-slate-600">
                  <strong>Aba "Funcionários":</strong> Toque em <MockBtn color="bg-green-600"><Plus size={12} /> Novo Colaborador</MockBtn>
                  para abrir o formulário.
                </p>
                <p className="text-sm text-slate-600">
                  <strong>Campos obrigatórios:</strong>
                  <UiRef>Nome</UiRef>, <UiRef>Loja</UiRef> (selecione no dropdown) e
                  <UiRef>Cargo</UiRef> (selecione no dropdown).
                </p>
                <p className="text-sm text-slate-600">
                  <strong>Filtrar:</strong> Use os dropdowns <UiRef>Filtrar por Loja</UiRef> e
                  <UiRef>Filtrar por Cargo</UiRef> acima da lista para encontrar funcionários rapidamente.
                </p>
                <p className="text-sm text-slate-600">
                  <strong>Editar/Excluir:</strong> Cada card de funcionário tem os botões
                  <MockBtn color="bg-blue-600" className="mx-1">Editar</MockBtn> e
                  <MockBtn color="bg-red-500"><Trash2 size={12} /></MockBtn>.
                </p>
              </div>
            </section>

            {/* ── CARGOS ── */}
            <section className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2">
                <Users className="text-amber-500" /> 4. Cargos
              </h3>

              <div className="bg-white p-4 rounded-xl border space-y-3">
                <p className="text-sm text-slate-600">
                  <strong>Aba "Cargos":</strong> Dentro do menu <UiRef>Equipe</UiRef>, alterne para a aba
                  <UiRef>Cargos</UiRef> no topo.
                </p>
                <p className="text-sm text-slate-600">
                  <strong>Criar cargo:</strong> Digite o nome no campo <UiRef>Nome do novo cargo</UiRef> e
                  toque em <MockBtn color="bg-blue-600"><Plus size={12} /> Criar</MockBtn>.
                </p>
                <p className="text-sm text-slate-600">
                  Exemplos: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">Garçom</code>,
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs ml-1">Cozinheiro</code>,
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs ml-1">Gerente</code>,
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs ml-1">Barman</code>.
                </p>
              </div>
            </section>

            {/* ── TAREFAS ── */}
            <section className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2">
                <CheckSquare className="text-purple-500" /> 5. Modelos de Tarefa
              </h3>

              <div className="bg-white p-4 rounded-xl border space-y-3">
                <p className="text-sm text-slate-600">
                  Toque em <MockBtn color="bg-blue-600"><Plus size={12} /> Nova Tarefa</MockBtn> para abrir o formulário.
                </p>
                <p className="text-sm text-slate-600"><strong>Campos do formulário:</strong></p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded border flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400" /> <strong>Título</strong> — Nome curto e direto
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded border flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" /> <strong>Loja</strong> — A qual unidade pertence
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded border flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400" /> <strong>Cargo</strong> — Quem deve executar
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded border flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400" /> <strong>Frequência</strong> — Diária ou Semanal
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded border flex items-center gap-2">
                    <Camera size={14} className="text-purple-500" /> <strong>Exige Foto?</strong> — Checkbox
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded border flex items-center gap-2">
                    <MessageCircle size={14} className="text-green-500" /> <strong>WhatsApp?</strong> — Notificar grupo
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  <strong>Importar CSV:</strong> Para cadastrar muitas tarefas de uma vez, toque em
                  <MockBtn color="bg-green-600"><Upload size={12} /> Importar CSV</MockBtn>.
                  O arquivo deve ter as colunas: título, descrição, loja, cargo, frequência.
                </p>
              </div>
            </section>

            {/* ── ROTINAS ── */}
            <section className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2">
                <Layers className="text-amber-500" /> 6. Rotinas (Agrupador de Tarefas)
              </h3>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-sm text-amber-800 flex gap-2">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <span><strong>Regra de Ouro:</strong> Cadastre todas as <strong>tarefas</strong> antes de criar rotinas. A rotina é apenas um agrupador.</span>
              </div>

              <div className="bg-white p-4 rounded-xl border space-y-3">
                <p className="text-sm text-slate-600">
                  Toque em <MockBtn color="bg-amber-600"><Plus size={12} /> Nova Rotina</MockBtn>.
                </p>
                <p className="text-sm text-slate-600"><strong>Preencha:</strong></p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded border"><strong>Loja</strong> — Selecione a unidade</div>
                  <div className="bg-slate-50 p-2.5 rounded border"><strong>Título</strong> — Ex: "Abertura da Loja"</div>
                  <div className="bg-slate-50 p-2.5 rounded border"><strong>Horário Início</strong> — Quando começa</div>
                  <div className="bg-slate-50 p-2.5 rounded border"><strong>Horário Fim</strong> — Deadline</div>
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  <strong>Adicionar tarefas:</strong> No dropdown <UiRef>Selecionar Tarefa...</UiRef>,
                  escolha uma tarefa e toque em <MockBtn color="bg-slate-800"><Plus size={12} /></MockBtn>.
                  Repita para todas as tarefas desejadas. A lista aparece abaixo com opção de remover
                  <Trash2 size={12} className="inline text-red-400 ml-1" />.
                </p>
                <p className="text-sm text-slate-600">
                  <strong>WhatsApp:</strong> Marque <UiRef icon={<MessageCircle size={12} />}>Notificar via WhatsApp</UiRef> para
                  que a rotina envie alertas ao grupo da loja.
                </p>
                <p className="text-sm text-slate-600">
                  Toque em <MockBtn color="bg-amber-600">Salvar</MockBtn> para finalizar.
                </p>
              </div>
            </section>

            {/* ── RELATÓRIOS ── */}
            <section className="space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2">
                <BarChart3 className="text-teal-500" /> 7. Dashboard de Relatórios
              </h3>

              <div className="bg-white p-4 rounded-xl border space-y-3">
                <p className="text-sm text-slate-600">
                  No menu, toque em <UiRef icon={<BarChart3 size={12} />}>Relatórios</UiRef>.
                </p>
                <p className="text-sm text-slate-600">
                  <strong>Filtros:</strong> Selecione <UiRef icon={<Store size={12} />}>Loja</UiRef>,
                  <UiRef icon={<Calendar size={12} />}>Data Início</UiRef> e
                  <UiRef icon={<Calendar size={12} />}>Data Fim</UiRef>,
                  depois toque em <MockBtn color="bg-teal-600"><Search size={12} /> Consultar</MockBtn>.
                </p>
                <p className="text-sm text-slate-600"><strong>O dashboard exibe:</strong></p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
                  <li><strong>6 cards</strong> com totais: Total, Concluídas, Pendentes, em Revisão, Devolvidas, Canceladas</li>
                  <li><strong>Barra de progresso</strong> com % de conclusão e legenda colorida</li>
                  <li><strong>Eficiência por Cargo</strong> — barras comparativas por função</li>
                  <li><strong>Desempenho por Funcionário</strong> — tabela rankeada com nome, cargo, tarefas e %</li>
                  <li><strong>Tarefas Pendentes</strong> — lista com destaque para atrasadas (pulsando em vermelho)</li>
                </ul>
              </div>
            </section>

            {/* Dica final */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-sm text-blue-800 flex gap-3">
              <FileText size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <strong>Ordem recomendada de cadastro:</strong><br />
                1️⃣ Cargos → 2️⃣ Lojas → 3️⃣ Colaboradores → 4️⃣ Tarefas → 5️⃣ Rotinas
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}