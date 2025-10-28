import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Youtube, Dumbbell, TrendingUp } from "lucide-react";
import { Exercise } from "@/types/exercise";

interface ExerciseCardProps {
  exercise: Exercise;
  onSelect?: (exercise: Exercise) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
  selectable?: boolean;
}

export default function ExerciseCard({
  exercise,
  onSelect,
  onDelete,
  showActions = false,
  selectable = false,
}: ExerciseCardProps) {
  const thumbnailUrl = exercise.imagem_thumbnail
    ? `${
        import.meta.env.VITE_SUPABASE_URL
      }/storage/v1/object/public/exercise-thumbnails/${
        exercise.imagem_thumbnail
      }`
    : "https://via.placeholder.com/300x200?text=Sem+Imagem";

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <img
          src={thumbnailUrl}
          alt={exercise.nome}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src =
              "https://via.placeholder.com/300x200?text=Erro+ao+Carregar";
          }}
        />
        {exercise.is_global && (
          <Badge className="absolute top-2 right-2 bg-blue-500">Global</Badge>
        )}
      </div>

      <CardHeader>
        <CardTitle className="text-lg">{exercise.nome}</CardTitle>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline">{exercise.grupo_muscular}</Badge>
          {exercise.equipamento && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Dumbbell className="w-3 h-3" />
              {exercise.equipamento}
            </Badge>
          )}
          {exercise.nivel_dificuldade && (
            <Badge
              variant="secondary"
              className={`flex items-center gap-1 ${
                exercise.nivel_dificuldade === "iniciante"
                  ? "bg-green-100 text-green-800"
                  : exercise.nivel_dificuldade === "intermediario"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              {exercise.nivel_dificuldade}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {exercise.descricao && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {exercise.descricao}
          </p>
        )}

        <div className="flex gap-2 flex-wrap">
          {exercise.link_youtube && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(exercise.link_youtube, "_blank")}
            >
              <Youtube className="w-4 h-4 mr-1" />
              Vídeo
            </Button>
          )}

          {selectable && onSelect && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onSelect(exercise)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          )}

          {showActions && onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(exercise.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
