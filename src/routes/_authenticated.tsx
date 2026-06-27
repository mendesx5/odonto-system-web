import {
  createFileRoute, Link, Navigate, Outlet, useNavigate, useRouterState,
} from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard, Users, CalendarDays, ClipboardList, Wrench, Wallet,
  Settings, LogOut, Stethoscope, ChevronsUpDown, ShieldCheck, Clock,
  MessageCircle, Menu, X,
} from "lucide-react";
import { ROLE_LABEL, ROLE_COLOR } from "@/lib/api";
import type { UserRole } from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2 } from "lucide-react";
import { DenticoLogo } from "@/components/dentico-logo";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthGate,
});

function AuthGate() {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <AppShell />;
}

// ─── Permissões por role ──────────────────────────────────────────────────────

/** Itens que cada role NÃO pode ver */
const HIDDEN_FOR_ROLE: Record<UserRole, string[]> = {
  ADMIN:        [],
  DENTIST:      ["/financial", "/admin"],
  RECEPTIONIST: ["/financial", "/records", "/admin"],
};

function canSee(role: UserRole, to: string): boolean {
  return !HIDDEN_FOR_ROLE[role]?.includes(to);
}

// ─── Nav items ───────────────────────────────────────────────────────────────

const navItems = [
  { to: "/dashboard",    icon: LayoutDashboard, label: "Dashboard" },
  { to: "/patients",     icon: Users,           label: "Pacientes" },
  { to: "/appointments", icon: CalendarDays,    label: "Agenda" },
  { to: "/waiting-room", icon: Clock,           label: "Sala de Espera" },
  { to: "/recurrence",   icon: MessageCircle,   label: "Retornos" },
  { to: "/records",      icon: ClipboardList,   label: "Prontuários" },
  { to: "/procedures",   icon: Wrench,          label: "Procedimentos" },
  { to: "/financial",    icon: Wallet,          label: "Financeiro" },
] as const;

// ─── App Shell ───────────────────────────────────────────────────────────────

function AppShell() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const role = user?.role ?? "RECEPTIONIST";

  const visibleNavItems = navItems.filter((item) => canSee(role, item.to));

  // Bottom nav mobile — sempre mostra Início, Agenda, Espera, Pacientes + Mais
  const bottomNav = [
    { to: "/dashboard",    icon: LayoutDashboard, label: "Início" },
    { to: "/appointments", icon: CalendarDays,    label: "Agenda" },
    { to: "/waiting-room", icon: Clock,           label: "Espera" },
    { to: "/patients",     icon: Users,           label: "Pacientes" },
  ] as const;

  function NavContent({ onLinkClick }: { onLinkClick?: () => void }) {
    return (
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {visibleNavItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onLinkClick}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${isActive(item.to)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"}
            `}
          >
            <item.icon className="size-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        ))}

        <div className="pt-2 mt-2 border-t space-y-0.5">
          <Link
            to="/settings"
            onClick={onLinkClick}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${isActive("/settings")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"}
            `}
          >
            <Settings className="size-4 shrink-0" />
            <span>Configurações</span>
          </Link>

          {canSee(role, "/admin") && (
            <Link
              to="/admin"
              onClick={onLinkClick}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive("/admin")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"}
              `}
            >
              <ShieldCheck className="size-4 shrink-0" />
              <span>Administração</span>
            </Link>
          )}
        </div>
      </nav>
    );
  }

  return (
    <div className="min-h-screen flex bg-background app-shell">

      {/* ══════════════════════════════════════════════
          DESKTOP SIDEBAR
          ══════════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-64 shrink-0 bg-card border-r h-screen sticky top-0">
        <div className="h-14 flex items-center px-4 border-b shrink-0">
          <DenticoLogo variant="horizontal" iconSize={32} />
        </div>

        <NavContent />

        <div className="border-t p-2 shrink-0">
          <UserButton />
        </div>
      </aside>

      {/* ══════════════════════════════════════════════
          MOBILE DRAWER
          ══════════════════════════════════════════════ */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-50 flex flex-col w-72 bg-card border-r
          transition-transform duration-300 ease-in-out lg:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="h-14 flex items-center gap-2.5 px-4 border-b shrink-0">
          <DenticoLogo variant="horizontal" iconSize={32} />
          <div className="flex-1" />
          <button
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            <X className="size-4" />
          </button>
        </div>

        <NavContent onLinkClick={() => setMobileOpen(false)} />

        <div className="border-t p-2 shrink-0">
          <UserButton />
        </div>
      </aside>

      {/* ══════════════════════════════════════════════
          MAIN CONTENT
          ══════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopBar onMenuClick={() => setMobileOpen((v) => !v)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 pb-20 lg:pb-8 route-surface">
          <Outlet />
        </main>

        {/* ── Bottom Nav (somente mobile) ── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t flex items-stretch safe-bottom">
          {bottomNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`
                flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors py-2
                ${isActive(item.to) ? "text-primary" : "text-muted-foreground"}
              `}
            >
              <item.icon className={`size-5 transition-transform ${isActive(item.to) ? "scale-110" : ""}`} />
              {item.label}
            </Link>
          ))}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground py-2"
          >
            <Menu className="size-5" />
            Mais
          </button>
        </nav>
      </div>
    </div>
  );
}

// ─── UserButton ───────────────────────────────────────────────────────────────

function UserButton() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const role = user.role;

  const initials = user.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted transition-colors text-left">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate leading-tight">{user.fullName}</p>
            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 ${ROLE_COLOR[user.role]}`}>
              {ROLE_LABEL[user.role]}
            </span>
          </div>
          <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-64">
        <div className="px-3 py-2.5 border-b">
          <p className="text-sm font-semibold">{user.fullName}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1.5 ${ROLE_COLOR[user.role]}`}>
            {ROLE_LABEL[user.role]}
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
          <Settings className="size-4 mr-2" /> Configurações
        </DropdownMenuItem>
        {canSee(role, "/admin") && (
          <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
            <ShieldCheck className="size-4 mr-2" /> Administração
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => { logout(); navigate({ to: "/auth" }); }}
          className="text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="size-4 mr-2" /> Sair da conta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const allNav = [
    ...navItems,
    { to: "/settings",    label: "Configurações",  icon: Settings },
    { to: "/admin",       label: "Administração",  icon: ShieldCheck },
  ];

  const current = allNav.find(
    (n) => pathname === n.to || pathname.startsWith(n.to + "/"),
  );

  return (
    <header className="h-14 border-b bg-card/80 backdrop-blur sticky top-0 z-30 flex items-center gap-3 px-4 shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-md hover:bg-muted transition-colors"
        aria-label="Abrir menu"
      >
        <Menu className="size-5" />
      </button>

      <h1 className="text-sm font-semibold truncate flex-1">
        {current?.label ?? "Dentico"}
      </h1>

      {user && (
        <span className={`hidden sm:inline-block text-[10px] font-semibold px-2 py-1 rounded ${ROLE_COLOR[user.role]}`}>
          {ROLE_LABEL[user.role]}
        </span>
      )}
    </header>
  );
}
