## Diagnóstico

**1. Caracteres estranhos no PDF (`Ø<ßÆ`, `+P`)**
No `ExportTab.tsx` linha 198, o ranking usa emojis (`🏆` e `⭐`) dentro de `doc.text()`. A fonte padrão do jsPDF (Helvetica) **não suporta emojis Unicode** — por isso eles aparecem como caracteres latinos corrompidos (`Ø<ßÆ` = 🏆, `+P` = ⭐). O mesmo afeta acentos em alguns casos.

**2. Falta filtro de status na exportação**
Atualmente o `ExportTab.tsx` filtra apenas por mês. Não há filtro para escolher entre colaboradores Ativos, Inativos ou Todos.

## Mudanças propostas

### A) Adicionar filtro de Status em `src/components/dashboard/ExportTab.tsx`

- Novo `useState` `selectedStatus` com valores: `all` | `active` | `inactive` (default `active`, já que normalmente queremos só os ativos no relatório).
- Novo `<Select>` ao lado do seletor de mês com as opções: "Todos", "Apenas Ativos", "Apenas Inativos".
- Atualizar `filteredEmployees` para também aplicar o filtro de status antes de gerar PDF/Excel.
- Incluir o status escolhido no nome do arquivo exportado e no cabeçalho do PDF (ex.: "Período: Outubro | Status: Apenas Ativos").

### B) Corrigir ranking do PDF

Substituir os emojis por marcadores textuais compatíveis com a fonte do PDF:
- 1º–3º lugar: prefixo `[TOP 3]`
- 4º–10º lugar: prefixo `[TOP 10]`
- demais: sem prefixo

Linha alvo (≈198–204): trocar
```
const rankBadge = index < 3 ? '🏆' : index < 10 ? '⭐' : '';
doc.text(`${index + 1}º ${rankBadge} ${emp.name} - ${emp.sector}`, 15, yPos);
```
por uma versão sem emojis e usando cores já existentes (laranja para top 3, cinza para os demais) para manter o destaque visual sem depender de glifos especiais.

### C) Garantir suporte a acentos no jsPDF

Habilitar UTF-8 explicitamente ao criar o documento (`new jsPDF({ putOnlyUsedFonts: true })` + uso consistente de strings em UTF-8) — a fonte Helvetica padrão já cobre acentos latinos, então isso resolve o ranking sem precisar embutir fonte custom.

## Resultado esperado

- Tela de Exportar passa a ter dois filtros: **Mês** e **Status do Colaborador**.
- PDF exibe o ranking com nomes legíveis (ex.: `1º [TOP 3] GISLANDE MUNIZ BATISTA - SST   104,97%`) sem caracteres corrompidos.
- Excel respeita o mesmo filtro de status.

## Fora do escopo

- Não altero a página de ranking principal (apenas o relatório exportado).
- Não embuto fonte custom no PDF (mantemos Helvetica + texto ASCII para os badges).