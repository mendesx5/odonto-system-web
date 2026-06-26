import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Patients,
  Records,
  formatCpf,
  maskCpf,
  formatPhone,
  onlyDigits,
  type Patient,
  type PatientRequest,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Plus,
  Search,
  Loader2,
  ChevronRight,
  Users,
  UserCheck,
  UserX,
  FileText,
  Smile,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "./_authenticated.dashboard";
import { ApiError } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Odontogram } from "@/components/odontogram";

export const Route = createFileRoute("/_authenticated/patients/")({
  ssr: false,
  validateSearch: (s): { q?: string; new?: string } => ({
    q: typeof s.q === "string" ? s.q : undefined,
    new: typeof s.new === "string" ? s.new : undefined,
  }),
  component: PatientsPage,
});

function PatientsPage() {
  // Corrigido para a string literal exata exigida pelo TanStack Router
  const { q, new: newParam } = useSearch({ from: "/_authenticated/patients/" });
  const navigate = useNavigate();
  const [search, setSearch] = useState(q ?? "");
  const [openCreate, setOpenCreate] = useState(newParam === "1");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    if (newParam === "1") setOpenCreate(true);
  }, [newParam]);

  const isCpf = /\d/.test(search) && onlyDigits(search).length >= 3;
  const { data, isLoading } = useQuery({
    queryKey: ["patients", { search, isCpf }],
    queryFn: () =>
      Patients.list({
        ...(isCpf ? { cpf: onlyDigits(search) } : search ? { name: search } : {}),
        size: 50,
      }),
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Pacientes</h1>
          <p className="text-sm text-muted-foreground">
            {data?.totalElements ?? 0} {data?.totalElements === 1 ? "paciente cadastrado" : "pacientes cadastrados"}
          </p>
        </div>
        <PatientFormWrapper
          open={openCreate}
          onOpenChange={(open) => {
            setOpenCreate(open);
            if (!open) navigate({ to: "/patients", search: {} });
          }}
          trigger={
            <Button>
              <Plus className="size-4 mr-1.5" /> Novo paciente
            </Button>
          }
        >
          <PatientFormDialog onClose={() => setOpenCreate(false)} />
        </PatientFormWrapper>
      </header>

      <Card className="p-3">
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou CPF..."
            className="pl-9 border-0 shadow-none focus-visible:ring-0 h-10"
          />
        </div>
      </Card>

      {/* Grid de cards */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (data?.content?.length ?? 0) === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={Users}
            title={search ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado ainda"}
            description={search ? "Tente outro termo." : "Cadastre o primeiro paciente para comecar."}
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data!.content.map((patient) => (
            <PatientCard key={patient.id} patient={patient} onClick={() => setSelectedPatient(patient)} />
          ))}
        </div>
      )}

      {/* Dialog de detalhe do paciente */}
      <PatientDetailDialog patient={selectedPatient} onClose={() => setSelectedPatient(null)} />
    </div>
  );
}

