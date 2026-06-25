import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, type FormEvent } from "react";
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

// Partículas flutuantes decorativas
const PARTICLES = [
  { x: "15%", y: "20%", size: 6,  delay: "0s",   dur: "3.2s" },
  { x: "80%", y: "15%", size: 4,  delay: "0.8s",  dur: "4.1s" },
  { x: "60%", y: "70%", size: 8,  delay: "1.5s",  dur: "3.7s" },
  { x: "30%", y: "80%", size: 5,  delay: "0.3s",  dur: "5s"   },
  { x: "90%", y: "50%", size: 4,  delay: "2s",    dur: "3.5s" },
  { x: "10%", y: "55%", size: 7,  delay: "1s",    dur: "4.5s" },
  { x: "50%", y: "30%", size: 3,  delay: "0.5s",  dur: "2.8s" },
];

function AuthPage() {
  const { user, ready, login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exitRole, setExitRole] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parallax suave no mouse (apenas no aside)
  const asideRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;
    const onMove = (e: MouseEvent) => {
      const rect = aside.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
      aside.style.setProperty("--mx", `${x}px`);
      aside.style.setProperty("--my", `${y}px`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  if (ready && user) return <Navigate to="/dashboard" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email.trim(), password);
      toast.success("Bem-vindo de volta!");

      // Animação diferente por role
      const role = (u as any)?.role ?? "ADMIN";
      const exitClass =
        role === "ADMIN"         ? "auth-exit-admin" :
        role === "DENTIST"       ? "auth-exit-dentist" :
        role === "RECEPTIONIST"  ? "auth-exit-receptionist" :
        "auth-exit-admin";
      setExitRole(exitClass);

      await new Promise((r) => setTimeout(r, 380));
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof ApiError
        ? (err.status === 0
            ? `Não consegui falar com a API em ${API_BASE}/api/v1.`
            : err.status === 401 || err.status === 403
              ? "E-mail ou senha inválidos."
              : err.message)
        : "Erro inesperado ao entrar.";
      toast.error(msg);
      setExitRole(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className={`min-h-screen grid lg:grid-cols-2 bg-background auth-page ${exitRole ?? ""}`}
    >
      {/* ── Painel visual esquerdo ── */}
      <aside
        ref={asideRef}
        className="hidden lg:flex relative overflow-hidden text-white"
        style={{
          background: "linear-gradient(135deg, #1a3a4a 0%, #0d2535 60%, #0a1e2e 100%)",
        }}
      >
        {/* Blobs animados */}
        <div className="auth-blob auth-blob-1 w-80 h-80 -top-10 -left-10"
          style={{ background: "rgba(0,184,169,0.25)" }} />
        <div className="auth-blob auth-blob-2 w-64 h-64 bottom-10 right-0"
          style={{ background: "rgba(0,184,169,0.18)" }} />
        <div className="auth-blob auth-blob-3 w-48 h-48 top-1/2 left-1/3"
          style={{ background: "rgba(41,121,255,0.12)" }} />

        {/* Partículas flutuantes */}
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="auth-particle absolute rounded-full"
            style={{
              left: p.x, top: p.y,
              width: p.size, height: p.size,
              background: "rgba(0,184,169,0.6)",
              "--duration": p.dur,
              animationDelay: p.delay,
            } as any}
          />
        ))}

        {/* Grelha sutil */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Conteúdo com parallax */}
        <div
          className="relative z-10 flex flex-col justify-between p-12 w-full"
          style={{ transform: "translate(var(--mx,0), var(--my,0))", transition: "transform 0.1s ease-out" }}
        >
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl grid place-items-center"
              style={{ background: "rgba(0,184,169,0.25)", border: "1px solid rgba(0,184,169,0.4)" }}>
              <Stethoscope className="size-5 text-[#00b8a9]" />
            </div>
            <span className="text-lg font-bold tracking-tight">OdontoSystem</span>
          </div>

          <div className="space-y-7 max-w-md">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#00b8a9] mb-3">
                Gestão Clínica
              </p>
              <h1 className="text-4xl font-bold leading-tight text-white">
                A gestão da sua clínica,{" "}
                <span className="text-[#00b8a9]">sem ruído.</span>
              </h1>
            </div>
            <p className="text-white/70 text-base leading-relaxed">
              Prontuário digital, agenda, odontograma e financeiro — tudo conectado por uma API aberta.
            </p>
            <ul className="space-y-3 text-sm">
              <Feature icon={<ShieldCheck className="size-4" />} text="Conformidade LGPD e prontuário criptografado" />
              <Feature icon={<Sparkles className="size-4" />} text="Agenda inteligente com lembretes via WhatsApp" />
              <Feature icon={<Lock className="size-4" />} text="Acesso por perfil: Admin, Dentista e Recepção" />
            </ul>
          </div>

          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} OdontoSystem · API pública e documentada
          </p>
        </div>
      </aside>

      {/* ── Formulário ── */}
      <main className="flex items-center justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="size-9 rounded-lg grid place-items-center text-white"
              style={{ background: "#1a3a4a" }}>
              <Stethoscope className="size-4" />
            </div>
            <span className="text-base font-bold text-[#1a3a4a]">OdontoSystem</span>
          </div>

          {/* Toggle */}
          <div className="grid grid-cols-2 p-1 rounded-lg mb-8 text-sm"
            style={{ background: "#eef2f7" }}>
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="py-2 rounded-md transition-all font-medium"
                style={mode === m
                  ? { background: "#ffffff", boxShadow: "0 1px 4px rgba(0,0,0,0.1)", color: "#1a3a4a" }
                  : { color: "#6b7f96" }
                }
              >
                {m === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {mode === "login" ? (
            <form onSubmit={onSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-[#1a3a4a]">Acesse sua conta</h2>
                <p className="text-sm mt-1" style={{ color: "#6b7f96" }}>Use as credenciais cadastradas no sistema.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#1a3a4a] font-medium">E-mail</Label>
                <Input id="email" type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@suaclinica.com"
                  style={{ borderColor: "#dde3ec", background: "#f5f7fa" }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#1a3a4a] font-medium">Senha</Label>
                <div className="relative">
                  <Input id="password" type={showPass ? "text" : "password"} autoComplete="current-password" required
                    value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10"
                    style={{ borderColor: "#dde3ec", background: "#f5f7fa" }}
                  />
                  <button type="button" onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md"
                    style={{ color: "#6b7f96" }}>
                    {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full text-white font-semibold" size="lg" disabled={loading}
                style={{ background: loading ? "#6b7f96" : "#1a3a4a", border: "none" }}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Entrar"}
              </Button>
              <p className="text-xs text-center" style={{ color: "#6b7f96" }}>
                Problemas para acessar? Fale com o{" "}
                <span className="underline cursor-pointer" style={{ color: "#00b8a9" }}>
                  administrador da clínica
                </span>.
              </p>
            </form>
          ) : (
            <Card className="p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 border-dashed">
              <div className="flex gap-3">
                <div className="size-10 rounded-lg grid place-items-center shrink-0"
                  style={{ background: "rgba(255,179,0,0.15)" }}>
                  <Lock className="size-4" style={{ color: "#ffb300" }} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-[#1a3a4a]">Cadastro em breve</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#6b7f96" }}>
                    O endpoint <code className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#eef2f7" }}>POST /users</code> ainda
                    não existe no backend. Novos usuários são criados pelo admin diretamente no servidor.
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
      <span className="size-7 rounded-md grid place-items-center"
        style={{ background: "rgba(0,184,169,0.2)", color: "#00b8a9" }}>
        {icon}
      </span>
      <span className="text-white/80">{text}</span>
    </li>
  );
}
