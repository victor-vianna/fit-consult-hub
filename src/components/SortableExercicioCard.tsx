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
  onToggleConcluido?: (id: string, concluido: boolean) => void;
}

export function SortableExercicioCard({
  exercicio,
  index,
  readOnly,
  onEdit,
  onDelete,
  onToggleConcluido,
}: SortableExercicioCardProps) {
  // ✅ Hook que torna o item arrastável
  const {
    attributes, // Atributos de acessibilidade
    listeners, // Event listeners para drag (onMouseDown, onTouchStart, etc)
    setNodeRef, // Ref para o elemento DOM
    transform, // Transformação CSS durante o drag
    transition, // Transição CSS suave
    isDragging, // Boolean se está sendo arrastado
  } = useSortable({
    id: exercicio.id, // ID único do item
  });

  // ✅ Estilo que aplica a transformação durante o drag
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Reduzir opacidade enquanto arrasta
    opacity: isDragging ? 0.5 : 1,
    // Aumentar z-index para ficar acima dos outros
    zIndex: isDragging ? 1000 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* 
        ✅ Passamos os listeners para o ExercicioCard
        Ele aplicará no ícone de GripVertical
      */}
      <ExercicioCard
        exercicio={exercicio}
        index={index}
        readOnly={readOnly}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleConcluido={onToggleConcluido}
        dragListeners={listeners}
        dragAttributes={attributes}
      />
    </div>
  );
}
