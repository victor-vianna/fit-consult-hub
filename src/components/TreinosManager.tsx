import { useState, useEffect } from "react";
import { useTreinos } from "@/hooks/useTreinos";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SemanaTreinoAtiva } from "@/components/SemanaTreinoAtiva";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Edit,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Dumbbell,
  Calendar,
  CheckCircle2,
  Circle,
  Link as LinkIcon,
  Blocks,
} from "lucide-react";
import { format, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExercicioDialog } from "@/components/ExercicioDialog";
import { SortableExercicioCard } from "@/components/SortableExercicioCard";
import { SortableGroupCard } from "@/components/SortableGroupCard";
import { SortableBlockCard } from "@/components/SortableBlockCard";
import { WorkoutTimer } from "./WorkoutTimer";
import { WorkoutDayView } from "./WorkoutDayView";
import ExercisePicker from "@/components/exercises/ExercisePicker";
import { WorkoutBlockDialog } from "./WorkoutBlockDialog";
import { WorkoutBlockCard } from "./WorkoutBlockCard";
import type { Exercise } from "@/types/exercise";
import type { Exercicio as TreinoExercicio, TreinoDia } from "@/types/treino";
import type { BlocoTreino } from "@/types/workoutBlocks";
import {
  useModelosTreino,
  type CriarModeloInput,
} from "@/hooks/useModelosTreino";
import { useModeloPastas } from "@/hooks/useModeloPastas";
import { useAplicarModelo } from "@/hooks/useAplicarModelo";
import { useBlocoTemplates } from "@/hooks/useBlocoTemplates";
import { SalvarComoModeloDialog } from "@/components/SalvarComoModeloDialog";
import { AplicarModeloDialog } from "@/components/AplicarModeloDialog";
import { ModelosTreinoList } from "@/components/ModelosTreinoList";
import { BookTemplate, FileDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import {
  GrupoExerciciosInput,
  useExerciseGroups,
} from "@/hooks/useExerciseGroups";
import { useWorkoutBlocks } from "@/hooks/useWorkoutBlocks";
import { GroupedExerciseCard } from "./GroupedExerciseCard";
import { ExerciseGroupDialog } from "./ExerciseGroupDialog";
import { toast } from "sonner";

interface TreinosManagerProps {
  profileId: string;
  personalId: string;
  readOnly?: boolean;
}

type DialogExercicio = {
  id?: string;
  nome: string;
  link_video: string;
  series: number;
  repeticoes: string;
  descanso: number;
  carga: string;
  observacoes: string;
};

const diasSemana = [
  { nome: "Segunda-feira", abrev: "SEG" },
  { nome: "Terça-feira", abrev: "TER" },
  { nome: "Quarta-feira", abrev: "QUA" },
  { nome: "Quinta-feira", abrev: "QUI" },
  { nome: "Sexta-feira", abrev: "SEX" },
  { nome: "Sábado", abrev: "SÁB" },
  { nome: "Domingo", abrev: "DOM" },
];

export function TreinosManager({
  profileId,
  personalId,
  readOnly = false,
}: TreinosManagerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    treinos,
    loading,
    adicionarExercicio,
    editarExercicio,
    removerExercicio,
    reordenarExercicios,
    editarDescricao,
    marcarExercicioConcluido,
    // Navegação de semanas
    semanaSelecionada,
    irParaSemanaAnterior,
    irParaProximaSemana,
    irParaSemanaAtual,
    isSemanaAtual,
  } = useTreinos({ profileId, personalId });

  // Buscar nome do aluno
  const { data: alunoProfile } = useQuery({
    queryKey: ["profile", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", profileId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });

  const isAluno = user?.id === profileId;
  const isPersonal = user?.id === personalId;

  // 🆕 Hook de modelos de treino
  const {
    modelos,
    loading: loadingModelos,
    criarModelo,
    deletarModelo,
    atualizarModelo,
    isCriando: isCriandoModelo,
    isAtualizando: isAtualizandoModelo,
  } = useModelosTreino({
    personalId,
    enabled: isPersonal,
  });

  // 🆕 Hook de pastas de modelos
  const {
    pastas,
    loading: loadingPastas,
    criarPasta,
    deletarPasta,
    atualizarPasta,
    moverModeloParaPasta,
  } = useModeloPastas({
    personalId,
    enabled: isPersonal,
  });

  // 🆕 Hook para aplicar modelos
  const { aplicarModelo, isAplicando } = useAplicarModelo();

  // 🆕 Hook de templates de blocos
  const { salvarBlocoComoTemplate } = useBlocoTemplates({
    personalId,
    enabled: isPersonal,
  });

  // Hook de agrupamentos
  const {
    gruposPorTreino,
    loading: loadingGrupos,
    obterGruposDoTreino,
    criarGrupo,
    deletarGrupo,
    reordenarGrupos,
    isCriando: isCriandoGrupo,
    isDeletando: isDeletandoGrupo,
  } = useExerciseGroups({
    profileId,
    personalId,
    semana: semanaSelecionada,
    enabled: true,
  });

  // 🆕 Hook de blocos
  const {
    blocosPorTreino,
    loading: loadingBlocos,
    obterBlocos,
    criarBloco,
    atualizarBloco,
    deletarBloco,
    marcarConcluido: marcarBlocoConcluido,
    reordenarBlocos,
    isCriando: isCriandoBloco,
    isDeletando: isDeletandoBloco,
  } = useWorkoutBlocks({
    profileId,
    personalId,
    semana: semanaSelecionada,
    enabled: true,
  });

  const [exercicioDialogOpen, setExercicioDialogOpen] = useState(false);
  const [editDescricaoOpen, setEditDescricaoOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedDia, setSelectedDia] = useState<number | null>(null);
  const [exercicioEditando, setExercicioEditando] =
    useState<DialogExercicio | null>(null);
  const [descricaoEditando, setDescricaoEditando] = useState("");
  const [exercicioTemp, setExercicioTemp] =
    useState<Partial<DialogExercicio> | null>(null);
  const [loadingStates, setLoadingStates] = useState({
    editando: false,
    adicionando: false,
    removendo: false,
  });

  // 🆕 Estado para abrir dialog de agrupamento e blocos
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blocoEditando, setBlocoEditando] = useState<BlocoTreino | null>(null);
  const [salvarModeloOpen, setSalvarModeloOpen] = useState(false);
  const [aplicarModeloOpen, setAplicarModeloOpen] = useState(false);
  const [modeloParaAplicar, setModeloParaAplicar] = useState<any>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 🔧 HELPER: Obter ID do treino de forma consistente (com debug)
  const getTreinoId = (treino: TreinoDia): string | null => {
    return treino.treinoId || null;
  };

  // Tipo de item para identificação no drag-and-drop unificado
  type DraggableItemType = "exercise" | "group" | "block";
  
  const parseItemId = (id: string): { type: DraggableItemType; realId: string } => {
    if (id.startsWith("group-")) {
      return { type: "group", realId: id.replace("group-", "") };
    }
    if (id.startsWith("block-")) {
      return { type: "block", realId: id.replace("block-", "") };
    }
    return { type: "exercise", realId: id };
  };

  const handleUnifiedDragEnd = async (event: DragEndEvent, dia: number) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const treino = treinos.find((t) => t.dia === dia);
    if (!treino) return;

    const treinoId = getTreinoId(treino);
    if (!treinoId) return;

    const activeItem = parseItemId(String(active.id));
    const overItem = parseItemId(String(over.id));

    // Só permite reordenar itens do mesmo tipo
    if (activeItem.type !== overItem.type) {
      toast.info("Não é possível reordenar itens de tipos diferentes");
      return;
    }

    try {
      if (activeItem.type === "exercise") {
        // Exercícios isolados
        const exerciciosIsolados = treino.exercicios.filter((ex) => !ex.grupo_id);
        const oldIndex = exerciciosIsolados.findIndex((ex) => ex.id === activeItem.realId);
        const newIndex = exerciciosIsolados.findIndex((ex) => ex.id === overItem.realId);
        if (oldIndex === -1 || newIndex === -1) return;

        const newOrder = arrayMove(exerciciosIsolados, oldIndex, newIndex);
        await reordenarExercicios(dia, newOrder);
      } else if (activeItem.type === "group") {
        // Grupos de exercícios
        const grupos = obterGruposDoTreino(treinoId);
        const oldIndex = grupos.findIndex((g) => g.grupo_id === activeItem.realId);
        const newIndex = grupos.findIndex((g) => g.grupo_id === overItem.realId);
        if (oldIndex === -1 || newIndex === -1) return;

        const newOrder = arrayMove(grupos, oldIndex, newIndex);
        const updates = newOrder.map((grupo, idx) => ({
          grupo_id: grupo.grupo_id,
          ordem: idx + 1,
        }));
        await reordenarGrupos(updates);
      } else if (activeItem.type === "block") {
        // Blocos de treino
        const blocos = obterBlocos(treinoId);
        const oldIndex = blocos.findIndex((b) => b.id === activeItem.realId);
        const newIndex = blocos.findIndex((b) => b.id === overItem.realId);
        if (oldIndex === -1 || newIndex === -1) return;

        const newOrder = arrayMove(blocos, oldIndex, newIndex);
        const updates = newOrder.map((bloco, idx) => ({
          id: bloco.id,
          ordem: idx + 1,
        }));
        await reordenarBlocos(updates);
      }
    } catch (error) {
      console.error("[TreinosManager] Erro ao reordenar:", error);
    }
  };

  const handleExerciseSelect = (exercise: Exercise) => {
    setExercicioTemp({
      nome: exercise.nome,
      link_video: exercise.link_youtube ?? "",
      series: 3,
      repeticoes: "12",
      descanso: 60,
      carga: "",
      observacoes: "",
    });
    setPickerOpen(false);
    setExercicioDialogOpen(true);
  };

  const dialogToPayload = (
    d: Omit<DialogExercicio, "id">
  ): Partial<TreinoExercicio> => {
    const cargaTrim = d.carga?.trim();
    return {
      nome: d.nome,
      link_video: d.link_video || "",
      series: d.series,
      repeticoes: d.repeticoes,
      descanso: d.descanso,
      carga: cargaTrim ? String(cargaTrim) || null : null,
      observacoes: d.observacoes || "",
    };
  };

  const treinoExToDialog = (ex: TreinoExercicio): DialogExercicio => ({
    id: ex.id,
    nome: ex.nome,
    link_video: ex.link_video ?? "",
    series: ex.series ?? 3,
    repeticoes: ex.repeticoes ?? "12",
    descanso: ex.descanso ?? 60,
    carga: ex.carga != null ? String(ex.carga) : "",
    observacoes: ex.observacoes ?? "",
  });

  const handleSaveExercicio = async (dados: Omit<DialogExercicio, "id">) => {
    const isEditing = !!exercicioEditando?.id;

    try {
      setLoadingStates((prev) => ({
        ...prev,
        [isEditing ? "editando" : "adicionando"]: true,
      }));

      const payload = dialogToPayload(dados);

      if (isEditing) {
        await editarExercicio(exercicioEditando.id!, payload);
        setExercicioEditando(null);
      } else if (selectedDia !== null) {
        await adicionarExercicio(selectedDia, payload);
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      setExercicioDialogOpen(false);
      setExercicioTemp(null);
    } catch (error) {
      console.error("[TreinosManager] Erro ao salvar:", error);
    } finally {
      setLoadingStates({
        editando: false,
        adicionando: false,
        removendo: false,
      });
    }
  };

  const handleSaveDescricao = async () => {
    if (selectedDia === null) return;

    try {
      setLoadingStates((prev) => ({ ...prev, editando: true }));
      await editarDescricao(selectedDia, descricaoEditando || null);
      setEditDescricaoOpen(false);
    } catch (error) {
      console.error("[TreinosManager] Erro ao salvar descrição:", error);
    } finally {
      setLoadingStates((prev) => ({ ...prev, editando: false }));
    }
  };

  const handleRemover = async (id: string) => {
    try {
      setLoadingStates((prev) => ({ ...prev, removendo: true }));
      await removerExercicio(id);
    } catch (error) {
      console.error("[TreinosManager] Erro ao remover:", error);
    } finally {
      setLoadingStates((prev) => ({ ...prev, removendo: false }));
    }
  };

  const calcularProgresso = (treino: TreinoDia) => {
    if (treino.exercicios.length === 0) return 0;
    const concluidos = treino.exercicios.filter((e) => e.concluido).length;
    return Math.round((concluidos / treino.exercicios.length) * 100);
  };

  // 🔧 Esta função conta TODOS os itens de treino (exercícios isolados + em grupos + blocos)
  const calcularTotalItens = (treino: TreinoDia): number => {
    const treinoId = getTreinoId(treino);
    const grupos = treinoId ? obterGruposDoTreino(treinoId) : [];
    const blocos = treinoId ? obterBlocos(treinoId) : [];

    // Exercícios isolados (não estão em nenhum grupo)
    const exerciciosIsolados = treino.exercicios.filter(
      (ex) => !ex.grupo_id
    ).length;

    // Exercícios dentro de grupos
    const exerciciosEmGrupos = grupos.reduce((total, grupo) => {
      return total + (grupo.exercicios?.length || 0);
    }, 0);

    // Blocos de treino
    const totalBlocos = blocos.length;

    return exerciciosIsolados + exerciciosEmGrupos + totalBlocos;
  };

  /**
   * Cria um treino semanal se ele não existir para o dia especificado
   * @returns O ID do treino (existente ou recém-criado)
   */
  const criarTreinoSeNecessario = async (dia: number): Promise<string> => {
    const treino = treinos.find((t) => t.dia === dia);

    // Se já existe o treinoId, retorna ele
    if (treino?.treinoId) {
      console.log(
        `[TreinosManager] Usando treino existente: ${treino.treinoId}`
      );
      return treino.treinoId;
    }

    // Se não existe, cria um novo treino semanal
    console.log(`[TreinosManager] Criando treino semanal para dia ${dia}`);

    const hoje = new Date();
    const inicioDaSemana = new Date(hoje);
    inicioDaSemana.setDate(hoje.getDate() - hoje.getDay() + 1);

    const { data, error } = await supabase
      .from("treinos_semanais")
      .insert({
        profile_id: profileId,
        personal_id: personalId,
        semana: inicioDaSemana.toISOString().split("T")[0],
        dia_semana: dia,
        concluido: false,
      })
      .select()
      .single();

    if (error) {
      console.error("[TreinosManager] Erro ao criar treino:", error);
      toast.error("Erro ao criar registro de treino");
      throw error;
    }

    console.log("[TreinosManager] Treino criado com sucesso:", data.id);

    // ✅ Recarregar os treinos após criar
    await queryClient.invalidateQueries({
      queryKey: ["treinos", profileId, personalId],
    });

    return data.id;
  };

  // 🔧 Função para salvar grupo
  const handleSaveGroup = async (grupoData: GrupoExerciciosInput) => {
    if (selectedDia === null) return;

    try {
      setLoadingStates((prev) => ({ ...prev, adicionando: true }));

      // ✅ Criar treino se não existir
      const treinoId = await criarTreinoSeNecessario(selectedDia);

      console.log("[TreinosManager] Criando grupo para treino:", treinoId);

      // 🚀 React Query automaticamente atualiza o cache e a UI
      await criarGrupo(treinoId, grupoData);

      setGroupDialogOpen(false);
    } catch (error) {
      console.error("[TreinosManager] Erro ao criar grupo:", error);
      // Toast já é exibido pelo hook
    } finally {
      setLoadingStates((prev) => ({ ...prev, adicionando: false }));
    }
  };

  // 🔧 Função para deletar grupo
  const handleDeleteGroup = async (grupoId: string) => {
    if (!grupoId) {
      toast.error("ID do grupo inválido");
      return;
    }

    try {
      setLoadingStates((prev) => ({ ...prev, removendo: true }));

      console.log("[TreinosManager] Deletando grupo:", grupoId);

      // 🚀 React Query automaticamente atualiza o cache e a UI
      await deletarGrupo(grupoId);
    } catch (err) {
      console.error("[TreinosManager] Erro ao deletar grupo:", err);
      // Toast já é exibido pelo hook
    } finally {
      setLoadingStates((prev) => ({ ...prev, removendo: false }));
    }
  };

  // 1. Adicionar função para marcar grupo completo:
  const handleToggleGrupoConcluido = async (
    grupoId: string,
    concluido: boolean
  ): Promise<void> => {
    if (!grupoId) {
      console.warn("[TreinosManager] grupoId inválido para toggle");
      return;
    }

    try {
      setLoadingStates((prev) => ({ ...prev, editando: true }));

      // ✅ Encontrar o grupo usando gruposPorTreino do React Query
      const grupoAtual = Object.values(gruposPorTreino)
        .flat()
        .find((g: any) => g.grupo_id === grupoId);

      if (!grupoAtual) {
        console.warn("[TreinosManager] Grupo não encontrado:", grupoId);
        return;
      }

      // Marcar todos os exercícios do grupo
      const promises = grupoAtual.exercicios.map((exercicio: any) =>
        marcarExercicioConcluido(exercicio.id, concluido)
      );

      await Promise.all(promises);

      // ✅ React Query invalida automaticamente, não precisa recarregar manualmente
      toast.success(
        concluido ? "Grupo marcado como concluído" : "Grupo desmarcado"
      );
    } catch (err) {
      console.error("[TreinosManager] Erro ao marcar grupo completo:", err);
      toast.error("Erro ao atualizar grupo");
    } finally {
      setLoadingStates((prev) => ({ ...prev, editando: false }));
    }
  };

  // 🆕 Função para salvar bloco
  const handleSaveBlock = async (blocoData: Partial<BlocoTreino>) => {
    if (selectedDia === null) return;

    try {
      setLoadingStates((prev) => ({ ...prev, adicionando: true }));

      // ✅ Criar treino se não existir (EXCETO se estiver editando)
      let treinoId: string;

      if (blocoEditando) {
        // Se está editando, o treino já deve existir
        const treino = treinos.find((t) => t.dia === selectedDia);
        if (!treino?.treinoId) {
          toast.error("Treino não encontrado para edição");
          return;
        }
        treinoId = treino.treinoId;
      } else {
        // Se está criando novo, cria o treino se necessário
        treinoId = await criarTreinoSeNecessario(selectedDia);
      }

      console.log("[TreinosManager] Salvando bloco para treino:", treinoId);

      // 🚀 React Query automaticamente atualiza o cache e a UI
      if (blocoEditando) {
        await atualizarBloco(blocoEditando.id, blocoData);
      } else {
        await criarBloco(treinoId, blocoData);
      }

      setBlockDialogOpen(false);
      setBlocoEditando(null);
    } catch (error) {
      console.error("[TreinosManager] Erro ao salvar bloco:", error);
      // Toast já é exibido pelo hook
    } finally {
      setLoadingStates((prev) => ({ ...prev, adicionando: false }));
    }
  };

  // 🆕 Função para deletar bloco
  const handleDeleteBlock = async (blocoId: string) => {
    if (!blocoId) {
      toast.error("ID do bloco inválido");
      return;
    }

    try {
      setLoadingStates((prev) => ({ ...prev, removendo: true }));

      console.log("[TreinosManager] Deletando bloco:", blocoId);

      // 🚀 React Query automaticamente atualiza o cache e a UI
      await deletarBloco(blocoId);
    } catch (err) {
      console.error("[TreinosManager] Erro ao deletar bloco:", err);
      // Toast já é exibido pelo hook
    } finally {
      setLoadingStates((prev) => ({ ...prev, removendo: false }));
    }
  };

  if (loading || loadingGrupos || loadingBlocos) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando treinos...</p>
      </div>
    );
  }

  // SE FOR ALUNO, RENDERIZA O NOVO COMPONENTE
  if (isAluno) {
    return (
      <WorkoutDayView
        treinos={treinos}
        profileId={profileId}
        personalId={personalId}
        gruposPorTreino={gruposPorTreino} // ✅ Usar do hook
        blocosPorTreino={blocosPorTreino} // ✅ Usar do hook
        onToggleConcluido={marcarExercicioConcluido}
        onToggleGrupoConcluido={handleToggleGrupoConcluido}
        onToggleBlocoConcluido={marcarBlocoConcluido}
      />
    );
  }

  // 🔧 Salvar treino atual como modelo
  const handleSalvarComoModelo = async (dados: {
    nome: string;
    descricao?: string;
    categoria?: string;
  }) => {
    if (selectedDia === null) return;

    const treino = treinos.find((t) => t.dia === selectedDia);
    if (!treino || treino.exercicios.length === 0) {
      toast.error("Nenhum exercício para salvar");
      return;
    }

    const treinoId = getTreinoId(treino);
    const grupos = treinoId ? obterGruposDoTreino(treinoId) : [];
    const blocos = treinoId ? obterBlocos(treinoId) : [];

    try {
      // Mapear exercícios isolados
      const exerciciosIsolados = treino.exercicios
        .filter((ex) => !ex.grupo_id)
        .map((ex, index) => ({
          nome: ex.nome,
          link_video: ex.link_video ?? undefined,
          series: ex.series ?? 3,
          repeticoes: ex.repeticoes ?? "12",
          descanso: ex.descanso ?? 60,
          carga: ex.carga ?? undefined,
          observacoes: ex.observacoes ?? undefined,
          ordem: index,
        }));

      // Mapear exercícios em grupos
      const exerciciosEmGrupos = grupos.flatMap((grupo: any) =>
        grupo.exercicios.map((ex: any) => ({
          nome: ex.nome,
          link_video: ex.link_video ?? undefined,
          series: ex.series ?? 3,
          repeticoes: ex.repeticoes ?? "12",
          descanso: ex.descanso ?? 60,
          carga: ex.carga ?? undefined,
          observacoes: ex.observacoes ?? undefined,
          ordem: ex.ordem_no_grupo ?? 0,
          grupo_id: grupo.grupo_id,
          tipo_agrupamento: grupo.tipo_agrupamento,
          ordem_no_grupo: ex.ordem_no_grupo,
          descanso_entre_grupos: grupo.descanso_entre_grupos,
        }))
      );

      // Combinar todos os exercícios
      const todosExercicios = [...exerciciosIsolados, ...exerciciosEmGrupos];

      // Mapear blocos
      const blocosMapeados = blocos.map((bloco: any, index: number) => ({
        tipo: bloco.tipo,
        nome: bloco.nome,
        duracao_estimada_minutos: bloco.duracao_estimada_minutos ?? undefined,
        intensidade: bloco.intensidade ?? undefined,
        observacoes: bloco.observacoes ?? undefined,
        posicao: bloco.posicao,
        ordem: index,
      }));

      const modeloInput: CriarModeloInput = {
        nome: dados.nome,
        descricao: dados.descricao,
        categoria: dados.categoria,
        exercicios: todosExercicios,
        blocos: blocosMapeados.length > 0 ? blocosMapeados : undefined,
      };

      await criarModelo(modeloInput);
      setSalvarModeloOpen(false);
    } catch (error) {
      console.error("Erro ao salvar modelo:", error);
    }
  };

  // 🔧 Abrir dialog para aplicar modelo
  const handleSelecionarModeloParaAplicar = (modelo: any) => {
    setModeloParaAplicar(modelo);
    setAplicarModeloOpen(true);
  };

  // 🔧 Aplicar modelo aos dias selecionados
  const handleAplicarModelo = async (diasSelecionados: number[]) => {
    if (!modeloParaAplicar) return;

    try {
      await aplicarModelo({
        modeloId: modeloParaAplicar.id,
        profileId,
        personalId,
        diasSemana: diasSelecionados,
      });

      // ✅ Aguardar um pouco para o banco processar
      await new Promise((resolve) => setTimeout(resolve, 500));

      // ✅ Forçar recarregamento de todas as queries relacionadas (com predicate para pegar todas as semanas)
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return (
              Array.isArray(key) &&
              key[0] === "treinos" &&
              key[1] === profileId &&
              key[2] === personalId
            );
          },
        }),
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return (
              Array.isArray(key) &&
              key[0] === "grupos-exercicios" &&
              key[1] === profileId &&
              key[2] === personalId
            );
          },
        }),
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return (
              Array.isArray(key) &&
              key[0] === "blocos-treino" &&
              key[1] === profileId &&
              key[2] === personalId
            );
          },
        }),
      ]);

      setAplicarModeloOpen(false);
      setModeloParaAplicar(null);

      // ✅ Mensagem de sucesso já vem do hook useAplicarModelo
    } catch (error) {
      console.error("Erro ao aplicar modelo:", error);
      toast.error("Erro ao aplicar modelo de treino");
    }
  };

  // Formatar data da semana selecionada para exibição
  const formatarSemana = () => {
    const inicio = parseISO(semanaSelecionada);
    const fim = addDays(inicio, 6);
    return `${format(inicio, "dd/MM", { locale: ptBR })} - ${format(fim, "dd/MM/yyyy", { locale: ptBR })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Dumbbell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Treinos da Semana
              </h2>
              <p className="text-sm text-muted-foreground">
                Gerencie os treinos do aluno
              </p>
            </div>
          </div>

          {/* Navegação de Semanas */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={irParaSemanaAnterior}
              title="Semana anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex flex-col items-center min-w-[140px]">
              <span className="text-sm font-medium">{formatarSemana()}</span>
              {!isSemanaAtual && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary"
                  onClick={irParaSemanaAtual}
                >
                  Ir para semana atual
                </Button>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={irParaProximaSemana}
              title="Próxima semana"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Controle de Semana Ativa */}
          {isPersonal && !readOnly && alunoProfile && (
            <SemanaTreinoAtiva
              profileId={profileId}
              personalId={personalId}
              alunoNome={alunoProfile.nome}
            />
          )}
        </div>
      </div>

      <Separator />

      {/* 🆕 TABS: Treinos da Semana | Modelos */}
      <Tabs defaultValue="treinos" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="treinos" className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Treinos da Semana
          </TabsTrigger>
          <TabsTrigger value="modelos" className="flex items-center gap-2">
            <BookTemplate className="h-4 w-4" />
            Meus Modelos
            {modelos.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {modelos.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ============ ABA: TREINOS DA SEMANA ============ */}
        <TabsContent value="treinos" className="space-y-6 mt-6">
          {/* Treinos Grid */}
          <div className="grid grid-cols-7 gap-2">
            {treinos.map((treino: TreinoDia) => {
              const diaInfo = diasSemana[treino.dia - 1];
              const temExercicios = treino.exercicios.length > 0;
              const treinoId = getTreinoId(treino);
              const grupos = treinoId ? obterGruposDoTreino(treinoId) : [];
              const blocos = treinoId ? obterBlocos(treinoId) : [];
              const temConteudo =
                temExercicios || blocos.length > 0 || grupos.length > 0;
              const totalItens = calcularTotalItens(treino);

              return (
                <button
                  key={treino.dia}
                  onClick={() => setSelectedDia(treino.dia)}
                  className={cn(
                    "relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary",
                    selectedDia === treino.dia
                      ? "border-primary bg-primary/5"
                      : "border-border",
                    !temConteudo && "opacity-50"
                  )}
                >
                  <span className="text-xs font-medium text-muted-foreground mb-1">
                    {diaInfo.abrev}
                  </span>
                  {temConteudo && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                      {totalItens}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Conteúdo do dia selecionado */}
          {selectedDia !== null &&
            (() => {
              const treino = treinos.find((t) => t.dia === selectedDia);
              if (!treino) return null;

              const progresso = calcularProgresso(treino);
              const diaInfo = diasSemana[treino.dia - 1];
              const temExercicios = treino.exercicios.length > 0;

              const treinoId = getTreinoId(treino);
              const grupos = treinoId ? obterGruposDoTreino(treinoId) : [];
              const blocos = treinoId ? obterBlocos(treinoId) : [];
              const temBlocos = blocos.length > 0;

              const blocosInicio = blocos.filter((b) => b.posicao === "inicio");
              const blocosMeio = blocos.filter((b) => b.posicao === "meio");
              const blocosFim = blocos.filter((b) => b.posicao === "fim");

              const exerciciosIsolados = treino.exercicios.filter(
                (ex) => !ex.grupo_id
              );

              return (
                <Collapsible
                  key={treino.dia}
                  defaultOpen={true}
                  className="group"
                >
                  <Card
                    className={cn(
                      "transition-all duration-200 hover:shadow-md",
                      (temExercicios || temBlocos) && "border-primary/20"
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-4">
                        <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left group/trigger">
                          <ChevronDown className="h-5 w-5 transition-transform shrink-0 text-muted-foreground group-data-[state=open]/trigger:rotate-180 group-hover/trigger:text-primary" />

                          <div className="flex items-center gap-3 flex-1">
                            <Badge
                              variant={
                                temExercicios || temBlocos
                                  ? "default"
                                  : "outline"
                              }
                              className="font-mono text-xs px-2 py-1"
                            >
                              {diaInfo.abrev}
                            </Badge>

                            <div className="flex-1">
                              <CardTitle className="text-lg font-semibold">
                                {diaInfo.nome}
                              </CardTitle>

                              {treino.descricao && (
                                <CardDescription className="text-sm mt-1 flex items-center gap-2">
                                  <Calendar className="h-3 w-3" />
                                  {treino.descricao}
                                </CardDescription>
                              )}

                              <div className="flex items-center gap-3 mt-2">
                                {(temExercicios || temBlocos) && (
                                  <>
                                    {temExercicios && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Dumbbell className="h-3 w-3" />
                                        {(() => {
                                          const totalItens =
                                            calcularTotalItens(treino);
                                          return `${totalItens} item${
                                            totalItens !== 1 ? "ns" : ""
                                          }`;
                                        })()}
                                      </span>
                                    )}

                                    {grupos.length > 0 && (
                                      <span className="text-xs text-blue-600 flex items-center gap-1">
                                        <LinkIcon className="h-3 w-3" />
                                        {grupos.length} grupo
                                        {grupos.length !== 1 ? "s" : ""}
                                      </span>
                                    )}

                                    {blocos.length > 0 && (
                                      <span className="text-xs text-purple-600 flex items-center gap-1">
                                        <Blocks className="h-3 w-3" />
                                        {blocos.length} bloco
                                        {blocos.length !== 1 ? "s" : ""}
                                      </span>
                                    )}

                                    {progresso > 0 && (
                                      <span className="text-xs text-primary flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        {progresso}% concluído
                                      </span>
                                    )}
                                  </>
                                )}

                                {!temExercicios && !temBlocos && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Circle className="h-3 w-3" />
                                    Sem conteúdo
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        {!readOnly && isPersonal && (
                          <div className="flex flex-wrap gap-1 sm:gap-2 justify-end">
                            {/* Botão principal: Adicionar Exercício */}
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExercicioTemp(null);
                                setExercicioEditando(null);
                                setExercicioDialogOpen(true);
                              }}
                              disabled={loadingStates.adicionando}
                              className="gap-1"
                            >
                              {loadingStates.adicionando ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="h-4 w-4" />
                                  <span className="hidden sm:inline">Exercício</span>
                                </>
                              )}
                            </Button>

                            {/* Botão Bloco */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBlocoEditando(null);
                                setBlockDialogOpen(true);
                              }}
                              disabled={
                                isCriandoBloco || loadingStates.adicionando
                              }
                              className="gap-1"
                            >
                              {(isCriandoBloco ||
                                loadingStates.adicionando) && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              )}
                              <Blocks className="h-4 w-4" />
                              <span className="hidden sm:inline">Bloco</span>
                            </Button>

                            {/* Botão Editar Descrição */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDescricaoEditando(treino.descricao ?? "");
                                setEditDescricaoOpen(true);
                              }}
                              disabled={loadingStates.editando}
                              className="gap-1"
                            >
                              {loadingStates.editando ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Edit className="h-4 w-4" />
                                  <span className="hidden sm:inline">Descrição</span>
                                </>
                              )}
                            </Button>

                            {/* Botão Salvar como Modelo - apenas desktop */}
                            {(temExercicios ||
                              temBlocos ||
                              grupos.length > 0) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSalvarModeloOpen(true);
                                }}
                                disabled={isCriandoModelo}
                                className="hidden sm:flex gap-1"
                              >
                                {isCriandoModelo && (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                <FileDown className="h-4 w-4" />
                                <span>Salvar Modelo</span>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        {!temExercicios && !temBlocos && grupos.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                            <div className="p-3 bg-muted rounded-full">
                              <Dumbbell className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Nenhum conteúdo cadastrado
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Adicione exercícios, grupos ou blocos para o
                                aluno
                              </p>
                            </div>
                          </div>
                        ) : (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(event) =>
                              handleUnifiedDragEnd(event, treino.dia)
                            }
                          >
                            <div className="space-y-4">
                              {blocosInicio.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Separator className="flex-1" />
                                    <span>Início do Treino</span>
                                    <Separator className="flex-1" />
                                  </div>
                                  <SortableContext
                                    items={blocosInicio.map((b) => `block-${b.id}`)}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    {blocosInicio.map((bloco, idx) => (
                                      <SortableBlockCard
                                        key={bloco.id}
                                        bloco={bloco}
                                        index={idx}
                                        readOnly={readOnly}
                                        onEdit={
                                          isPersonal
                                            ? () => {
                                                setBlocoEditando(bloco);
                                                setBlockDialogOpen(true);
                                              }
                                            : undefined
                                        }
                                        onDelete={
                                          isPersonal
                                            ? () => handleDeleteBlock(bloco.id)
                                            : undefined
                                        }
                                        onToggleConcluido={
                                          isAluno
                                            ? (blocoId, concluido) =>
                                                marcarBlocoConcluido(
                                                  blocoId,
                                                  concluido
                                                )
                                            : undefined
                                        }
                                        onSaveAsTemplate={
                                          isPersonal
                                            ? salvarBlocoComoTemplate
                                            : undefined
                                        }
                                      />
                                    ))}
                                  </SortableContext>
                                </div>
                              )}

                              <div className="space-y-3">
                                {grupos.length > 0 && (
                                  <SortableContext
                                    items={grupos.map((g: any) => `group-${g.grupo_id}`)}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    {grupos.map((grupo: any, idx: number) => (
                                      <SortableGroupCard
                                        key={grupo.grupo_id ?? `grupo-${idx}`}
                                        grupo={grupo}
                                        index={idx}
                                        readOnly={readOnly}
                                        onEdit={
                                          isPersonal
                                            ? () => {
                                                console.log(
                                                  "[TreinosManager] Editar grupo:",
                                                  grupo.grupo_id
                                                );
                                              }
                                            : undefined
                                        }
                                        onDelete={
                                          isPersonal
                                            ? () => {
                                                if (grupo.grupo_id) {
                                                  handleDeleteGroup(grupo.grupo_id);
                                                }
                                              }
                                            : undefined
                                        }
                                      />
                                    ))}
                                  </SortableContext>
                                )}

                                {exerciciosIsolados.length > 0 && (
                                  <SortableContext
                                    items={exerciciosIsolados.map((ex) => ex.id)}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    <div className="space-y-2">
                                      {exerciciosIsolados.map(
                                        (exercicio, index) => {
                                          const cardEx = {
                                            id: exercicio.id,
                                            nome: exercicio.nome,
                                            link_video:
                                              exercicio.link_video ?? null,
                                            ordem: exercicio.ordem,
                                            series: exercicio.series,
                                            repeticoes: exercicio.repeticoes,
                                            descanso: exercicio.descanso,
                                            carga:
                                              exercicio.carga != null
                                                ? String(exercicio.carga)
                                                : undefined,
                                            observacoes:
                                              exercicio.observacoes ??
                                              undefined,
                                            concluido: !!exercicio.concluido,
                                          };

                                          return (
                                            <SortableExercicioCard
                                              key={exercicio.id}
                                              exercicio={cardEx}
                                              index={index}
                                              readOnly={readOnly}
                                              onEdit={() => {
                                                setExercicioEditando(
                                                  treinoExToDialog(exercicio)
                                                );
                                                setExercicioDialogOpen(true);
                                              }}
                                              onDelete={handleRemover}
                                            />
                                          );
                                        }
                                      )}
                                    </div>
                                  </SortableContext>
                                )}
                              </div>

                              {blocosMeio.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Separator className="flex-1" />
                                    <span>Complementar</span>
                                    <Separator className="flex-1" />
                                  </div>
                                  <SortableContext
                                    items={blocosMeio.map((b) => `block-${b.id}`)}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    {blocosMeio.map((bloco, idx) => (
                                      <SortableBlockCard
                                        key={bloco.id}
                                        bloco={bloco}
                                        index={idx}
                                        readOnly={readOnly}
                                        onEdit={
                                          isPersonal
                                            ? () => {
                                                setBlocoEditando(bloco);
                                                setBlockDialogOpen(true);
                                              }
                                            : undefined
                                        }
                                        onDelete={
                                          isPersonal
                                            ? () => handleDeleteBlock(bloco.id)
                                            : undefined
                                        }
                                        onToggleConcluido={
                                          isAluno
                                            ? (blocoId, concluido) =>
                                                marcarBlocoConcluido(
                                                  blocoId,
                                                  concluido
                                                )
                                            : undefined
                                        }
                                        onSaveAsTemplate={
                                          isPersonal
                                            ? salvarBlocoComoTemplate
                                            : undefined
                                        }
                                      />
                                    ))}
                                  </SortableContext>
                                </div>
                              )}

                              {blocosFim.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Separator className="flex-1" />
                                    <span>Finalização</span>
                                    <Separator className="flex-1" />
                                  </div>
                                  <SortableContext
                                    items={blocosFim.map((b) => `block-${b.id}`)}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    {blocosFim.map((bloco, idx) => (
                                      <SortableBlockCard
                                        key={bloco.id}
                                        bloco={bloco}
                                        index={idx}
                                        readOnly={readOnly}
                                        onEdit={
                                          isPersonal
                                            ? () => {
                                                setBlocoEditando(bloco);
                                                setBlockDialogOpen(true);
                                              }
                                            : undefined
                                        }
                                        onDelete={
                                          isPersonal
                                            ? () => handleDeleteBlock(bloco.id)
                                            : undefined
                                        }
                                        onToggleConcluido={
                                          isAluno
                                            ? (blocoId, concluido) =>
                                                marcarBlocoConcluido(
                                                  blocoId,
                                                  concluido
                                                )
                                            : undefined
                                        }
                                        onSaveAsTemplate={
                                          isPersonal
                                            ? salvarBlocoComoTemplate
                                            : undefined
                                        }
                                      />
                                    ))}
                                  </SortableContext>
                                </div>
                              )}
                            </div>
                          </DndContext>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })()}
        </TabsContent>

        {/* ============ ABA: MEUS MODELOS ============ */}
        <TabsContent value="modelos" className="space-y-6 mt-6">
          <ModelosTreinoList
            modelos={modelos}
            pastas={pastas}
            loading={loadingModelos || loadingPastas}
            onAplicar={handleSelecionarModeloParaAplicar}
            onDeletar={deletarModelo}
            onCriarPasta={async (nome) => {
              await criarPasta({ nome });
            }}
            onDeletarPasta={deletarPasta}
            onRenomearPasta={async (pastaId, nome) => {
              await atualizarPasta(pastaId, { nome });
            }}
            onMoverModelo={moverModeloParaPasta}
            onAtualizarModelo={atualizarModelo}
            isAtualizando={isAtualizandoModelo}
          />
        </TabsContent>
      </Tabs>

      {/* ============ DIALOGS ============ */}
      <>
        <ExercicioDialog
          open={exercicioDialogOpen}
          onOpenChange={(open) => {
            setExercicioDialogOpen(open);
            if (!open) {
              setExercicioEditando(null);
              setExercicioTemp(null);
            }
          }}
          exercicio={(exercicioEditando ?? exercicioTemp ?? null) as any}
          onSave={handleSaveExercicio}
          diaNome={
            selectedDia !== null ? diasSemana[selectedDia - 1].nome : undefined
          }
        />

        <Dialog open={editDescricaoOpen} onOpenChange={setEditDescricaoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Grupo Muscular</DialogTitle>
              <DialogDescription>
                Defina o grupo muscular para{" "}
                {selectedDia !== null && diasSemana[selectedDia - 1].nome}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="descricao">Grupo Muscular</Label>
                <Input
                  id="descricao"
                  value={descricaoEditando}
                  onChange={(e) => setDescricaoEditando(e.target.value)}
                  placeholder="Ex: Peito e Ombro, Pernas, Costas e Bíceps..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDescricaoOpen(false)}
                disabled={loadingStates.editando}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveDescricao}
                disabled={loadingStates.editando}
              >
                {loadingStates.editando && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ExercisePicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handleExerciseSelect}
        />

        {/* DIALOG DE AGRUPAMENTO */}
        <ExerciseGroupDialog
          open={groupDialogOpen}
          onOpenChange={setGroupDialogOpen}
          onSave={handleSaveGroup}
          diaNome={
            selectedDia !== null ? diasSemana[selectedDia - 1].nome : undefined
          }
        />

        {/* DIALOG DE BLOCOS */}
        <WorkoutBlockDialog
          open={blockDialogOpen}
          onOpenChange={(open) => {
            setBlockDialogOpen(open);
            if (!open) setBlocoEditando(null);
          }}
          onSave={handleSaveBlock}
          blocoEditando={blocoEditando}
          diaNome={
            selectedDia !== null ? diasSemana[selectedDia - 1].nome : undefined
          }
          personalId={personalId}
        />

        {/* 🆕 DIALOG: Salvar como Modelo */}
        <SalvarComoModeloDialog
          open={salvarModeloOpen}
          onOpenChange={setSalvarModeloOpen}
          onSave={handleSalvarComoModelo}
          loading={isCriandoModelo}
        />

        {/* 🆕 DIALOG: Aplicar Modelo */}
        <AplicarModeloDialog
          open={aplicarModeloOpen}
          onOpenChange={setAplicarModeloOpen}
          modelo={modeloParaAplicar}
          onAplicar={handleAplicarModelo}
          loading={isAplicando}
        />
      </>
    </div>
  );
}

export default TreinosManager;
