
# 📘 NIILU – DESIGN SYSTEM & STYLE GUIDE

Versão: 1.0
Stack: React (Web + Mobile WebApp) + Supabase
Arquitetura: Multi-tenant (multi-loja) com RBAC

---

# 1. PRINCÍPIOS ESTRUTURAIS

## 1.1 Público

* Operacional: cozinheiro, garçom, recepcionista (uso majoritário mobile)
* Gestão: gerente de loja (mobile + web)
* Owner / Diretor: visão consolidada (preferência web)

## 1.2 Princípios UX

1. Mobile-first obrigatório
2. Uma ação primária por tela
3. Feedback imediato para toda ação
4. Redução máxima de fricção cognitiva
5. Sistema previsível (consistência > criatividade)
6. Linguagem simples e objetiva
7. Interface amigável, mas profissional

---

# 2. BRAND IDENTITY

## 2.1 Personalidade da Marca

Niilu é:

* Organizado
* Confiável
* Colaborativo
* Calmo
* Operacionalmente eficiente

Não é:

* Infantil
* Exageradamente corporativo
* Visualmente poluído

Tom visual: inspirado em apps como iFood (clareza operacional, foco em ação).

---

# 3. COLOR SYSTEM

## 3.1 Cor Primária

Verde Floresta (Primary 500)

HEX: #1F4D3A
RGB: 31, 77, 58

Uso:

* Botões primários
* Header
* Elementos ativos
* Indicadores de progresso

---

## 3.2 Escala de Verde

Primary 700 – #16392B
Primary 600 – #1A4331
Primary 500 – #1F4D3A
Primary 400 – #2F6B52
Primary 300 – #4A8F73
Primary 100 – #E7F3EE

---

## 3.3 Cores Funcionais

Success – #2E7D32
Warning – #F4B400
Postpone – #EF6C00
Error – #C62828
Info – #1976D2

Neutros:

Gray 900 – #1A1A1A
Gray 700 – #4A4A4A
Gray 500 – #8A8A8A
Gray 300 – #D9D9D9
Gray 100 – #F5F5F5
White – #FFFFFF

---

## 3.4 Regras de Contraste

* Texto normal mínimo 4.5:1
* Botões primários sempre texto branco
* Nunca usar verde claro como fundo para texto pequeno

---

# 4. TYPOGRAPHY

## 4.1 Fonte Base

Primary: Inter
Fallback: system-ui, Roboto, SF Pro

---

## 4.2 Escala Tipográfica

H1 – 24px / 600
H2 – 20px / 600
H3 – 18px / 600
Body Large – 16px / 400
Body – 14px / 400
Caption – 12px / 500

Line height:

* Títulos: 1.3
* Corpo: 1.5

---

# 5. SPACING SYSTEM

Base: múltiplos de 8px

4px – micro
8px – mínimo
16px – padrão
24px – bloco
32px – seção

Border radius padrão: 8px
Cards grandes: 12px

---

# 6. COMPONENT LIBRARY

---

## 6.1 Buttons

### PrimaryButton

Altura: 48px
Border radius: 8px
Background: Primary 500
Text: White
Full width no mobile

Estados:

* Hover: Primary 600
* Active: Primary 700
* Disabled: opacity 0.4
* Loading: spinner central

Uso:

* Concluir
* Salvar
* Criar

---

### SecondaryButton

Background: White
Border: 1px Primary 500
Text: Primary 500

Uso:

* Editar
* Postergar

---

### TextButton

Sem fundo
Text: Gray 700

Uso:

* Cancelar
* Voltar

---

## 6.2 Cards

Background: White
Border radius: 12px
Shadow leve:

box-shadow: 0 2px 6px rgba(0,0,0,0.06);

Padding interno: 16px

---

## 6.3 Status Badge

Padding: 4px 8px
Font-size: 12px
Border radius: 999px

Concluído → fundo verde claro + texto verde escuro
Pendente → fundo amarelo claro
Postergado → fundo laranja claro
Cancelado → fundo vermelho claro

---

## 6.4 Progress Bar

Altura: 8px
Background: Gray 300
Fill: Primary 500
Border radius: 999px

Sempre exibir percentual textual junto.

