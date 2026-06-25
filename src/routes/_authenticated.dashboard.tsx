import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Appointments, Patients, STATUS_LABEL, parseBackendDateTime, type AppointmentStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarPlus, UserPlus, FilePlus, Activity, Users,
  CalendarDays, ArrowRight, Clock, Search,
} from "lucide-react";
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

  const today = (appts.data?.content ?? [])
    .filter((a) => isToday(parseBackendDateTime(a.startTime as any)))
    .sort((a, b) => a.startTime.toString().localeCompare(b.startTime.toString()));

  const upcoming = (appts.data?.content ?? [])
    .filter((a) => parseBackendDateTime(a.startTime as any) > new Date())
    .slice(0, 5);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = user?.fullName.split(" ")[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <header>
        <p className="text-sm" style={{ color: "#6b7f96" }}>
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1" style={{ color: "#1a3a4a" }}>
          {greet}, {firstName}.
        </h1>
      </header>

      {/* Ações rápidas com gradientes */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction
          to="/patients" search={{ new: "1" }}
          icon={UserPlus} title="Novo paciente"
          gradient="linear-gradient(135deg, #1a3a4a 0%, #0d5c6b 100%)"
          iconBg="rgba(0,184,169,0.2)"
          iconColor="#00b8a9"
        />
        <QuickAction
          to="/appointments" search={{ new: "1" }}
          icon={CalendarPlus} title="Agendar"
          gradient="linear-gradient(135deg, #00b8a9 0%, #009688 100%)"
          iconBg="rgba(255,255,255,0.2)"
          iconColor="#ffffff"
          light
        />
        <QuickAction
          to="/records"
          icon={FilePlus} title="Novo prontuário"
          gradient="linear-gradient(135deg, #1e4976 0%, #1a3a4a 100%)"
          iconBg="rgba(0,184,169,0.2)"
          iconColor="#00b8a9"
        />
        <QuickAction
          to="/patients"
          icon={Search} title="Buscar paciente"
          gradient="linear-gradient(135deg, #2d7d9a 0%, #1a3a4a 100%)"
          iconBg="rgba(255,255,255,0.15)"
          iconColor="#ffffff"
          light
        />
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Pacientes ativos" value={patients.data?.totalElements}
          icon={Users} loading={patients.isLoading}
          accent="#00b8a9"
        />
        <KpiCard
          label="Consultas hoje" value={today.length}
          icon={CalendarDays} loading={appts.isLoading}
          accent="#2979ff"
        />
        <KpiCard
          label="Concluídas hoje" value={today.filter((a) => a.status === "CONCLUIDO").length}
          icon={Activity} loading={appts.isLoading}
          accent="#00c48c"
        />
        <KpiCard
          label="Próximas" value={upcoming.length}
          icon={Clock} loading={appts.isLoading}
          accent="#ffb300"
        />
      </section>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Agenda do dia */}
        <div className="lg:col-span-2 rounded-xl border bg-white shadow-sm p-5"
          style={{ borderColor: "#dde3ec" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-[#1a3a4a]">Agenda de hoje</h2>
              <p className="text-xs" style={{ color: "#6b7f96" }}>
                {today.length} consulta{today.length === 1 ? "" : "s"}
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-[#00b8a9] hover:text-[#009688]">
              <Link to="/appointments">Ver tudo <ArrowRight className="size-3.5 ml-1" /></Link>
            </Button>
          </div>
          {appts.isLoading ? (
            <div className="space-y-2">{[0,1,2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : today.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Sem consultas hoje"
              description="Quando você criar agendamentos para hoje, eles aparecem aqui." />
          ) : (
            <ul className="divide-y divide-[#eef2f7]">
              {today.map((a) => {
                const start = parseBackendDateTime(a.startTime as any);
                const end   = parseBackendDateTime(a.endTime as any);
                return (
                  <li key={a.id} className="py-3 flex items-center gap-3">
                    <div className="text-center shrink-0 w-14">
                      <p className="text-base font-bold text-[#1a3a4a]">{format(start, "HH:mm")}</p>
                      <p className="text-[10px] uppercase" style={{ color: "#6b7f96" }}>{format(end, "HH:mm")}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-[#1a3a4a]">{a.patientName}</p>
                      <p className="text-xs truncate" style={{ color: "#6b7f96" }}>
                        {a.reason || "—"} · Dr(a). {a.dentistName.split(" ")[0]}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Próximas */}
        <div className="rounded-xl border bg-white shadow-sm p-5" style={{ borderColor: "#dde3ec" }}>
          <h2 className="font-semibold text-[#1a3a4a] mb-4">Próximas consultas</h2>
          {appts.isLoading ? (
            <div className="space-y-2">{[0,1,2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : upcoming.length === 0 ? (
            <EmptyState icon={Clock} title="Nenhuma futura" compact />
          ) : (
            <ul className="space-y-3">
              {upcoming.map((a) => {
                const start = parseBackendDateTime(a.startTime as any);
                return (
                  <li key={a.id} className="flex items-start gap-3">
                    <div className="size-2 rounded-full mt-2 shrink-0" style={{ background: "#00b8a9" }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-[#1a3a4a]">{a.patientName}</p>
                      <p className="text-xs" style={{ color: "#6b7f96" }}>
                        {format(start, "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function QuickAction({
  to, search, icon: Icon, title, gradient, iconBg, iconColor, light,
}: {
  to: any; search?: any; icon: any; title: string;
  gradient: string; iconBg: string; iconColor: string; light?: boolean;
}) {
  return (
    <Link
      to={to} search={search}
      className="quick-action-card group flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-xl text-white"
      style={{ background: gradient, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
    >
      <div className="size-10 rounded-lg grid place-items-center shrink-0 transition-transform group-hover:scale-110"
        style={{ background: iconBg }}>
        <Icon className="size-4" style={{ color: iconColor }} />
      </div>
      <span className={`text-sm font-semibold leading-tight ${light ? "text-white" : "text-white/90"}`}>
        {title}
      </span>
    </Link>
  );
}

function KpiCard({ label, value, icon: Icon, loading, accent }: {
  label: string; value?: number; icon: any; loading?: boolean; accent: string;
}) {
  return (
    <div className="rounded-xl border bg-white shadow-sm p-4" style={{ borderColor: "#dde3ec" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#6b7f96" }}>
          {label}
        </span>
        <div className="size-8 rounded-lg grid place-items-center"
          style={{ background: accent + "18" }}>
          <Icon className="size-4" style={{ color: accent }} />
        </div>
      </div>
      <p className="text-3xl font-bold tabular-nums" style={{ color: "#1a3a4a" }}>
        {loading ? <Skeleton className="h-8 w-12 inline-block" /> : (value ?? 0)}
      </p>
    </div>
  );
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const map: Record<AppointmentStatus, { bg: string; color: string }> = {
    AGENDADO:       { bg: "#eef2f7",             color: "#2d4a5e" },
    CONFIRMADO:     { bg: "rgba(0,184,169,0.15)", color: "#009688" },
    AGUARDANDO:     { bg: "rgba(103,58,183,0.12)", color: "#7c3aed" },
    EM_ATENDIMENTO: { bg: "rgba(41,121,255,0.12)", color: "#2979ff" },
    CONCLUIDO:      { bg: "rgba(0,196,140,0.15)", color: "#00b87a" },
    CANCELADO:      { bg: "#f5f5f5",             color: "#9e9e9e" },
    NAO_COMPARECEU: { bg: "rgba(229,57,53,0.12)", color: "#e53935" },
  };
  const s = map[status];
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description, compact }: {
  icon: any; title: string; description?: string; compact?: boolean;
}) {
  return (
    <div className={`text-center ${compact ? "py-4" : "py-10"}`}>
      <div className="mx-auto size-10 rounded-full grid place-items-center mb-3"
        style={{ background: "#eef2f7" }}>
        <Icon className="size-5" style={{ color: "#6b7f96" }} />
      </div>
      <p className="text-sm font-medium text-[#1a3a4a]">{title}</p>
      {description && (
        <p className="text-xs mt-1 max-w-xs mx-auto" style={{ color: "#6b7f96" }}>{description}</p>
      )}
    </div>
  );
}
