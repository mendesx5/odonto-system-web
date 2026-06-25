import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Appointments, AppointmentsExt, Users, Procedures, STATUS_LABEL, parseBackendDateTime,
  type AppointmentRequest, type AppointmentStatus, type Patient,
  type UserRecord, type Procedure, type BlockScheduleRequest,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, CalendarDays, Loader2, Stethoscope, Lock,
  BanIcon, Clock3, ChevronRight,
} from "lucide-react";
import { format, isSameDay, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { PatientCombobox } from "@/components/patient-combobox";
import { EmptyState } from "./_authenticated.dashboard";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/appointments")({
  ssr: false,
  validateSearch: (s): { new?: string } => ({
    new: typeof s.new === "string" ? s.new : undefined,
  }),
  component: AppointmentsPage,
});

// ─── Status helpers ─────────────────────────────────────────────────────────

const TERMINAL_STATUSES: AppointmentStatus[] = ["CONCLUIDO", "CANCELADO", "NAO_COMPARECEU"];

export function isTerminal(status: AppointmentStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function appointmentRowClasses(status: AppointmentStatus): string {
  switch (status) {
    case "CONCLUIDO":      return "border-l-4 border-l-green-500 bg-green-50 dark:bg-green-900/10";
    case "CONFIRMADO":     return "border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/10";
    case "AGUARDANDO":     return "border-l-4 border-l-violet-500 bg-violet-50 dark:bg-violet-900/10";
    case "EM_ATENDIMENTO": return "border-l-4 border-l-cyan-500 bg-cyan-50 dark:bg-cyan-900/10";
    case "CANCELADO":      return "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/10";
    case "NAO_COMPARECEU": return "border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-900/10";
    case "AGENDADO":
    default:               return "border-l-4 border-l-yellow-400 bg-yellow-50 dark:bg-yellow-900/10";
  }
}

export const STATUS_PILL: Record<AppointmentStatus, string> = {
  CONCLUIDO:      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CONFIRMADO:     "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  AGUARDANDO:     "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  EM_ATENDIMENTO: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  CANCELADO:      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  NAO_COMPARECEU: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  AGENDADO:       "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
};

// ─── Page ────────────────────────────────────────────────────────────────────

function AppointmentsPage() {
  const navigate = useNavigate();
  const { new: newParam } = useSearch({ from: "/_authenticated/appointments" });
  const [open, setOpen] = useState(newParam === "1");
  const [blockOpen, setBlockOpen] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);
  const day = startOfDay(addDays(new Date(), dayOffset));

  useEffect(() => { if (newParam === "1") setOpen(true); }, [newParam]);

  const { data, isLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => Appointments.list({ size: 200 }),
  });

  const list = useMemo(
    () =>
      (data?.content ?? [])
        .filter((a) => isSameDay(parseBackendDateTime(a.startTime as any), day))
        .sort((a, b) => a.startTime.toString().localeCompare(b.startTime.toString())),
    [data, day],
  );

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">Agenda</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {format(day, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bloquear horário — admin/receptionist */}
          <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-1.5">
                <BanIcon className="size-3.5" />
                Bloquear
              </Button>
            </DialogTrigger>
            <BlockScheduleDialog onClose={() => setBlockOpen(false)} defaultDate={format(day, "yyyy-MM-dd")} />
          </Dialog>

          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) navigate({ to: "/appointments", search: {} });
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4 mr-1.5" />
                Agendar
              </Button>
            </DialogTrigger>
            <AppointmentFormDialog onClose={() => setOpen(false)} defaultDate={format(day, "yyyy-MM-dd")} />
          </Dialog>
        </div>
      </header>

      {/* Seletor de dias */}
      <Card className="p-2 flex items-center gap-1 overflow-x-auto">
        {Array.from({ length: 7 }).map((_, i) => {
          const d = addDays(new Date(), i);
          const active = i === dayOffset;
          return (
            <button
              key={i}
              onClick={() => setDayOffset(i)}
              className={`shrink-0 flex flex-col items-center px-3 py-2 rounded-md transition-all min-w-[60px] ${
                active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <span className="text-[10px] uppercase opacity-70">
                {format(d, "EEE", { locale: ptBR })}
              </span>
              <span className="text-lg font-bold">{format(d, "dd")}</span>
            </button>
          );
        })}
      </Card>

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : list.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={CalendarDays}
            title="Sem consultas neste dia"
            description="Clique em 'Agendar' para criar uma."
          />
        </Card>
      ) : (
        <ul className="space-y-2">
          {list.map((a) => (
            <AppointmentRow key={a.id} a={a} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function AppointmentRow({ a }: { a: import("@/lib/api").Appointment }) {
  const qc = useQueryClient();
  const terminal = isTerminal(a.status);

  const m = useMutation({
    mutationFn: (status: AppointmentStatus) => Appointments.setStatus(a.id, status),
    onSuccess: () => {
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro."),
  });

  const start = parseBackendDateTime(a.startTime as any);
  const end   = parseBackendDateTime(a.endTime as any);

  // Bloqueio de horário: BLOCKED é um status especial
  const isBlock = (a as any).type === "BLOCKED" || a.reason === "__BLOCKED__";

  if (isBlock) {
    return (
      <Card className="p-4 flex items-center gap-4 border-l-4 border-l-gray-400 bg-gray-50 dark:bg-gray-900/20 opacity-75">
        <div className="text-center w-14 shrink-0">
          <p className="text-base font-semibold tabular-nums">{format(start, "HH:mm")}</p>
          <p className="text-[10px] text-muted-foreground tabular-nums">{format(end, "HH:mm")}</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <BanIcon className="size-3.5 text-muted-foreground shrink-0" />
            <p className="text-sm font-medium text-muted-foreground">Horário bloqueado</p>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {a.notes || a.reason || "—"} · Dr(a). {a.dentistName}
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px] shrink-0">Bloqueado</Badge>
      </Card>
    );
  }

  return (
    <Card
      className={`p-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 transition-colors ${appointmentRowClasses(a.status)}`}
    >
      {/* Horário */}
      <div className="text-center w-14 shrink-0">
        <p className="text-base font-semibold tabular-nums">{format(start, "HH:mm")}</p>
        <p className="text-[10px] text-muted-foreground tabular-nums">{format(end, "HH:mm")}</p>
      </div>

      {/* Info */}
      <div className="min-w-0">
        <p className="font-medium truncate">{a.patientName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {a.reason || "—"} · Dr(a). {a.dentistName}
        </p>
        <span
          className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_PILL[a.status]}`}
        >
          {STATUS_LABEL[a.status]}
        </span>
      </div>

      {/* Selector de status */}
      <div className="flex items-center gap-2 shrink-0">
        {terminal ? (
          <div
            className="flex items-center gap-1.5 h-8 px-3 rounded-md border bg-muted/50 text-xs text-muted-foreground cursor-not-allowed"
            title="Consulta finalizada — não pode ser alterada"
          >
            <Lock className="size-3" />
            {STATUS_LABEL[a.status]}
          </div>
        ) : (
          <Select
            value={a.status}
            onValueChange={(v) => m.mutate(v as AppointmentStatus)}
            disabled={m.isPending}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABEL) as AppointmentStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </Card>
  );
}

// ─── Formulário de agendamento ────────────────────────────────────────────────

function AppointmentFormDialog({ onClose, defaultDate }: { onClose: () => void; defaultDate?: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isDentist = user?.role === "DENTIST";

  const [patient, setPatient] = useState<Patient | null>(null);
  const [dentistId, setDentistId] = useState(isDentist ? user!.id : "");
  const [date, setDate] = useState(defaultDate ?? format(new Date(), "yyyy-MM-dd"));
  const [start, setStart] = useState("09:00");
  const [duration, setDuration] = useState(30);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [showFreeSlots, setShowFreeSlots] = useState(false);

  const { data: dentistsData, isLoading: loadingDentists } = useQuery({
    queryKey: ["dentists"],
    queryFn: () => Users.listDentists(),
    enabled: !isDentist,
  });
  const dentists = dentistsData?.content ?? [];

  const { data: proceduresCatalog } = useQuery({
    queryKey: ["procedures-catalog"],
    queryFn: () => Procedures.catalog(),
  });
  const procedures: Procedure[] = proceduresCatalog ?? [];

  // Horários livres
  const { data: freeSlots, isLoading: loadingSlots } = useQuery({
    queryKey: ["free-slots", dentistId, date],
    queryFn: () => AppointmentsExt.getFreeSlots(dentistId, date),
    enabled: showFreeSlots && !!dentistId && !!date,
  });

  const m = useMutation({
    mutationFn: (body: AppointmentRequest) => Appointments.create(body),
    onSuccess: () => {
      toast.success("Agendamento criado.");
      qc.invalidateQueries({ queryKey: ["appointments"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao agendar."),
  });

  function toggleProcedure(id: string) {
    setSelectedProcedures((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!patient) return toast.error("Selecione um paciente.");
    if (!dentistId) return toast.error("Selecione um dentista.");
    const startTime = `${date}T${start}:00`;
    const endDate = new Date(`${date}T${start}:00`);
    endDate.setMinutes(endDate.getMinutes() + duration);
    const endTime = format(endDate, "yyyy-MM-dd'T'HH:mm:ss");
    m.mutate({
      patientId: patient.id,
      dentistId,
      startTime,
      endTime,
      reason,
      notes,
      procedureIds: selectedProcedures,
    } as any);
  }

  return (
    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Novo agendamento</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        {/* Paciente */}
        <div className="space-y-1.5">
          <Label>Paciente *</Label>
          <PatientCombobox value={patient} onChange={setPatient} />
          <p className="text-[11px] text-muted-foreground">Busca por nome ou CPF.</p>
        </div>

        {/* Dentista */}
        <div className="space-y-1.5">
          <Label>Dentista *</Label>
          {isDentist ? (
            <div className="flex items-center gap-2 p-2.5 rounded-md border bg-muted/40">
              <Stethoscope className="size-4 text-muted-foreground shrink-0" />
              <span className="text-sm">{user!.fullName}</span>
            </div>
          ) : loadingDentists ? (
            <Skeleton className="h-9 w-full" />
          ) : dentists.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2 border rounded-md">
              Nenhum dentista ativo cadastrado.
            </p>
          ) : (
            <Select value={dentistId} onValueChange={(v) => { setDentistId(v); setShowFreeSlots(false); }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o dentista…" />
              </SelectTrigger>
              <SelectContent>
                {dentists.map((d: UserRecord) => (
                  <SelectItem key={d.id} value={d.id}>
                    <span className="flex items-center gap-2">
                      <Stethoscope className="size-3.5 text-muted-foreground" />
                      {d.fullName}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Data, hora e duração */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Data *</Label>
            <Input
              type="date"
              required
              value={date}
              onChange={(e) => { setDate(e.target.value); setShowFreeSlots(false); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Início *</Label>
            <Input
              type="time"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Duração</Label>
            <Select
              value={String(duration)}
              onValueChange={(v) => setDuration(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[15, 30, 45, 60, 90, 120].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Horários livres */}
        {dentistId && date && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowFreeSlots((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
            >
              <Clock3 className="size-3.5" />
              {showFreeSlots ? "Ocultar" : "Ver"} horários livres neste dia
              <ChevronRight className={`size-3.5 transition-transform ${showFreeSlots ? "rotate-90" : ""}`} />
            </button>

            {showFreeSlots && (
              <div className="rounded-md border p-3 bg-muted/30 space-y-2">
                {loadingSlots ? (
                  <Skeleton className="h-8 w-full" />
                ) : !freeSlots || freeSlots.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum horário livre encontrado.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {freeSlots.map((slot, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setStart(slot.startTime.slice(0, 5))}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                          start === slot.startTime.slice(0, 5)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-white hover:bg-muted border-border"
                        }`}
                      >
                        {slot.startTime.slice(0, 5)} – {slot.endTime.slice(0, 5)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Motivo</Label>
          <Input
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: Limpeza, Avaliação, Extração…"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Observações</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {/* Procedimentos */}
        {procedures.length > 0 && (
          <div className="space-y-2">
            <Label>Procedimentos (opcional)</Label>
            <div className="border rounded-md divide-y max-h-44 overflow-y-auto">
              {procedures.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <Checkbox
                    checked={selectedProcedures.includes(p.id)}
                    onCheckedChange={() => toggleProcedure(p.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    {p.category && (
                      <p className="text-[10px] text-muted-foreground">{p.category}</p>
                    )}
                  </div>
                  {p.defaultDurationMinutes && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {p.defaultDurationMinutes} min
                    </Badge>
                  )}
                </label>
              ))}
            </div>
            {selectedProcedures.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {selectedProcedures.length} procedimento(s) selecionado(s).
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={m.isPending}>
            {m.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
            Agendar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ─── Bloquear horário ─────────────────────────────────────────────────────────

function BlockScheduleDialog({ onClose, defaultDate }: { onClose: () => void; defaultDate?: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isDentist = user?.role === "DENTIST";

  const [dentistId, setDentistId] = useState(isDentist ? user!.id : "");
  const [date, setDate] = useState(defaultDate ?? format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [reason, setReason] = useState("");

  const { data: dentistsData, isLoading: loadingDentists } = useQuery({
    queryKey: ["dentists"],
    queryFn: () => Users.listDentists(),
    enabled: !isDentist,
  });
  const dentists = dentistsData?.content ?? [];

  const m = useMutation({
    mutationFn: (data: BlockScheduleRequest) => AppointmentsExt.blockSchedule(data),
    onSuccess: () => {
      toast.success("Horário bloqueado com sucesso.");
      qc.invalidateQueries({ queryKey: ["appointments"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao bloquear."),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!dentistId) return toast.error("Selecione um dentista.");
    if (!reason.trim()) return toast.error("Informe o motivo do bloqueio.");
    m.mutate({
      dentistId,
      startTime: `${date}T${startTime}:00`,
      endTime: `${date}T${endTime}:00`,
      reason: reason.trim(),
    });
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <BanIcon className="size-4 text-destructive" />
          Bloquear horário na agenda
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Bloqueios impedem novos agendamentos no período selecionado (almoço, reunião, feriado etc.).
        </p>

        {/* Dentista */}
        {isDentist ? (
          <div className="flex items-center gap-2 p-2.5 rounded-md border bg-muted/40">
            <Stethoscope className="size-4 text-muted-foreground shrink-0" />
            <span className="text-sm">{user!.fullName}</span>
          </div>
        ) : loadingDentists ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <div className="space-y-1.5">
            <Label>Dentista *</Label>
            <Select value={dentistId} onValueChange={setDentistId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o dentista…" />
              </SelectTrigger>
              <SelectContent>
                {dentists.map((d: UserRecord) => (
                  <SelectItem key={d.id} value={d.id}>{d.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Data *</Label>
          <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Início *</Label>
            <Input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Fim *</Label>
            <Input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Motivo *</Label>
          <Input
            placeholder="Ex.: Almoço, Reunião, Feriado…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            required
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="destructive" disabled={m.isPending}>
            {m.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
            Bloquear
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
