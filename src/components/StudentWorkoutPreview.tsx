import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Dumbbell,
  ExternalLink,
  Layers3,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TIPOS_BLOCO, formatarDuracao } from "@/types/workoutBlocks";

type PreviewItemType = "exercise" | "group" | "block";

export interface StudentWorkoutPreviewItem {
  sortableId: string;
  type: PreviewItemType;
  ordem: number;
  data: any;
}

interface StudentWorkoutPreviewProps {
  items: StudentWorkoutPreviewItem[];
  diaNome?: string;
  treinoNome?: string | null;
  className?: string;
}

function getExerciseSummary(exercicio: any) {
  if (exercicio?.series) {
    return `${exercicio.series}x${exercicio.repeticoes || "-"}`;
  }

  return exercicio?.repeticoes || "Prescrição";
}

function formatCarga(carga: unknown) {
  if (carga == null) return null;
  const value = String(carga).trim();
  return value ? value : null;
}

function getBlockDuration(bloco: any) {
  return (
    bloco?.config_cardio?.duracao_minutos ??
    bloco?.config_alongamento?.duracao_minutos ??
    bloco?.config_aquecimento?.duracao_minutos ??
    bloco?.duracao_estimada_minutos ??
    null
  );
}

function PreviewCheck({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-muted-foreground hover:text-primary"
      aria-label={checked ? "Desmarcar na prévia" : "Marcar na prévia"}
    >
      {checked ? (
        <CheckCircle2 className="h-5 w-5 text-green-600" />
      ) : (
        <Circle className="h-5 w-5" />
      )}
    </button>
  );
}

