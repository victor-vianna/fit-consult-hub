import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Exercise, GRUPOS_MUSCULARES } from "@/types/exercise";
import ExerciseCard from "./ExerciseCard";
import { Search } from "lucide-react";
import { toast } from "sonner";

interface ExercisePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

export default function ExercisePicker({
  open,
  onClose,
  onSelect,
}: ExercisePickerProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [grupoFilter, setGrupoFilter] = useState<string>("todos");

  useEffect(() => {
    if (open) {
      fetchExercises();
    }
  }, [open]);

  useEffect(() => {
    applyFilters();
  }, [exercises, searchTerm, grupoFilter]);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("exercises_library")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;
      setExercises(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar exercícios:", error);
      toast.error("Erro ao carregar exercícios");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...exercises];

    if (searchTerm) {
      filtered = filtered.filter((ex) =>
        ex.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (grupoFilter !== "todos") {
      filtered = filtered.filter((ex) => ex.grupo_muscular === grupoFilter);
    }

    setFilteredExercises(filtered);
  };

  const handleSelect = (exercise: Exercise) => {
    onSelect(exercise);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar Exercício da Biblioteca</DialogTitle>
        </DialogHeader>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={grupoFilter} onValueChange={setGrupoFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Grupo Muscular" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os grupos</SelectItem>
              {GRUPOS_MUSCULARES.map((grupo) => (
                <SelectItem key={grupo} value={grupo}>
                  {grupo.charAt(0).toUpperCase() + grupo.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lista de Exercícios */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-center py-8">Carregando...</p>
          ) : filteredExercises.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              Nenhum exercício encontrado
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  selectable
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
