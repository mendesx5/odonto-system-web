import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Appointments,
  STATUS_LABEL,
  parseBackendDateTime,
  type AppointmentStatus,
  type WaitingRoomEntry,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, RefreshCw, Users, Stethoscope, Timer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { EmptyState } from "./_authenticated.dashboard";

export const Route = createFileRoute("/_authenticated/waiting-room")({
  ssr: false,
  component: WaitingRoomPage,
});

const STATUS_WAITING_PILL: Record<string, string> = {
  AGUARDANDO:     "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  EM_ATENDIMENTO: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
};

function WaitingRoomPage() {
  const qc = useQueryClient();

  const { data, isLoading, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["waiting-room"],
    queryFn: () => Appointments.waitingRoom(),
    refetchInterval: 30_000, // atualiza a cada 30s automaticamente
  });

  const list: WaitingRoomEntry[] = data ?? [];
  const waiting     = list.filter((e) => e.status === "AGUARDANDO");
  const inService   = list.filter((e) => e.status === "EM_ATENDIMENTO");

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      Appointments.setStatus(id, status),
    onSuccess: () => {
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["waiting-room"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar status."),
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Sala de Espera</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            {dataUpdatedAt > 0 && (
              <span className="ml-2 text-xs opacity-60">
                · atualizado às {format(new Date(dataUpdatedAt), "HH:mm:ss")}
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => qc.invalidateQueries({ queryKey: ["waiting-room"] })}
          disabled={isFetching}
        >
          <RefreshCw className={`size-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </header>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="size-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 grid place-items-center shrink-0">
            <Users className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Aguardando</p>
            {isLoading ? (
              <Skeleton className="h-6 w-8 mt-1" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">{waiting.length}</p>
            )}
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="size-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 grid place-items-center shrink-0">
            <Stethoscope className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Em atendimento</p>
            {isLoading ? (
              <Skeleton className="h-6 w-8 mt-1" />
            ) : (
              <p className="text-2xl font-bold tabular-nums">{inService.length}</p>
            )}
          </div>
        </Card>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : list.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={Clock}
            title="Sala de espera vazia"
            description="Nenhum paciente aguardando ou em atendimento no momento."
          />
        </Card>
      ) : (
        <ul className="space-y-2">
          {list.map((entry) => (
            <WaitingRoomCard
              key={entry.appointmentId}
              entry={entry}
              onSetStatus={(status) =>
                setStatus.mutate({ id: entry.appointmentId, status })
              }
              isPending={setStatus.isPending}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function WaitingRoomCard({
  entry,
  onSetStatus,
  isPending,
}: {
  entry: WaitingRoomEntry;
  onSetStatus: (status: AppointmentStatus) => void;
  isPending: boolean;
}) {
  const isWaiting   = entry.status === "AGUARDANDO";
  const inService   = entry.status === "EM_ATENDIMENTO";
  const startTime   = parseBackendDateTime(entry.startTime as any);
  const pillClass   = STATUS_WAITING_PILL[entry.status] ?? "bg-secondary text-secondary-foreground";

  return (
    <Card className={`p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
      inService
        ? "border-l-4 border-l-cyan-500"
        : "border-l-4 border-l-violet-500"
    }`}>
      {/* Horário agendado */}
      <div className="text-center w-14 shrink-0">
        <p className="text-base font-semibold tabular-nums">{format(startTime, "HH:mm")}</p>
        <p className="text-[10px] text-muted-foreground">agendado</p>
      </div>

      {/* Info principal */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{entry.patientName}</p>
        <p className="text-sm text-muted-foreground truncate">
          Dr(a). {entry.dentistName}
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pillClass}`}>
            {STATUS_LABEL[entry.status]}
          </span>
          {entry.waitingTimeMinutes > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Timer className="size-3" />
              {entry.waitingTimeMinutes} min esperando
            </span>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2 shrink-0 flex-wrap">
        {isWaiting && (
          <Button
            size="sm"
            variant="outline"
            className="border-cyan-500 text-cyan-700 hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-900/20"
            disabled={isPending}
            onClick={() => onSetStatus("EM_ATENDIMENTO")}
          >
            <Stethoscope className="size-3.5 mr-1.5" />
            Iniciar atendimento
          </Button>
        )}
        {inService && (
          <Button
            size="sm"
            variant="outline"
            className="border-green-500 text-green-700 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-900/20"
            disabled={isPending}
            onClick={() => onSetStatus("CONCLUIDO")}
          >
            Concluir
          </Button>
        )}
      </div>
    </Card>
  );
}
