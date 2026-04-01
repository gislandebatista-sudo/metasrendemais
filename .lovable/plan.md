

# Aumentar Pop-up de Edição + Otimizar Salvamento

## 1. Aumentar tamanho do modal

**Arquivo:** `src/components/dashboard/EmployeeModal.tsx` (linha 633)

Alterar `max-w-3xl` para `max-w-6xl` e usar layout em grid de 2 colunas para dados básicos e metas lado a lado, eliminando scroll horizontal.

```tsx
<DialogContent className="w-[96vw] max-w-6xl max-h-[90vh] overflow-y-auto">
```

## 2. Otimizar velocidade do salvamento

**Arquivo:** `src/hooks/useMonthlyEmployees.tsx` — função `saveEmployee`

Problemas atuais:
- Linhas 215-227: Loop `for...of` atualiza cada goal sequencialmente (1 query por meta)
- Linha 313: `fetchEmployees()` recarrega tudo do zero após salvar

Correções:
- Substituir loop sequencial por batch updates usando `Promise.all`
- Atualizar estado local diretamente após salvar em vez de chamar `fetchEmployees()`

```typescript
// Antes: sequential
for (const goal of goalsToUpdate) {
  await supabase.from('goals').update({...}).eq('id', goal.id);
}

// Depois: parallel
await Promise.all(goalsToUpdate.map(goal =>
  supabase.from('goals').update({...}).eq('id', goal.id)
));

// Depois do save: atualizar estado local em vez de refetch completo
setEmployees(prev => prev.map(e => e.id === employeeId ? updatedEmployee : e));
```

## Arquivos a Modificar

1. **`src/components/dashboard/EmployeeModal.tsx`** — largura do DialogContent
2. **`src/hooks/useMonthlyEmployees.tsx`** — paralelizar updates + evitar refetch