/* ─── Card do paciente na listagem ─── */
function PatientCard({ patient, onClick }: { patient: Patient; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group text-left p-4 rounded-xl border bg-card hover:border-primary/40 hover:shadow-sm transition-all w-full"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold truncate">{patient.fullName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{maskCpf(patient.cpf)}</p>
        </div>
        <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors mt-0.5" />
      </div>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="font-normal">
          {patient.age} anos
        </Badge>
        {patient.active ? (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 font-normal text-[10px] py-0">
            <UserCheck className="size-2.5 mr-1" />Ativo
          </Badge>
        ) : (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 font-normal text-[10px] py-0">
            <UserX className="size-2.5 mr-1" />Inativo
          </Badge>
        )}
        {patient.phone && <span className="text-xs text-muted-foreground truncate">{formatPhone(patient.phone)}</span>}
      </div>
    </button>
  );
}

/* ─── Dialog de detalhes do paciente ─── */
function PatientDetailDialog({ patient, onClose }: { patient: Patient | null; onClose: () => void }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const qc = useQueryClient();

  if (!patient) return null;

  return (
    <Dialog
      open={!!patient}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setEditing(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-6">
            <span className="truncate">{patient.fullName}</span>
            {patient.active ? (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 shrink-0">
                <UserCheck className="size-3 mr-1" />Ativo
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 shrink-0">
                <UserX className="size-3 mr-1" />Inativo
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {editing ? (
          <PatientFormDialog
            patientId={patient.id}
            initial={patient}
            onClose={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              qc.invalidateQueries({ queryKey: ["patients"] });
              onClose();
            }}
            inline
          />
        ) : (
           <Tabs defaultValue="summary" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Resumo</TabsTrigger>
              <TabsTrigger value="records">
                <FileText className="size-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Prontuarios</span>
              </TabsTrigger>
              <TabsTrigger value="odontogram">
                <Smile className="size-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Odontograma</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <InfoField label="CPF" value={formatCpf(patient.cpf)} />
                <InfoField
                  label="Data de nascimento"
                  value={format(parseISO(patient.dateOfBirth), "dd/MM/yyyy", { locale: ptBR })}
                />
                <InfoField label="Idade" value={`${patient.age} anos`} />
                {patient.phone && <InfoField label="Telefone" value={formatPhone(patient.phone)} />}
              </div>
              {patient.email && <InfoField label="E-mail" value={patient.email} />}
              {patient.address && <InfoField label="Endereco" value={patient.address} />}
              {patient.notes && (
                <div className="p-3 rounded-md bg-muted/40 text-sm">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Observacoes</p>
                  <p>{patient.notes}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditing(true)}>
                  Editar
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    onClose();
                    navigate({ to: "/patients/$id", params: { id: patient.id } });
                  }}
                >
                  Abrir ficha completa <ExternalLink className="size-4 ml-1.5" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="records">
              <PatientRecordsPanel patientId={patient.id} />
            </TabsContent>

            <TabsContent value="odontogram">
              <Odontogram patientId={patient.id} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PatientRecordsPanel({ patientId }: { patientId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["records", patientId],
    queryFn: () => Records.listByPatient(patientId),
  });

  if (isLoading) {
    return (
      <div className="h-32 grid place-items-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-6">
        <EmptyState
          icon={FileText}
          title="Nao consegui carregar os prontuarios"
          description="Verifique se a API esta rodando e se o usuario tem permissao."
        />
      </Card>
    );
  }

  const records = data?.content ?? [];
  if (records.length === 0) {
    return (
      <Card className="p-6">
        <EmptyState
          icon={FileText}
          title="Sem prontuarios"
          description="Este paciente ainda nao tem evolucao clinica registrada."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <Card key={record.id} className="p-4">
          <p className="text-xs text-muted-foreground">
            {format(parseISO(record.recordDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            {" · "}Dr(a). {record.dentistName}
          </p>
          <p className="font-medium mt-1">{record.chiefComplaint}</p>
          {record.diagnosis && (
            <p className="text-sm mt-2">
              <strong className="text-muted-foreground">Diagnostico:</strong> {record.diagnosis}
            </p>
          )}
          {record.treatmentPlan && (
            <p className="text-sm mt-1">
              <strong className="text-muted-foreground">Plano:</strong> {record.treatmentPlan}
            </p>
          )}
          {record.evolutionNotes && (
            <p className="text-sm mt-1">
              <strong className="text-muted-foreground">Evolucao:</strong> {record.evolutionNotes}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}

/* ─── Formulário de paciente (criar / editar) ─── */
/** Abre Dialog no desktop e Sheet (bottom drawer) no mobile */
function PatientFormWrapper({
  open,
  onOpenChange,
  trigger,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <span onClick={() => onOpenChange(true)}>{trigger}</span>
        {children}
      </Sheet>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      {children}
    </Dialog>
  );
}

export function PatientFormDialog({
  initial,
  patientId,
  onClose,
  onSaved,
  inline,
}: {
  initial?: Partial<PatientRequest & { cpf: string }>;
  patientId?: string;
  onClose?: () => void;
  onSaved?: () => void;
  inline?: boolean;
}) {
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [form, setForm] = useState<PatientRequest>({
    fullName: initial?.fullName ?? "",
    cpf: initial?.cpf ?? "",
    dateOfBirth: initial?.dateOfBirth ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    address: initial?.address ?? "",
    notes: initial?.notes ?? "",
  });

  const mutation = useMutation({
    mutationFn: (data: PatientRequest) => (patientId ? Patients.update(patientId, data) : Patients.create(data)),
    onSuccess: () => {
      toast.success(patientId ? "Paciente atualizado." : "Paciente cadastrado.");
      qc.invalidateQueries({ queryKey: ["patients"] });
      onSaved?.();
      onClose?.();
    },
    onError: (e) => {
      const msg =
        e instanceof ApiError
          ? e.status === 409
            ? "CPF já cadastrado."
            : e.body?.message ?? e.message
          : "Erro ao salvar.";
      toast.error(msg);
    },
  });

  const title = patientId ? "Editar paciente" : "Novo paciente";

  const formContent = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate({ ...form, cpf: onlyDigits(form.cpf) });
      }}
      className="flex flex-col gap-4 flex-1"
    >
      {/* Seção: Identificação */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Identificação
        </p>
        <Field label="Nome completo *">
          <Input
            required
            minLength={3}
            maxLength={150}
            autoComplete="name"
            autoFocus={!isMobile}
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="CPF *">
            <Input
              required
              inputMode="numeric"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              placeholder="000.000.000-00"
              disabled={!!patientId}
            />
          </Field>
          <Field label="Data de nascimento *">
            <Input
              required
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            />
          </Field>
        </div>
      </div>

      {/* Seção: Contato */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Contato
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Telefone">
            <Input
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(11) 91234-5678"
            />
          </Field>
          <Field label="E-mail">
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Endereço">
          <Input
            autoComplete="street-address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </Field>
      </div>

      {/* Seção: Extras */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Observações
        </p>
        <Textarea
          rows={3}
          placeholder="Alergias, observações clínicas, etc."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      {/* Botões — fixos no bottom no mobile via Sheet, normais no Dialog */}
      <div className={`flex gap-2 pt-1 ${isMobile ? "sticky bottom-0 bg-background pb-2" : ""}`}>
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending} className="flex-1">
          {mutation.isPending && <Loader2 className="size-4 mr-1.5 animate-spin" />}
          {patientId ? "Atualizar" : "Cadastrar"}
        </Button>
      </div>
    </form>
  );

  if (inline) return formContent;

  // Mobile: Sheet deslizando de baixo para cima
  if (isMobile) {
    return (
      <SheetContent side="bottom" className="h-[92dvh] flex flex-col rounded-t-2xl px-4 pt-4 pb-0">
        {/* Handle visual */}
        <div className="mx-auto w-10 h-1 rounded-full bg-muted mb-4 shrink-0" />
        <SheetHeader className="text-left mb-4 shrink-0">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>Campos com * são obrigatórios.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto overscroll-contain -mx-4 px-4 pb-6">
          {formContent}
        </div>
      </SheetContent>
    );
  }

  // Desktop: Dialog centralizado
  return (
    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Campos com * são obrigatórios.</DialogDescription>
      </DialogHeader>
      {formContent}
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground/80">{label}</Label>
      {children}
    </div>
  );
}