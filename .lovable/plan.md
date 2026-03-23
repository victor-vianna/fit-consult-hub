

## Plan: Unified Drag-and-Drop for All Workout Items

**Problem**: Currently, blocks, groups, and isolated exercises each live in separate `SortableContext` containers, and `handleUnifiedDragEnd` rejects cross-type reordering. The personal cannot interleave items like: Exercise → Block (esteira) → Exercise → Block (esteira).

**Strategy**: Merge all items into a single flat ordered list with one `SortableContext`. Use a unified `ordem` field across all item types to determine display order.

---

### Technical approach

1. **Build a unified item list** per workout day, combining exercises, groups, and blocks into one array sorted by `ordem`, each tagged with its type and prefixed ID.

2. **Single `SortableContext`** replaces the current 3-5 separate contexts. All items render in sequence based on their unified order.

3. **Remove block position sections** ("Início", "Complementar", "Finalização" separators). Blocks render inline wherever the personal drags them. The `posicao` field becomes display-only metadata (icon/badge), not a layout constraint.

4. **Rewrite `handleUnifiedDragEnd`**: Remove the same-type restriction. On drag end, compute new order indices for all items in the flat list and batch-update:
   - `exercicios.ordem` for isolated exercises
   - `exercicios.ordem` for the first exercise of each group (to position the group)
   - `blocos_treino.ordem` for blocks

5. **Normalize initial `ordem` values**: When loading items, merge all into one sorted array. If ordem values overlap across types (e.g., exercise ordem=1 and block ordem=1), re-normalize on load.

---

### Files to modify

**`src/components/TreinosManager.tsx`**
- Create `buildUnifiedList()` helper that merges `exerciciosIsolados`, `grupos`, and all `blocos` (inicio/meio/fim) into one sorted array of `{ type, id, sortableId, ordem, data }`
- Replace the 3 separate `SortableContext` blocks with a single one
- Render items in sequence using a switch on `type`
- Update `handleUnifiedDragEnd` to allow cross-type reordering and batch-update all ordem values

**`src/hooks/useWorkoutBlocks.ts`**
- Add/update `reordenarBlocos` to accept arbitrary ordem values (already supports this)

**`src/hooks/useExerciseGroups.ts`**
- Ensure `reordenarGrupos` works with arbitrary ordem values (already supports this)

**`src/hooks/useTreinos.ts`**
- Ensure `reordenarExercicios` works with arbitrary ordem values (already supports this)

---

### Rendering approach

```text
Single SortableContext:
  ├── SortableExercicioCard (ordem=1)
  ├── SortableExercicioCard (ordem=2)
  ├── SortableBlockCard     (ordem=3, esteira 3min)
  ├── SortableGroupCard     (ordem=4, biset)
  ├── SortableExercicioCard (ordem=5)
  └── SortableBlockCard     (ordem=6, esteira 3min)
```

### Impact
- Personal can freely drag blocks between exercises
- Groups (biset/triset) can be dragged to any position
- All items respect a single unified ordering
- No breaking changes to student view (WorkoutExerciseList will also need the same unified ordering)

