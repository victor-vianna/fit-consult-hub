import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Exercise,
  GRUPOS_MUSCULARES,
  EQUIPAMENTOS,
  NIVEIS_DIFICULDADE,
} from "@/types/exercise";
import ExerciseCard from "@/components/exercises/ExerciseCard";
import ExerciseModal from "@/components/exercises/ExerciseModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Filter, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { AppSidebarPersonal } from "@/components/AppSidebarPersonal";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function ExercisesLibrary() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  // ✅ NOVO: Estado para edição
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [grupoFilter, setGrupoFilter] = useState<string>("todos");
  const [equipamentoFilter, setEquipamentoFilter] = useState<string>("todos");
  const [nivelFilter, setNivelFilter] = useState<string>("todos");

  useEffect(() => {
    if (user) {
      fetchUserRole();
      fetchExercises();
    }
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    setUserRole(data?.role || "");
  };

  useEffect(() => {
    applyFilters();
  }, [exercises, searchTerm, grupoFilter, equipamentoFilter, nivelFilter]);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("exercises_library")
        .select("*")
        .order("created_at", { ascending: false });

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

    if (searchTerm)
      filtered = filtered.filter((ex) =>
        ex.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );

    if (grupoFilter !== "todos")
      filtered = filtered.filter((ex) => ex.grupo_muscular === grupoFilter);

    if (equipamentoFilter !== "todos")
      filtered = filtered.filter((ex) => ex.equipamento === equipamentoFilter);

    if (nivelFilter !== "todos")
      filtered = filtered.filter((ex) => ex.nivel_dificuldade === nivelFilter);

    setFilteredExercises(filtered);
  };

  // ✅ NOVO: Handler para abrir modal de edição
  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este exercício?")) return;

    try {
      const { error } = await supabase
        .from("exercises_library")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Exercício deletado com sucesso!");
      fetchExercises();
    } catch (error: any) {
      console.error("Erro ao deletar exercício:", error);
      toast.error("Erro ao deletar exercício");
    }
  };

  // ✅ NOVO: Handler para fechar modal e limpar estado de edição
  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingExercise(null);
  };

  // ✅ NOVO: Handler para sucesso (criar ou editar)
  const handleSuccess = () => {
    fetchExercises();
    handleCloseModal();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setGrupoFilter("todos");
    setEquipamentoFilter("todos");
    setNivelFilter("todos");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        <p>Carregando exercícios...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebarPersonal />
      <SidebarInset>
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-xl font-semibold">Biblioteca de Exercícios</h1>
            <ThemeToggle />
          </div>
        </header>

        {/* Conteúdo */}
        <div className="flex flex-1 flex-col gap-4 p-4">
          {/* Header com contador e botão */}
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">
              {filteredExercises.length} exercício(s) encontrado(s)
            </p>
            {/* Só mostra o botão para personal e admin */}
            {(userRole === "personal" || userRole === "admin") && (
              <Button
                onClick={() => {
                  setEditingExercise(null);
                  setModalOpen(true);
                }}
                className="transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Exercício
              </Button>
            )}
          </div>

          {/* Filtros */}
          <div className="bg-muted rounded-xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-lg">Filtros</h2>
              </div>
              {(searchTerm ||
                grupoFilter !== "todos" ||
                equipamentoFilter !== "todos" ||
                nivelFilter !== "todos") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={clearFilters}
                >
                  Limpar filtros
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background border-muted"
                />
              </div>

              {/* Grupo */}
              <Select value={grupoFilter} onValueChange={setGrupoFilter}>
                <SelectTrigger className="bg-background border-muted">
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

              {/* Equipamento */}
              <Select
                value={equipamentoFilter}
                onValueChange={setEquipamentoFilter}
              >
                <SelectTrigger className="bg-background border-muted">
                  <SelectValue placeholder="Equipamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos equipamentos</SelectItem>
                  {EQUIPAMENTOS.map((equip) => (
                    <SelectItem key={equip} value={equip}>
                      {equip.replace("_", " ").charAt(0).toUpperCase() +
                        equip.slice(1).replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Nível */}
              <Select value={nivelFilter} onValueChange={setNivelFilter}>
                <SelectTrigger className="bg-background border-muted">
                  <SelectValue placeholder="Nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os níveis</SelectItem>
                  {NIVEIS_DIFICULDADE.map((nivel) => (
                    <SelectItem key={nivel} value={nivel}>
                      {nivel.charAt(0).toUpperCase() + nivel.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Exercícios */}
          {filteredExercises.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">
                Nenhum exercício encontrado
              </p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  showActions={exercise.created_by === user?.id}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Modal */}
          <ExerciseModal
            open={modalOpen}
            onClose={handleCloseModal}
            onSuccess={handleSuccess}
            exercise={editingExercise}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
