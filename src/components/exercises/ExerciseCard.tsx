import { Exercise } from "@/types/exercise";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  Edit,
  ExternalLink,
  Dumbbell,
  Image as ImageIcon,
} from "lucide-react";

interface ExerciseCardProps {
  exercise: Exercise;
  showActions?: boolean;
  onEdit?: (exercise: Exercise) => void;
  onDelete?: (id: string) => void;
  selectable?: boolean;
  onSelect?: (exercise: Exercise) => void;
}

export default function ExerciseCard({
  exercise,
  showActions = false,
  onEdit,
  onDelete,
  selectable = false,
  onSelect,
}: ExerciseCardProps) {
  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect(exercise);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(exercise);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(exercise.id);
    }
  };

  return (
    <Card
      className={`overflow-hidden transition-all hover:shadow-lg ${
        selectable ? "cursor-pointer hover:border-primary" : ""
      }`}
      onClick={handleClick}
    >
      {/* ✅ Thumbnail */}
      {exercise.imagem_thumbnail ? (
        <div className="w-full h-40 overflow-hidden bg-muted">
          <img
            src={exercise.imagem_thumbnail}
            alt={exercise.nome}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-40 bg-muted flex items-center justify-center">
          <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">
              {exercise.nome}
            </CardTitle>
            <CardDescription className="mt-1 capitalize">
              {exercise.grupo_muscular?.replace("_", " ")}
            </CardDescription>
          </div>
          <Dumbbell className="w-5 h-5 text-muted-foreground shrink-0" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {exercise.descricao && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {exercise.descricao}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {exercise.equipamento && (
            <Badge variant="secondary" className="text-xs">
              {exercise.equipamento.replace("_", " ")}
            </Badge>
          )}
          {exercise.nivel_dificuldade && (
            <Badge
              variant={
                exercise.nivel_dificuldade === "iniciante"
                  ? "default"
                  : exercise.nivel_dificuldade === "intermediario"
                  ? "secondary"
                  : "destructive"
              }
              className="text-xs capitalize"
            >
              {exercise.nivel_dificuldade}
            </Badge>
          )}
        </div>

        {exercise.link_youtube && (
          <a
            href={exercise.link_youtube}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Ver demonstração
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {showActions && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleEdit}
            >
              <Edit className="w-4 h-4 mr-1" />
              Editar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Deletar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