function PreviewExerciseCard({
  exercicio,
  index,
  checked,
  onToggle,
  nested = false,
}: {
  exercicio: any;
  index: number;
  checked: boolean;
  onToggle: () => void;
  nested?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const carga = formatCarga(exercicio?.carga);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => setExpanded((value) => !value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpanded((value) => !value);
        }
      }}
      className={cn(
        "overflow-hidden border bg-background/70 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked && "border-green-500/40 bg-green-950/10",
        nested && "rounded-lg"
      )}
    >
      <CardContent className="p-3">
        <div className="flex min-h-[56px] items-center gap-3">
          <PreviewCheck checked={checked} onToggle={onToggle} />
          <Badge variant="outline" className="shrink-0 text-xs">
            {index + 1}
          </Badge>

          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-sm font-semibold",
                checked && "text-muted-foreground line-through"
              )}
            >
              {exercicio?.nome || "Exercício"}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Dumbbell className="h-3.5 w-3.5" />
              {getExerciseSummary(exercicio)}
            </p>
          </div>

          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        </div>

        {expanded && (
          <div className="mt-3 space-y-2 border-t pt-3 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              {carga && (
                <span className="rounded bg-primary/10 px-2 py-0.5 font-mono font-semibold text-primary">
                  {carga}kg
                </span>
              )}
              {exercicio?.descanso > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {exercicio.descanso}s de descanso
                </span>
              )}
              {exercicio?.link_video && (
                <a
                  href={exercicio.link_video}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-1 text-blue-500 hover:underline"
                >
                  <Play className="h-3.5 w-3.5" />
                  Demonstração
                </a>
              )}
            </div>
            {exercicio?.observacoes && (
              <p className="italic">{exercicio.observacoes}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PreviewGroupCard({
  grupo,
  index,
  checked,
  onToggleExercise,
  onToggleGroup,
}: {
  grupo: any;
  index: number;
  checked: Record<string, boolean>;
  onToggleExercise: (id: string) => void;
  onToggleGroup: (ids: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const exercicios = grupo?.exercicios || [];
  const ids = exercicios.map((ex: any) => ex.id).filter(Boolean);
  const allChecked = ids.length > 0 && ids.every((id: string) => checked[id]);
  const tipo = grupo?.tipo_agrupamento || "bi-set";
  const tipoLabel =
    {
      normal: "Normal",
      "bi-set": "Bi-Set",
      "tri-set": "Tri-Set",
      "drop-set": "Drop-Set",
      superset: "Super-Set",
      circuito: "Circuito",
    }[tipo as string] || "Grupo";

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => setExpanded((value) => !value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpanded((value) => !value);
        }
      }}
      className={cn(
        "overflow-hidden border bg-background/70 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        allChecked && "border-green-500/40 bg-green-950/10"
      )}
    >
      <CardContent className="p-3">
        <div className="flex min-h-[56px] items-center gap-3">
          <PreviewCheck checked={allChecked} onToggle={() => onToggleGroup(ids)} />
          <Badge variant="outline" className="shrink-0 text-xs">
            {index + 1}
          </Badge>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="shrink-0">
                {tipoLabel}
              </Badge>
              <p className="truncate text-sm font-semibold">
                {exercicios.length} exercício
                {exercicios.length !== 1 ? "s" : ""} colapsado
                {exercicios.length !== 1 ? "s" : ""}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Toque para ver a sequência completa.
            </p>
          </div>

          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        </div>

        {expanded && (
          <div className="mt-3 space-y-2 border-t pt-3">
            {grupo?.descanso_entre_grupos > 0 && (
              <Badge variant="outline" className="text-xs">
                <Clock className="mr-1 h-3 w-3" />
                {grupo.descanso_entre_grupos}s após grupo
              </Badge>
            )}

            <div className="space-y-2">
              {exercicios.map((exercicio: any, exIndex: number) => (
                <PreviewExerciseCard
                  key={exercicio.id || `${index}-${exIndex}`}
                  exercicio={exercicio}
                  index={exIndex}
                  checked={!!checked[exercicio.id]}
                  onToggle={() => onToggleExercise(exercicio.id)}
                  nested
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PreviewBlockCard({
  bloco,
  index,
  checked,
  onToggle,
}: {
  bloco: any;
  index: number;
  checked: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tipoInfo = TIPOS_BLOCO[bloco?.tipo as keyof typeof TIPOS_BLOCO];
  const duration = getBlockDuration(bloco);
  const description =
    bloco?.descricao ||
    bloco?.config_alongamento?.observacoes ||
    bloco?.config_aquecimento?.observacoes ||
    null;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => setExpanded((value) => !value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpanded((value) => !value);
        }
      }}
      className={cn(
        "overflow-hidden border bg-background/70 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked && "border-green-500/40 bg-green-950/10"
      )}
    >
      <CardContent className="p-3">
        <div className="flex min-h-[56px] items-center gap-3">
          <PreviewCheck checked={checked} onToggle={onToggle} />
          <Badge variant="outline" className="shrink-0 text-xs">
            {index + 1}
          </Badge>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="shrink-0">
                {tipoInfo?.label || "Bloco"}
              </Badge>
              <p className="truncate text-sm font-semibold">
                {bloco?.nome || "Bloco de treino"}
              </p>
            </div>
            {duration && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {formatarDuracao(duration)}
              </p>
            )}
          </div>

          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        </div>

        {expanded && (
          <div className="mt-3 space-y-2 border-t pt-3 text-xs text-muted-foreground">
            {description && <p>{description}</p>}
            {bloco?.links?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {bloco.links.map((link: string, linkIndex: number) => (
                  <a
                    key={`${link}-${linkIndex}`}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex items-center gap-1 text-blue-500 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Link {linkIndex + 1}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StudentWorkoutPreview({
  items,
  diaNome,
  treinoNome,
  className,
}: StudentWorkoutPreviewProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggleExercise = (id: string) => {
    if (!id) return;
    setChecked((current) => ({ ...current, [id]: !current[id] }));
  };

  const toggleGroup = (ids: string[]) => {
    if (ids.length === 0) return;
    const shouldCheck = !ids.every((id) => checked[id]);
    setChecked((current) => {
      const next = { ...current };
      ids.forEach((id) => {
        next[id] = shouldCheck;
      });
      return next;
    });
  };

  return (
    <Card className={cn("border-primary/20 bg-muted/10", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers3 className="h-4 w-4 text-primary" />
              Prévia do aluno
            </CardTitle>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {treinoNome || diaNome || "Como o treino aparece no app"}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs">
            Limpa
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {items.map((item, index) => {
          if (item.type === "group") {
            return (
              <PreviewGroupCard
                key={item.sortableId}
                grupo={item.data}
                index={index}
                checked={checked}
                onToggleExercise={toggleExercise}
                onToggleGroup={toggleGroup}
              />
            );
          }

          if (item.type === "block") {
            const id = item.data?.id || item.sortableId;
            return (
              <PreviewBlockCard
                key={item.sortableId}
                bloco={item.data}
                index={index}
                checked={!!checked[id]}
                onToggle={() => toggleExercise(id)}
              />
            );
          }

          const id = item.data?.id || item.sortableId;
          return (
            <PreviewExerciseCard
              key={item.sortableId}
              exercicio={item.data}
              index={index}
              checked={!!checked[id]}
              onToggle={() => toggleExercise(id)}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
