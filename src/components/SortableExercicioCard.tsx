// components/SortableExercicioCard.tsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExercicioCard } from "./ExercicioCard";

interface Exercicio {
  id: string;
  nome: string;
  link_video: string | null;
  ordem: number;
  series: number;
  repeticoes: string;
  descanso: number;
  carga?: string;
  observacoes?: string;
  concluido: boolean;
}

interface SortableExercicioCardProps {
  exercicio: Exercicio;
  index: number;
  readOnly?: boolean;
  onEdit?: (exercicio: Exercicio) => void;
  onDelete?: (id: string) => void;
  onToggleConcluido?: (id: string, concluido: boolean) => Promise<any> | void;
  onOptimisticToggle?: (id: string, concluido: boolean) => void;
}

export function SortableExercicioCard({
  exercicio,
  index,
  readOnly,
  onEdit,
  onDelete,
  onToggleConcluido,
  onOptimisticToggle,
}: SortableExercicioCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: exercicio.id,
    disabled: readOnly, // ✅ Desabilita drag quando readOnly
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ExercicioCard
        exercicio={exercicio}
        index={index}
        readOnly={readOnly}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleConcluido={onToggleConcluido}
        onOptimisticToggle={onOptimisticToggle}
        dragListeners={readOnly ? undefined : listeners} // ✅ Remove listeners quando readOnly
        dragAttributes={readOnly ? undefined : attributes} // ✅ Remove attributes quando readOnly
      />
    </div>
  );
}
