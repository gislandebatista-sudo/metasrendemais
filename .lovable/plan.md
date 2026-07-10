
# Painel Gerencial de Desempenho — Rende +

Reorganizar o atual `ExportTab` (Rende + | Relatório Completo de Desempenho) em um painel gerencial estruturado, mantendo todos os dados, filtros e opções de exportação existentes. Adicionar novos indicadores, gráficos, validações e um fluxo separado de relatório individual (um colaborador ou todos).

## Escopo do trabalho

### 1. Nova aba "Exportar" em modo painel (na tela)
Reorganizar `src/components/dashboard/ExportTab.tsx` como um painel navegável, com as seções abaixo (em ordem), reutilizando componentes existentes onde possível:

1. **Resumo executivo** — cartões com: total ativos, média, melhor, menor, contagens/percentuais por faixa (≥100 / 95–99,99 / 90–94,99 / <90), total de metas avaliadas, antecipadas, no prazo, atrasadas, não entregues, taxa geral de pontualidade.
2. **Distribuição por faixa** — gráfico de rosca (`recharts`) + tabela lateral.
3. **Ranking geral** — tabela ordenável (posição, nome, cargo, setor, desempenho total, macro, setorial, atrasadas, não entregues, %bônus, status geral). Filtros: período/mês, setor, colaborador, status colaborador, faixa de desempenho, status de metas. Destaques visuais para top 3, ≥100%, atrasadas, não entregues.
4. **Indicadores de prazo** — cartões e mini-tabela por colaborador e por setor (taxa de pontualidade, atrasos recorrentes, %antecipadas/no prazo/atrasadas/não entregues, taxa de cumprimento).
5. **Comparativo por setor** — tabela + gráfico de barras (média, melhor, menor, % macro/setorial, atrasos, não entregues, pontualidade, status geral do setor).
6. **Evolução mensal / comparação histórica** — quando existirem 2+ meses no dataset atual: gráfico de linhas (média, pontualidade, atrasos, não entregues, por setor) e cartão de variação em pontos percentuais vs. mês anterior. Sem histórico: mensagem "Não há dados históricos suficientes para realizar a comparação."
7. **Indicadores de consistência** — listas: mais aparições no Top 3, maior evolução, maior queda, atrasos recorrentes (≥2 períodos), média acumulada, melhor posição, posição média, meses consecutivos ≥100%.
8. **Alertas e validações** — área classificada em Crítico / Atenção / Informativo com todas as regras listadas (peso=0, soma≠100, sem prazo, sem responsável, vencidas sem entrega, sem status, realizado>peso sem justificativa, >100% sem bônus/regra, bônus sem motivo, divergência data/status, ativos sem metas, duplicados).

### 2. Exportação PDF gerencial
Reescrever o PDF atual usando `jspdf` + `jspdf-autotable` (adicionar dependência) para:
- Cabeçalho fixo (nome do relatório, período, filtros aplicados, data/hora).
- Uma seção por bloco acima, na mesma ordem.
- Tabelas com cabeçalho repetido, larguras controladas para caber em A4 retrato, sem cortes laterais.
- Gráficos renderizados na tela e capturados via `html2canvas` (nova dependência) para PDF em boa resolução.
- Evitar quebra ruim entre seções relacionadas (`didDrawPage`, `rowPageBreak: 'avoid'`).

### 3. Relatório individual separado
Novo botão "Relatório Individual" no `ExportTab`, com:
- Seletor de colaborador (dropdown) ou opção "Todos" (gera 1 PDF por colaborador ou um PDF único com uma seção por colaborador — usar PDF único com quebra de página por colaborador, mantendo dados+tabela do mesmo colaborador juntos).
- Conteúdo por colaborador conforme especificação: cabeçalho (posição, nome, cargo, setor, status colab., status geral, desempenho total, macro, setorial, %bônus, motivo, contagens de metas, taxa pontualidade, comparação com período anterior quando houver).
- Tabela de metas: nome, tipo (macro/setorial), peso, %realizado, diferença peso×realizado, prazo, entrega, status, observação (resumida com "..." se >120 chars), evidência (link/nome do anexo se disponível).
- Destaques visuais por status (cores + rótulo textual/ícone).

### 4. Regras de cálculo (helpers em `src/lib/reporting.ts` — novo)
Centralizar:
- `getPerformanceBand(v)` → 'excellent' | 'satisfactory' | 'attention' | 'critical' (mesmas faixas do texto).
- `getEmployeeStatus(emp)` → status geral aplicando regra da maior criticidade.
- `getPunctualityRate(emp)` e `getFulfillmentRate(emp)` conforme fórmulas.
- Considerar metas "vencidas sem entrega" como não entregues; "no prazo ainda pendentes" não contam como atraso.
- Percentuais com até 3 casas, inteiros sem decimais desnecessárias (`formatSmartPercent`).
- Respeitar filtros; nunca preencher ausência com 0 — retornar "Não informado".

### 5. O que NÃO muda
- Estrutura de dados (`Employee`, `Goal`), hooks (`useMonthlyEmployees`, etc.), tabelas do backend.
- Filtros já existentes (mês + status colaborador) — apenas adicionamos os novos.
- Cálculos existentes (`calculateTotalPerformance`, `calculateGoalsPerformance`) permanecem canônicos; novos helpers os reutilizam.
- Exportação Excel atual continua disponível (mantida como está, sem regressão).
- Nenhuma outra aba (Ranking, Colaboradores, Dashboards) é alterada.

## Detalhes técnicos

- **Novas dependências**: `jspdf-autotable`, `html2canvas`, `recharts` (já usado no projeto — reutilizar).
- **Novos arquivos**:
  - `src/lib/reporting.ts` — helpers de faixas, status geral, pontualidade, alertas, formatação.
  - `src/components/dashboard/export/ExecutiveSummary.tsx`
  - `src/components/dashboard/export/BandDistribution.tsx`
  - `src/components/dashboard/export/GeneralRanking.tsx`
  - `src/components/dashboard/export/DeadlineIndicators.tsx`
  - `src/components/dashboard/export/SectorComparison.tsx`
  - `src/components/dashboard/export/HistoricalEvolution.tsx`
  - `src/components/dashboard/export/ConsistencyIndicators.tsx`
  - `src/components/dashboard/export/AlertsPanel.tsx`
  - `src/components/dashboard/export/IndividualReportDialog.tsx`
  - `src/lib/pdf/managerialReport.ts` — geração do PDF gerencial.
  - `src/lib/pdf/individualReport.ts` — geração do PDF individual.
- **Refatorar** `ExportTab.tsx` para orquestrar as seções e disparar os dois PDFs.

## Fora de escopo

- Alterar Ranking, Dashboards, cadastro de colaboradores ou modelo de dados.
- Comparação histórica sem dados extras: apenas com meses já carregados em memória. Se necessário, um fetch adicional dos meses anteriores fica como *follow-up* (posso incluir se você confirmar).

## Confirmação
Quer que eu implemente tudo isso em um único passo? Se preferir fatiar (ex.: primeiro painel na tela + PDF gerencial, depois relatório individual), me diga.
