
# Fix Goal Name Filtering to Show Individual Goal Percentages

## Problem
When filtering by a specific goal (e.g., "DNA JVM"), the system correctly filters employees who have that goal, but the **RankingTable still shows total performance** instead of the specific goal's percentage. Users need to see each employee's individual result for the selected goal.

## Solution

### 1. Pass filtered goal context to RankingTable
In `Index.tsx`, when `selectedGoalName !== 'all'`, compute each filtered employee's achieved percentage for that specific goal and pass it to `RankingTable` as additional context.

### 2. Update RankingTable to display goal-specific data
When a goal name filter is active:
- Sort employees by the **selected goal's achieved percentage** (not total performance)
- Display the **goal-specific percentage** instead of `totalPerformance`
- Show a subtitle indicating which goal is being viewed (e.g., "Meta: DNA JVM")

### 3. Implementation Details

**`src/pages/Index.tsx`**:
- Compute a `Map<employeeId, achievedValue>` for the selected goal name
- Pass `selectedGoalName` and the goal percentages map to `RankingTable`

**`src/components/dashboard/RankingTable.tsx`**:
- Accept optional props: `selectedGoalName` and `goalPercentages: Map<string, number>`
- When `selectedGoalName` is set (not 'all'):
  - Use goal-specific percentage for display and sorting
  - Update header to show filtered goal name
  - Show goal weight alongside achieved value

### Files to modify
1. `src/pages/Index.tsx` — compute goal-specific percentages, pass to RankingTable
2. `src/components/dashboard/RankingTable.tsx` — conditional display for goal-specific mode