---

# 7. LAYOUT STRUCTURE

---

## 7.1 Mobile Layout Base

Estrutura:

Header fixo
Conteúdo scrollável
CTA fixo inferior (quando necessário)

Safe area padding obrigatório (iOS)

---

## 7.2 Web Layout (Gerente / Owner)

Estrutura:

Sidebar esquerda (colapsável)
Header superior
Área principal com cards e tabelas

Sidebar largura: 240px

---

# 8. USER FLOWS

---

## 8.1 Funcionário

Login
→ Tela Home
→ Lista de tarefas do dia
→ Concluir tarefa
→ Feedback visual
→ Atualização automática do progresso

---

## 8.2 Gerente

Login
→ Dashboard da loja
→ Filtro por função
→ Visualizar checklist
→ Editar templates
→ Ver histórico

---

## 8.3 Owner

Login
→ Dashboard multi-loja
→ Ranking por loja
→ Filtro por período
→ Exportação

---

# 9. GAMIFICATION (FUTURO)

Diretrizes para implementação futura:

* Barra de desempenho semanal
* Medalhas discretas (não infantis)
* Ranking interno opcional
* Pontuação por consistência
* Sem exposição pública constrangedora

Gamificação deve reforçar:
Consistência > Competição

---

# 10. FEEDBACK & MICROINTERACTIONS

Duração máxima animação: 300ms

Concluir tarefa:

* Checkbox anima
* Tarefa fade-out leve
* Progresso atualiza suavemente

Erro:

* Vibração leve (mobile)
* Mensagem clara e objetiva

---

# 11. ICONOGRAPHY

Estilo:

* Outline
* Simples
* Sem excesso de detalhe

Biblioteca recomendada:
Lucide ou Heroicons

Ícone sempre acompanhado de texto.

---

# 12. ACCESS CONTROL (UI Rules)

Operacional:

* Não visualiza outras funções
* Não acessa relatórios globais

Gerente:

* Pode editar templates
* Pode ver todos da loja

Owner:

* Visão global
* Acesso leitura total

Interface deve esconder elementos não autorizados (não apenas desabilitar).

---

# 13. EMPTY STATES

Sempre incluir:

Ícone simples
Texto curto
Ação clara

Exemplo:

“Nenhuma tarefa pendente agora.”
Botão: Ver histórico

---

# 14. ERROR STATES

Nunca usar mensagens técnicas.

Errado:
“Supabase connection error”

Correto:
“Não foi possível carregar os dados. Tente novamente.”

---

# 15. DATA VISUALIZATION

Para Web:

* Gráficos simples (barra e linha)
* Nunca usar mais de 4 cores simultâneas
* Verde como padrão positivo

---

# 16. SUPABASE + REACT UI GUIDELINES

* Loading skeletons obrigatórios
* Otimistic UI para conclusão de tarefa
* Atualização via subscription realtime
* Fallback visual caso conexão caia
* Toast notifications para sucesso

---

# 17. RESPONSIVE BREAKPOINTS

Mobile: até 768px
Tablet: 768–1024px
Desktop: acima 1024px

---

# 18. PERFORMANCE UX

Tempo ideal de resposta visual:
< 200ms feedback
< 1s carregamento parcial
< 2s carregamento completo

---

# 19. COPY GUIDELINES

Frases curtas
Verbos diretos
Sem formalidade excessiva

Exemplos:

“Concluir tarefa”
“Editar lista”
“Postergar para amanhã”

Nunca usar:
“Efetuar validação da checklist”

---

# 20. FUTURA EVOLUÇÃO (OFFLINE)

Estrutura deve prever:

* Estado “modo offline”
* Badge indicativo
* Sync automático posterior
* Indicador visual de dados pendentes

Não implementar agora, mas preparar arquitetura visual.

---

# 21. DESIGN TOKENS (JSON READY)

Estrutura base para exportação:

{
"colorPrimary": "#1F4D3A",
"colorSuccess": "#2E7D32",
"colorWarning": "#F4B400",
"colorError": "#C62828",
"fontFamily": "Inter",
"borderRadius": "8px",
"spacingUnit": "8px",
"buttonHeight": "48px"
}
