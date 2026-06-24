import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Patients, Records, Exams, Appointments, Procedures,
  formatCpf, formatPhone,
  type ClinicalRecordRequest, type Procedure, type AppointmentStatus,
  STATUS_LABEL, parseBackendDateTime,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, Edit2, FileText, FlaskConical, Smile, Plus, Trash2,
  Upload, Loader2, Calendar, Phone, Mail, MapPin, FileSearch,
  CalendarDays, Lock,
} from "lucide-react";
import { useState } from "react";
import { PatientFormDialog } from "./_authenticated.patients";
import { EmptyState } from "./_authenticated.dashboard";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Odontogram } from "@/components/odontogram";
import {
  Dialog as DialogRoot, DialogContent, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { appointmentRowClasses, isTerminal, STATUS_PILL } from "./_authenticated.appointments";

export const Route = createFileRoute("/_authenticated/patients/$id")({
  ssr: false,
  component: PatientDetail,
});

function PatientDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const { data: p, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => Patients.get(id),
  });

  if (isLoading || !p) {
    return (
      <div className="max-w-5xl mx-auto">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/patients" })}>
        <ArrowLeft className="size-4 mr-1.5" /> Voltar
      </Button>

      <Card className="p-5 sm:p-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-start">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{p.fullName}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="secondary">{p.age} anos</Badge>
              <Badge variant="secondary">{formatCpf(p.cpf)}</Badge>
              {!p.active && <Badge variant="destructive">Inativo</Badge>}
            </div>
            <dl className="mt-4 grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
              <Info icon={Calendar} text={format(parseISO(p.dateOfBirth), "dd/MM/yyyy")} />
              {p.phone && <Info icon={Phone} text={formatPhone(p.phone)} />}
              {p.email && <Info icon={Mail} text={p.email} />}
              {p.address && <Info icon={MapPin} text={p.address} />}
            </dl>
            {p.notes && (
              <p className="mt-4 p-3 rounded-md bg-muted/40 text-sm">{p.notes}</p>
            )}
          </div>
          <Dialog open={editing} onOpenChange={setEditing}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit2 className="size-3.5 mr-1.5" /> Editar
              </Button>
            </DialogTrigger>
            <PatientFormDialog
              patientId={p.id}
              initial={p}
              onClose={() => setEditing(false)}
            />
          </Dialog>
        </div>
      </Card>

      <Tabs defaultValue="records">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="records" className="flex-1 sm:flex-none">
            <FileText className="size-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Prontuários</span>
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex-1 sm:flex-none">
            <CalendarDays className="size-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Consultas</span>
          </TabsTrigger>
          <TabsTrigger value="odontogram" className="flex-1 sm:flex-none">
            <Smile className="size-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Odontograma</span>
          </TabsTrigger>
          <TabsTrigger value="exams" className="flex-1 sm:flex-none">
            <FlaskConical className="size-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Exames</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="mt-4">
          <RecordsTab patientId={p.id} />
        </TabsContent>
        <TabsContent value="appointments" className="mt-4">
          <PatientAppointmentsTab patientId={p.id} />
        </TabsContent>
        <TabsContent value="odontogram" className="mt-4">
          <Odontogram patientId={p.id} />
        </TabsContent>
        <TabsContent value="exams" className="mt-4">
          <ExamsTab patientId={p.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3.5" />
      <span className="truncate">{text}</span>
    </div>
  );
}

// ─── Aba Prontuários ──────────────────────────────────────────────────────────

function RecordsTab({ patientId }: { patientId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["records", patientId],
    queryFn: () => Records.listByPatient(patientId),
  });
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <DialogRoot open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4 mr-1.5" /> Novo prontuário
            </Button>
          </DialogTrigger>
          <RecordFormDialog patientId={patientId} onClose={() => setOpen(false)} />
        </DialogRoot>
      </div>

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : (data?.content?.length ?? 0) === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={FileText}
            title="Sem prontuários"
            description="Crie o primeiro prontuário deste paciente."
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {data!.content.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(r.recordDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    {" "}· Dr(a). {r.dentistName.split(" ")[0]}
                  </p>
                  <p className="font-medium mt-1">{r.chiefComplaint}</p>
                  {r.diagnosis && (
                    <p className="text-sm mt-2">
                      <strong className="text-muted-foreground">Diagnóstico:</strong> {r.diagnosis}
                    </p>
                  )}
                  {r.treatmentPlan && (
                    <p className="text-sm mt-1">
                      <strong className="text-muted-foreground">Plano:</strong> {r.treatmentPlan}
                    </p>
                  )}
                  {r.evolutionNotes && (
                    <p className="text-sm mt-1">
                      <strong className="text-muted-foreground">Evolução:</strong> {r.evolutionNotes}
                    </p>
                  )}
                  {r.procedures.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.procedures.map((proc) => (
                        <Badge key={proc.id} variant="secondary" className="text-[10px]">
                          {proc.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Dialog de novo prontuário (com seleção de procedimentos) ────────────────

function RecordFormDialog({
  patientId,
  onClose,
}: {
  patientId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ClinicalRecordRequest>({
    patientId,
    recordDate: new Date().toISOString().slice(0, 10),
    chiefComplaint: "",
    diagnosis: "",
    treatmentPlan: "",
    evolutionNotes: "",
    procedureIds: [],
  });

  const { data: catalog } = useQuery({
    queryKey: ["procedures-catalog"],
    queryFn: () => Procedures.catalog(),
  });
  const procedures: Procedure[] = catalog ?? [];

  function toggleProcedure(id: string) {
    setForm((prev) => ({
      ...prev,
      procedureIds: prev.procedureIds?.includes(id)
        ? prev.procedureIds.filter((p) => p !== id)
        : [...(prev.procedureIds ?? []), id],
    }));
  }

  const m = useMutation({
    mutationFn: (d: ClinicalRecordRequest) => Records.create(patientId, d),
    onSuccess: () => {
      toast.success("Prontuário criado.");
      qc.invalidateQueries({ queryKey: ["records", patientId] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar."),
  });

  return (
    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Novo prontuário</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => { e.preventDefault(); m.mutate(form); }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label>Data *</Label>
          <Input
            type="date"
            required
            value={form.recordDate}
            onChange={(e) => setForm({ ...form, recordDate: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Queixa principal *</Label>
          <Textarea
            required
            rows={2}
            value={form.chiefComplaint}
            onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Diagnóstico</Label>
          <Textarea
            rows={2}
            value={form.diagnosis}
            onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Plano de tratamento</Label>
          <Textarea
            rows={2}
            value={form.treatmentPlan}
            onChange={(e) => setForm({ ...form, treatmentPlan: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Evolução</Label>
          <Textarea
            rows={2}
            value={form.evolutionNotes}
            onChange={(e) => setForm({ ...form, evolutionNotes: e.target.value })}
          />
        </div>

        {/* Seleção de procedimentos */}
        {procedures.length > 0 && (
          <div className="space-y-2">
            <Label>Procedimentos realizados</Label>
            <div className="border rounded-md divide-y max-h-44 overflow-y-auto">
              {procedures.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <Checkbox
                    checked={form.procedureIds?.includes(p.id) ?? false}
                    onCheckedChange={() => toggleProcedure(p.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    {p.category && (
                      <p className="text-[10px] text-muted-foreground">{p.category}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={m.isPending}>
            {m.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ─── Aba Consultas do paciente ────────────────────────────────────────────────

function PatientAppointmentsTab({ patientId }: { patientId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["appointments-patient", patientId],
    // Filtra no frontend porque o backend atual não tem query por paciente ainda
    queryFn: () => Appointments.list({ size: 200 }),
    select: (d) => ({
      ...d,
      content: d.content
        .filter((a) => a.patientId === patientId)
        .sort((a, b) => b.startTime.toString().localeCompare(a.startTime.toString())),
    }),
  });

  if (isLoading) return <Skeleton className="h-40" />;

  const items = data?.content ?? [];

  if (items.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState
          icon={CalendarDays}
          title="Sem consultas registradas"
          description="Agende a primeira consulta deste paciente na aba Agenda."
        />
      </Card>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((a) => {
        const start = parseBackendDateTime(a.startTime as any);
        const end   = parseBackendDateTime(a.endTime as any);
        const terminal = isTerminal(a.status);

        return (
          <Card
            key={a.id}
            className={`p-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 ${appointmentRowClasses(a.status)}`}
          >
            <div className="text-center w-14 shrink-0">
              <p className="text-xs font-semibold tabular-nums">
                {format(start, "dd/MM/yy")}
              </p>
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {format(start, "HH:mm")}–{format(end, "HH:mm")}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {a.reason || "Consulta"}
              </p>
              <p className="text-xs text-muted-foreground">Dr(a). {a.dentistName}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {terminal && <Lock className="size-3 text-muted-foreground" />}
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_PILL[a.status]}`}
              >
                {STATUS_LABEL[a.status]}
              </span>
            </div>
          </Card>
        );
      })}
    </ul>
  );
}

// ─── Aba Exames ───────────────────────────────────────────────────────────────

function ExamsTab({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["exams", patientId],
    queryFn: () => Exams.listByPatient(patientId),
  });
  const [uploading, setUploading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await Exams.upload(patientId, file);
      toast.success("Exame enviado.");
      qc.invalidateQueries({ queryKey: ["exams", patientId] });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const remove = useMutation({
    mutationFn: (id: string) => Exams.remove(id),
    onSuccess: () => {
      toast.success("Removido.");
      qc.invalidateQueries({ queryKey: ["exams", patientId] });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button asChild size="sm" disabled={uploading}>
          <label className="cursor-pointer">
            {uploading ? (
              <Loader2 className="size-4 mr-1.5 animate-spin" />
            ) : (
              <Upload className="size-4 mr-1.5" />
            )}
            Enviar exame
            <input
              type="file"
              className="hidden"
              onChange={onFile}
              disabled={uploading}
            />
          </label>
        </Button>
      </div>
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : (data?.content?.length ?? 0) === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={FileSearch}
            title="Sem exames"
            description="Envie radiografias, tomografias ou laudos em PDF/imagem."
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data!.content.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate text-sm">{e.fileName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(parseISO(e.createdAt), "dd/MM/yyyy")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive"
                  onClick={() => remove.mutate(e.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              {e.url && (
                <Button asChild variant="outline" size="sm" className="w-full mt-3">
                  <a href={e.url} target="_blank" rel="noreferrer">
                    Abrir
                  </a>
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
