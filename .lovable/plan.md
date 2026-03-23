

## Plan: Add depth to notification cards

**Problem**: Notification items blend with the dropdown background, lacking visual separation.

**Solution**: Style each notification item as a distinct card with background, border, rounded corners, and subtle shadow.

### Changes

**File: `src/components/NotificacoesDropdown.tsx`**

1. Replace the flat `div` wrapper (line 138-143) for each notification with card-like styling:
   - Add `rounded-lg border bg-card shadow-sm` for depth
   - Add `mx-2 my-1.5` for spacing between cards (instead of `border-b`)
   - Unread state: `bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800`
   - Read state: `bg-card border-border`
   - Keep hover effect: `hover:shadow-md hover:bg-accent/50`

2. Add `p-1` padding to the `ScrollArea` container to prevent card shadows from being clipped.

This gives each notification a raised card feel with clear visual boundaries, working in both light and dark modes.

