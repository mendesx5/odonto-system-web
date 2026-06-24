import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ApiError, API_BASE } from "@/lib/api";
import { toast } from "sonner";
import { Stethoscope, Loader2, Eye, EyeOff, ShieldCheck, Sparkles, Lock } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  if (ready && user) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success("Bem-vindo de volta!");
      document.documentElement.classList.add("auth-transitioning");
      await new Promise((resolve) => setTimeout(resolve, 180));
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof ApiError
        ? (err.status === 0
            ? `Não consegui falar com a API em ${API_BASE}/api/v1. Verifique se o backend Spring está rodando.`
            : err.status === 401 || err.status === 403
              ? "E-mail ou senha inválidos."
              : err.message)
        : "Erro inesperado ao entrar.";
      toast.error(msg);
    } finally {
      document.documentElement.classList.remove("auth-transitioning");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background auth-page">
      {/* Painel visual */}
      <aside className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-primary via-primary to-[oklch(0.28_0.05_215)] text-primary-foreground">
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: "radial-gradient(circle at 20% 30%, oklch(0.72 0.13 175 / 0.4), transparent 50%), radial-gradient(circle at 80% 70%, oklch(0.55 0.12 230 / 0.3), transparent 50%)" }} />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-white/15 backdrop-blur grid place-items-center">
              <Stethoscope className="size-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">OdontoSystem</span>
          </div>
          <div className="space-y-6 max-w-md">
            <h1 className="text-4xl font-bold leading-tight">
              A gestão da sua clínica, <span className="text-accent">sem ruído</span>.
            </h1>
            <p className="text-primary-foreground/80 text-base leading-relaxed">
              Prontuário digital, agenda, odontograma e financeiro — tudo conectado por uma API aberta.
            </p>
            <ul className="space-y-3 text-sm">
              <Feature icon={<ShieldCheck className="size-4" />} text="Conformidade LGPD e prontuário criptografado" />
              <Feature icon={<Sparkles className="size-4" />} text="Agenda inteligente com lembretes via WhatsApp" />
              <Feature icon={<Lock className="size-4" />} text="Acesso por perfil: Admin, Dentista e Recepção" />
            </ul>
          </div>
          <p className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} OdontoSystem · API pública e documentada</p>
        </div>
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="size-9 rounded-lg bg-primary grid place-items-center text-primary-foreground">
              <Stethoscope className="size-4" />
            </div>
            <span className="text-base font-semibold">OdontoSystem</span>
          </div>

          {/* Toggle login/cadastro */}
          <div className="grid grid-cols-2 p-1 rounded-lg bg-muted mb-8 text-sm">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`py-2 rounded-md transition-all font-medium ${mode === "login" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >Entrar</button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`py-2 rounded-md transition-all font-medium ${mode === "register" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >Criar conta</button>
          </div>

          {mode === "login" ? (
            <form onSubmit={onSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Acesse sua conta</h2>
                <p className="text-sm text-muted-foreground mt-1">Use as credenciais cadastradas no sistema.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@suaclinica.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input id="password" type={showPass ? "text" : "password"} autoComplete="current-password" required
                    value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                  <button type="button" onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
                    {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Entrar"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Problemas para acessar? Fale com o administrador da clínica.
              </p>
            </form>
          ) : (
            <Card className="p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 border-dashed">
              <div className="flex gap-3">
                <div className="size-10 rounded-lg bg-warning/15 text-warning-foreground grid place-items-center shrink-0">
                  <Lock className="size-4" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Cadastro em breve</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    O endpoint <code className="text-xs bg-muted px-1.5 py-0.5 rounded">POST /users</code> ainda
                    não existe no backend. Por enquanto, novos usuários (Dentista, Recepcionista, Admin)
                    são criados pelo administrador da clínica diretamente no servidor.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Assim que o módulo de usuários estiver pronto no backend, esta tela passa a permitir cadastro com escolha de função.
                  </p>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setMode("login")}>
                Voltar para o login
              </Button>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="size-7 rounded-md bg-white/10 grid place-items-center">{icon}</span>
      <span>{text}</span>
    </li>
  );
}
