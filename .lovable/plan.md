

## Plan: Add Video Links to Block Templates

**Problem**: Block templates (mobility, stretching, warm-up, etc.) have no field for demonstration video links. Personals can't attach reference videos showing how to perform the mobility/stretching routines.

**Solution**: Add a `links` field (array of URLs) to block templates and blocks, with UI to add/view them.

### Database

Add a `links` column (JSONB array) to both `blocos_treino` and `bloco_templates` tables:

```sql
ALTER TABLE public.blocos_treino ADD COLUMN links jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.bloco_templates ADD COLUMN links jsonb DEFAULT '[]'::jsonb;
```

### Type changes

**`src/types/workoutBlocks.ts`**: Add `links?: string[]` to `BlocoTreino` interface.

**`src/hooks/useBlocoTemplates.ts`**: Add `links` to `BlocoTemplate` and `CriarBlocoTemplateInput` interfaces, propagate in mutations.

### UI changes

**`src/components/WorkoutBlockDialog.tsx`**:
- Add a "Links de referência" section in the block creation/edit form
- Simple list of URL inputs with add/remove buttons
- Persist to `links` JSONB column

**`src/components/WorkoutBlockCard.tsx`**:
- Show clickable link icons when the block has links
- Open in new tab on click

### Template propagation

When applying a template to a workout, copy `links` from template to the new block. When saving a block as template, copy its `links`.

