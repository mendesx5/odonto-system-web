import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Appointments, Patients, STATUS_LABEL, parseBackendDateTime, formatPhone, type AppointmentStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarPlus, UserPlus, FilePlus, Activity, Users, CalendarDays, ArrowRight, Clock } from "lucide-react";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const patients = useQuery({ queryKey: ["patients", "kpi"], queryFn: () => Patients.list({ size: 1 }) });
  const appts = useQuery({ queryKey: ["appointments", "today-list"], queryFn: () => Appointments.list({ size: 200 }) });

  // parseBackendDateTime normaliza string ISO ou array Jackson [y,m,d,h,mi,s]
  const today = (appts.data?.content ?? [])
    .filter((a) => isToday(parseBackendDateTime(a.startTime as any)))
    .sort((a, b) => a.startTime.toString().localeCompare(b.startTime.toString()));

  const upcoming = (appts.data?.content ?? [])
    .filter((a) => parseBackendDateTime(a.startTime as any) > new Date())
    .slice(0, 5);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1">{greet}, {user?.fullName.split(" ")[0]}.</h1>
      </header>

      {/* Ações rápidas */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction to="/patients" search={{ new: "1" }} icon={UserPlus} title="Novo paciente" />
        <QuickAction to="/appointments" search={{ new: "1" }} icon={CalendarPlus} title="Agendar" />
        <QuickAction to="/records" icon={FilePlus} title="Novo prontuário" />
        <QuickAction to="/patients" icon={Users} title="Buscar paciente" />
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Pacientes ativos" value={patients.data?.totalElements} icon={Users} loading={patients.isLoading} />
        <KpiCard label="Consultas hoje" value={today.length} icon={CalendarDays} loading={appts.isLoading} />
        <KpiCard label="Concluídas hoje" value={today.filter(a => a.status === "CONCLUIDO").length} icon={Activity} loading={appts.isLoading} />
        <KpiCard label="Próximas" value={upcoming.length} icon={Clock} loading={appts.isLoading} />
      </section>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Agenda do dia */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Agenda de hoje</h2>
              <p className="text-xs text-muted-foreground">{today.length} consulta{today.length === 1 ? "" : "s"}</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/appointments">Ver tudo <ArrowRight className="size-3.5 ml-1" /></Link>
            </Button>
          </div>
          {appts.isLoading ? (
            <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : today.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Sem consultas hoje" description="Quando você criar agendamentos para hoje, eles aparecem aqui." />
          ) : (
            <ul className="divide-y">
              {today.map((a) => {
                const start = parseBackendDateTime(a.startTime as any);
                const end = parseBackendDateTime(a.endTime as any);
                return (
                  <li key={a.id} className="py-3 flex items-center gap-3">
                    <div className="text-center shrink-0 w-14">
                      <p className="text-base font-semibold">{format(start, "HH:mm")}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{format(end, "HH:mm")}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{a.patientName}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.reason || "—"} · Dr(a). {a.dentistName.split(" ")[0]}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Próximas */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Próximas consultas</h2>
          </div>
          {appts.isLoading ? (
            <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : upcoming.length === 0 ? (
            <EmptyState icon={Clock} title="Nenhuma futura" description="—" compact />
          ) : (
            <ul className="space-y-3">
              {upcoming.map((a) => {
                const start = parseBackendDateTime(a.startTime as any);
                return (
                  <li key={a.id} className="flex items-start gap-3">
                    <div className="size-2 rounded-full bg-accent mt-2 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.patientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(start, "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function QuickAction({ to, search, icon: Icon, title }: { to: any; search?: any; icon: any; title: string }) {
  return (
    <Link to={to} search={search}
      className="group flex items-center gap-3 p-4 rounded-xl border bg-card hover:border-primary/40 hover:shadow-sm transition-all">
      <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        <Icon className="size-4" />
      </div>
      <span className="text-sm font-medium">{title}</span>
    </Link>
  );
}

function KpiCard({ label, value, icon: Icon, loading }: { label: string; value?: number; icon: any; loading?: boolean }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold mt-3 tabular-nums">
        {loading ? <Skeleton className="h-7 w-12" /> : (value ?? 0)}
      </p>
    </Card>
  );
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const map: Record<AppointmentStatus, string> = {
    AGENDADO:       "bg-secondary text-secondary-foreground",
    CONFIRMADO:     "bg-accent/30 text-accent-foreground",
    AGUARDANDO:     "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
    EM_ATENDIMENTO: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
    CONCLUIDO:      "bg-success/20 text-success-foreground",
    CANCELADO:      "bg-muted text-muted-foreground line-through",
    NAO_COMPARECEU: "bg-destructive/15 text-destructive",
  };
  return <Badge variant="secondary" className={`${map[status]} font-medium`}>{STATUS_LABEL[status]}</Badge>;
}

export function EmptyState({ icon: Icon, title, description, compact }: { icon: any; title: string; description?: string; compact?: boolean }) {
  return (
    <div className={`text-center ${compact ? "py-4" : "py-10"}`}>
      <div className="mx-auto size-10 rounded-full bg-muted grid place-items-center mb-3">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">{description}</p>}
    </div>
  );
}
