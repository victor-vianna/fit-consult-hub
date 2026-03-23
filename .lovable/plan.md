

## Plan: Add Period Filter to Feedback Evolution Charts

**Problem**: The chart always shows all check-ins with no way to filter by time period.

**Solution**: Add period selector tabs (4 weeks, 3 months, 6 months, 1 year, All) above the chart that filters `chartData` client-side.

### Changes

**File: `src/components/FeedbackEvolucaoChart.tsx`**

1. Add a `period` state with options: `"4sem"`, `"3m"`, `"6m"`, `"1a"`, `"todos"`
2. Add a row of period selector buttons/tabs between the title and the metric badges
3. Filter `chartData` in the `useMemo` based on selected period using `data_inicio` field (already present in checkins) compared against `subWeeks`/`subMonths` from `date-fns`
4. The comparison card should also use the filtered data (last 2 of the filtered set)

**UI**: Small toggle group or tabs styled inline, e.g.:
`[4 sem] [3 meses] [6 meses] [1 ano] [Todos]`

**Also apply to `EvolucaoSection`** (`src/components/avaliacao/EvolucaoSection.tsx`) for consistency — same period filter on the physical assessment evolution chart.

No database changes needed — purely client-side filtering.

