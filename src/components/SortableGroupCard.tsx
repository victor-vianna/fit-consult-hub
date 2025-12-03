import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GroupedExerciseCard } from "./GroupedExerciseCard";

interface GrupoExercicio {
  grupo_id: string;
  tipo_agrupamento: string;
  descanso_entre_grupos?: number | null;
  ordem?: number;
  exercicios: any[];
}

interface SortableGroupCardProps {
  grupo: GrupoExercicio;
  index: number;
  readOnly?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleConcluido?: (exercicioId: string, concluido: boolean) => Promise<any> | void;
  onToggleGrupoConcluido?: (grupoId: string, concluido: boolean) => Promise<void> | void;
}

export function SortableGroupCard({
  grupo,
  index,
  readOnly,
  onEdit,
  onDelete,
  onToggleConcluido,
  onToggleGrupoConcluido,
}: SortableGroupCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `group-${grupo.grupo_id}`,
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
      <GroupedExerciseCard
        grupo={grupo}
        index={index}
        readOnly={readOnly}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleConcluido={onToggleConcluido}
        onToggleGrupoConcluido={onToggleGrupoConcluido}
      />
    </div>
  );
}
