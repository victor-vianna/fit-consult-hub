import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { WorkoutBlockCard } from "./WorkoutBlockCard";
import type { BlocoTreino } from "@/types/workoutBlocks";

interface SortableBlockCardProps {
  bloco: BlocoTreino;
  index: number;
  readOnly?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleConcluido?: (id: string, concluido: boolean) => void;
}

export function SortableBlockCard({
  bloco,
  index,
  readOnly,
  onEdit,
  onDelete,
  onToggleConcluido,
}: SortableBlockCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `block-${bloco.id}`,
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style} {...(readOnly ? {} : { ...attributes, ...listeners })}>
      <WorkoutBlockCard
        bloco={bloco}
        index={index}
        readOnly={readOnly}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleConcluido={onToggleConcluido}
      />
    </div>
  );
}
