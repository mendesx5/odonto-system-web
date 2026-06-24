import {
  createFileRoute, Link, Navigate, Outlet, useNavigate, useRouterState,
} from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarTrigger, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Users, CalendarDays, ClipboardList, Wrench, Wallet,
  Settings, LogOut, Stethoscope, ChevronsUpDown, ShieldCheck, Clock, MessageCircle,
} from "lucide-react";
import { ROLE_LABEL, ROLE_COLOR } from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2 } from "lucide-react";

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
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background app-shell">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 route-surface">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

// ─── Nav items (sem Financeiro — tratado separadamente por role) ─────────────

const navItems = [
  { to: "/dashboard",    icon: LayoutDashboard, label: "Dashboard" },
  { to: "/patients",     icon: Users,            label: "Pacientes" },
  { to: "/appointments", icon: CalendarDays,     label: "Agenda" },
  { to: "/waiting-room", icon: Clock,            label: "Sala de Espera" },
  { to: "/recurrence",   icon: MessageCircle,    label: "Retornos" },
  { to: "/records",      icon: ClipboardList,    label: "Prontuários" },
  { to: "/procedures",   icon: Wrench,           label: "Procedimentos" },
] as const;

function AppSidebar() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2.5 px-1 py-1.5">
          <div className="size-9 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0">
            <Stethoscope className="size-4" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-bold leading-none">OdontoSystem</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
              Gestão clínica
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.label}>
                    <Link to={item.to}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* ── Financeiro — apenas ADMIN ── */}
              {user?.role === "ADMIN" && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/financial")}
                    tooltip="Financeiro"
                  >
                    <Link to="/financial">
                      <Wallet className="size-4" />
                      <span>Financeiro</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/settings")}
                  tooltip="Configurações"
                >
                  <Link to="/settings">
                    <Settings className="size-4" />
                    <span>Configurações</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {user?.role === "ADMIN" && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/admin")}
                    tooltip="Administração"
                  >
                    <Link to="/admin">
                      <ShieldCheck className="size-4" />
                      <span>Administração</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <UserButton />
      </SidebarFooter>
    </Sidebar>
  );
}

function UserButton() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { state } = useSidebar();
  if (!user) return null;
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
        <button className="flex items-center gap-2 w-full p-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-left">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {state !== "collapsed" && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate leading-tight">{user.fullName}</p>
                <span
                  className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 ${ROLE_COLOR[user.role]}`}
                >
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
              <ChevronsUpDown className="size-3.5 text-muted-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-64">
        <div className="px-3 py-2.5 border-b">
          <p className="text-sm font-semibold">{user.fullName}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <span
            className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1.5 ${ROLE_COLOR[user.role]}`}
          >
            {ROLE_LABEL[user.role]}
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
          <Settings className="size-4 mr-2" /> Configurações
        </DropdownMenuItem>
        {user.role === "ADMIN" && (
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

function TopBar() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const allNav = [
    ...navItems,
    { to: "/financial",   label: "Financeiro",    icon: Wallet },
    { to: "/settings",    label: "Configurações",  icon: Settings },
    { to: "/admin",       label: "Administração",  icon: ShieldCheck },
    { to: "/waiting-room",label: "Sala de Espera", icon: Clock },
    { to: "/recurrence",  label: "Retornos",       icon: MessageCircle },
  ];
  const current = allNav.find(
    (n) => pathname === n.to || pathname.startsWith(n.to + "/"),
  );
  return (
    <header className="h-14 border-b bg-card/60 backdrop-blur sticky top-0 z-30 flex items-center gap-2 px-3 sm:px-4">
      <SidebarTrigger />
      <div className="h-5 w-px bg-border mx-1" />
      <h1 className="text-sm font-semibold truncate flex-1">
        {current?.label ?? "OdontoSystem"}
      </h1>
      {user && (
        <span
          className={`hidden sm:inline-block text-[10px] font-semibold px-2 py-1 rounded ${ROLE_COLOR[user.role]}`}
        >
          {ROLE_LABEL[user.role]}
        </span>
      )}
    </header>
  );
}
