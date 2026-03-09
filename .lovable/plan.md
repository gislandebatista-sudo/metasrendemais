

# Plan: Goal Name Filter, Remove Rounding, Fix Ranking Calculation

## 1. Add Goal Name Filter to EmployeeFilter

**What**: Add a new dropdown/select in the filter bar that lists all unique goal names across employees. When a goal name is selected (e.g., "DNA JVM"), only employees who have that goal are shown, displaying their individual percentages for that specific goal.

**How**:
- In `Index.tsx`: Add state `selectedGoalName` and compute a list of all unique goal names from all employees' goals (macro + sectoral). Pass to `EmployeeFilter`.
- In `EmployeeFilter.tsx`: Add a new `Select` dropdown for goal name filtering, listing all available goal names.
- Filter logic in `Index.tsx`: When a goal name is selected, filter `employees` to only those who have a goal matching that name.

## 2. Remove All Rounding from Percentages

**What**: Remove `.toFixed(1)` and any rounding throughout the UI. Display exact decimal values as stored.

**Files affected**:
- `src/components/dashboard/EmployeeProfile.tsx` — Lines 186, 187, 209, 218, 359, 370, 381: Replace `.toFixed(1)` with direct value display (no rounding). Use a helper to show the raw number without trailing zeros where appropriate.
- `src/components/dashboard/RankingTable.tsx` — Line with `employee.totalPerformance.toFixed(1)`: Remove rounding.
- `src/types/employee.ts` — `calculateTotalPerformance` and `calculateGoalsPerformance`: Ensure no rounding occurs (currently they don't round, which is correct).
- Check `MainStatsCards.tsx`, `DashboardStatsCards.tsx`, `PerformanceCharts.tsx`, `ExportTab.tsx` for any `.toFixed()` calls.

**Approach**: Create a utility function `formatPercent(value: number): string` that displays the number with all its meaningful decimal places (no trailing zeros, no forced rounding). Use it everywhere percentages are displayed.

## 3. Fix Ranking Calculation Display

The calculation logic in `calculateTotalPerformance` already does a direct sum without rounding. The issue is purely in the **display** layer (`.toFixed(1)` calls). Fixing item #2 above automatically fixes this.

Verify: `75.54 + 19.24 = 94.78` — the `calculateTotalPerformance` function sums `macroSum + sectoralSum + bonus` and caps at 105. No rounding in the function itself. The fix is removing `.toFixed(1)` from the display.

## Files to Modify

1. **`src/lib/utils.ts`** — Add `formatPercent()` utility
2. **`src/components/dashboard/EmployeeFilter.tsx`** — Add goal name select dropdown
3. **`src/pages/Index.tsx`** — Add `selectedGoalName` state and filtering logic, compute available goal names, pass props
4. **`src/components/dashboard/EmployeeProfile.tsx`** — Replace all `.toFixed(1)` with `formatPercent()`
5. **`src/components/dashboard/RankingTable.tsx`** — Replace `.toFixed(1)` with `formatPercent()`
6. **`src/components/dashboard/MainStatsCards.tsx`**, **`DashboardStatsCards.tsx`**, **`PerformanceCharts.tsx`**, **`ExportTab.tsx`** — Audit and replace any rounding

