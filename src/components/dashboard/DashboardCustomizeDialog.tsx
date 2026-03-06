import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GripVertical } from "lucide-react";

export interface DashboardCardConfig {
  id: string;
  label: string;
  visible: boolean;
}

export const DEFAULT_CARDS: DashboardCardConfig[] = [
  { id: "meus-alunos", label: "Meus Alunos", visible: true },
  { id: "stats-grid", label: "Estatísticas Rápidas", visible: true },
  { id: "treinos-andamento", label: "Treinos em Andamento", visible: true },
  { id: "alunos-inativos", label: "Alunos Inativos", visible: true },
  { id: "feedbacks-recentes", label: "Feedbacks Recentes", visible: true },
];

function SortableItem({
  card,
  onToggle,
}: {
  card: DashboardCardConfig;
  onToggle: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto" as any,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
    >
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <Checkbox
        checked={card.visible}
        onCheckedChange={() => onToggle(card.id)}
        id={`card-${card.id}`}
      />
      <label htmlFor={`card-${card.id}`} className="text-sm font-medium flex-1 cursor-pointer">
        {card.label}
      </label>
    </div>
  );
}

interface DashboardCustomizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: DashboardCardConfig[];
  onSave: (cards: DashboardCardConfig[]) => void;
}

export function DashboardCustomizeDialog({
  open,
  onOpenChange,
  cards,
  onSave,
}: DashboardCustomizeDialogProps) {
  const [localCards, setLocalCards] = useState<DashboardCardConfig[]>(cards);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalCards((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleVisibility = (id: string) => {
    setLocalCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
    );
  };

  const handleSave = () => {
    onSave(localCards);
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalCards(DEFAULT_CARDS);
  };

  // Sync when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v) setLocalCards(cards);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Personalizar cards da Home</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Arraste para reordenar e marque/desmarque os cards que deseja exibir.
          </p>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localCards.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {localCards.map((card) => (
                <SortableItem key={card.id} card={card} onToggle={toggleVisibility} />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <DialogFooter className="flex flex-row justify-between sm:justify-between gap-2">
          <Button variant="outline" onClick={handleReset}>
            Restaurar padrão
          </Button>
          <Button onClick={handleSave}>Concluído</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
