import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api, ROLE_LABEL, ROLE_COLOR, API_URL } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  User, ShieldCheck, ArrowRight, Info, Bell, Palette, Lock,
  Moon, Sun, Monitor, KeyRound, Loader2, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  component: SettingsPage,
});

// ─── Preferências salvas no localStorage (sem backend) ───────────────────────
const PREFS_KEY = "odonto.prefs";

interface Prefs {
  theme: "light" | "dark" | "system";
  notifyNewAppointment: boolean;
  notifyStatusChange: boolean;
  notifyCancellation: boolean;
  compactMode: boolean;
}

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...defaultPrefs(), ...JSON.parse(raw) };
  } catch { /* noop */ }
  return defaultPrefs();
}

function defaultPrefs(): Prefs {
  return {
    theme: "system",
    notifyNewAppointment: false,
    notifyStatusChange: false,
    notifyCancellation: false,
    compactMode: false,
  };
}

function savePrefs(p: Prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  // Aplica tema imediatamente
  const root = document.documentElement;
  if (p.theme === "dark") root.classList.add("dark");
  else if (p.theme === "light") root.classList.remove("dark");
  else {
    // system: segue preferenciaOS
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    prefersDark ? root.classList.add("dark") : root.classList.remove("dark");
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function SettingsPage() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);

  if (!user) return null;

  function updatePref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(next);
    toast.success("Preferência salva.");
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Personalize sua experiência no OdontoSystem.
        </p>
      </header>

      {/* ── 1. Meu perfil ── */}
      <SectionCard
        icon={<User className="size-4" />}
        iconBg="bg-primary/10 text-primary"
        title="Meu perfil"
        description="Seus dados de acesso ao sistema."
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nome">
            <Input value={user.fullName} disabled />
          </Field>
          <Field label="E-mail">
            <Input value={user.email} disabled />
          </Field>
          <Field label="Função">
            <div className="flex items-center h-9">
              <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded ${ROLE_COLOR[user.role]}`}>
                {ROLE_LABEL[user.role]}
              </span>
            </div>
          </Field>
          <Field label="API conectada">
            <div className="flex items-center h-9">
              <code className="text-xs bg-muted px-2 py-1.5 rounded truncate">{API_URL}</code>
            </div>
          </Field>
        </div>
        <InfoNote>
          Para alterar nome, e-mail, senha ou status de usuário, solicite ao administrador da clínica.
        </InfoNote>
      </SectionCard>

      {/* ── 3. Aparência ── */}
      <SectionCard
        icon={<Palette className="size-4" />}
        iconBg="bg-violet-100 text-violet-700"
        title="Aparência"
        description="Tema e densidade da interface."
      >
        {/* Tema */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Tema</Label>
          <div className="flex gap-2">
            {(["light", "system", "dark"] as const).map((t) => {
              const Icon = t === "light" ? Sun : t === "dark" ? Moon : Monitor;
              const label = t === "light" ? "Claro" : t === "dark" ? "Escuro" : "Sistema";
              return (
                <button
                  key={t}
                  onClick={() => updatePref("theme", t)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-colors ${
                    prefs.theme === t
                      ? "border-primary bg-primary/5 font-medium"
                      : "hover:bg-muted"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Modo compacto */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Modo compacto</p>
            <p className="text-xs text-muted-foreground">Reduz o espaçamento para exibir mais itens na tela.</p>
          </div>
          <Switch
            checked={prefs.compactMode}
            onCheckedChange={(v) => updatePref("compactMode", v)}
          />
        </div>
      </SectionCard>

      {/* ── 4. Notificações ── */}
      {/*
      <SectionCard
        icon={<Bell className="size-4" />}
        iconBg="bg-blue-100 text-blue-700"
        title="Notificações"
        description="Controle quais alertas você recebe no sistema."
      >
        <ToggleRow
          label="Novo agendamento"
          description="Avisa quando uma consulta é criada."
          checked={prefs.notifyNewAppointment}
          onChange={(v) => updatePref("notifyNewAppointment", v)}
        />
        <Separator />
        <ToggleRow
          label="Mudança de status"
          description="Avisa quando uma consulta é confirmada ou concluída."
          checked={prefs.notifyStatusChange}
          onChange={(v) => updatePref("notifyStatusChange", v)}
        />
        <Separator />
        <ToggleRow
          label="Cancelamentos"
          description="Avisa quando uma consulta é cancelada ou não compareceu."
          checked={prefs.notifyCancellation}
          onChange={(v) => updatePref("notifyCancellation", v)}
        />
      </SectionCard>
      */}

      {/* ── 5. Administração (só ADMIN) ── */}
      {user.role === "ADMIN" && (
        <SectionCard
          icon={<ShieldCheck className="size-4" />}
          iconBg="bg-amber-100 text-amber-700"
          title="Administração"
          description="Cadastro de dentistas, recepcionistas e outros admins. Redefinição de senhas. Ativação / desativação de usuários."
        >
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/admin">
              Ir para Administração <ArrowRight className="size-4 ml-2" />
            </Link>
          </Button>
        </SectionCard>
      )}

      {/* ── 6. Sobre o sistema ── */}
      <SectionCard
        icon={<Info className="size-4" />}
        iconBg="bg-gray-100 text-gray-600"
        title="Sobre o OdontoSystem"
        description="Informações da versão e links úteis."
      >
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <Dt label="Versão">
            <Badge variant="secondary">v1.0 — MVP</Badge>
          </Dt>
          <Dt label="Stack">
            <span className="text-muted-foreground">React + Spring Boot 3.5</span>
          </Dt>
          <Dt label="Banco de dados">
            <span className="text-muted-foreground">PostgreSQL · Railway</span>
          </Dt>
          <Dt label="Deploy frontend">
            <span className="text-muted-foreground">Vercel</span>
          </Dt>
        </dl>
        <InfoNote>
          Para reportar bugs ou solicitar novas funcionalidades, entre em contato com o administrador.
        </InfoNote>
      </SectionCard>
    </div>
  );
}

// ─── Seção de alteração de senha (auto-serviço) ───────────────────────────────

function PasswordSection({ userId }: { userId: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  const m = useMutation({
    mutationFn: () => api(`/users/${userId}/password`, {
      method: "PATCH",
      body: { currentPassword: current, newPassword: next },
    }),
    onSuccess: () => {
      toast.success("Senha alterada com sucesso.");
      setCurrent(""); setNext(""); setConfirm("");
      setDone(true);
      setTimeout(() => setDone(false), 4000);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao alterar senha."),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) return toast.error("A nova senha deve ter ao menos 8 caracteres.");
    if (next !== confirm) return toast.error("As senhas não coincidem.");
    m.mutate();
  }

  return (
    <SectionCard
      icon={<KeyRound className="size-4" />}
      iconBg="bg-rose-100 text-rose-700"
      title="Alterar senha"
      description="Troque a sua senha de acesso."
    >
      <form onSubmit={submit} className="space-y-3">
        <Field label="Senha atual">
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Nova senha">
            <Input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </Field>
          <Field label="Confirmar nova senha">
            <Input
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={m.isPending}>
            {m.isPending
              ? <><Loader2 className="size-4 mr-2 animate-spin" />Salvando…</>
              : done
              ? <><CheckCircle2 className="size-4 mr-2 text-green-600" />Salvo!</>
              : <><Lock className="size-4 mr-2" />Alterar senha</>
            }
          </Button>
        </div>
        <InfoNote>
          Mínimo de 8 caracteres. Use letras, números e símbolos para maior segurança.
        </InfoNote>
      </form>
    </SectionCard>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function SectionCard({
  icon, iconBg, title, description, children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3 mb-5">
        <div className={`size-9 rounded-lg grid place-items-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-md bg-muted/40 text-xs text-muted-foreground">
      <Info className="size-3.5 shrink-0 mt-0.5" />
      {children}
    </div>
  );
}

function ToggleRow({
  label, description, checked, onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Dt({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
