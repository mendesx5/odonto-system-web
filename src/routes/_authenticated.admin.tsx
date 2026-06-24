import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users, ApiError, ROLE_LABEL, ROLE_COLOR,
  type UserRecord, type UserRole, type UserCreateRequest,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ShieldCheck, UserPlus, Loader2, Eye, EyeOff, KeyRound,
  UserCheck, UserX, Users as UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  component: AdminGuard,
});

/** Guarda de acesso: redireciona não-admins para o dashboard */
function AdminGuard() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (user?.role !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return <AdminPage />;
}

function AdminPage() {
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [openCreate, setOpenCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["users", roleFilter],
    queryFn: () =>
      roleFilter === "ALL"
        ? Users.list({ size: 100 })
        : Users.list({ role: roleFilter, size: 100 }),
  });

  const users = data?.content ?? [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="size-5 text-amber-600" />
            <h1 className="text-xl sm:text-2xl font-bold">Administração</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Área restrita — apenas o Administrador pode acessar esta seção.
          </p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="size-4 mr-1.5" /> Novo usuário
            </Button>
          </DialogTrigger>
          <CreateUserDialog onClose={() => setOpenCreate(false)} />
        </Dialog>
      </header>

      {/* Filtros de função */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["ALL", "ADMIN", "DENTIST", "RECEPTIONIST"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              roleFilter === r
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:border-primary/50"
            }`}
          >
            {r === "ALL" ? "Todos" : ROLE_LABEL[r]}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">
          {users.length} usuário{users.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">{[0,1,2].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : users.length === 0 ? (
        <Card className="p-10 text-center">
          <UsersIcon className="size-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Nenhum usuário encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">Crie o primeiro usuário com o botão acima.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((u) => <UserRow key={u.id} user={u} />)}
        </div>
      )}
    </div>
  );
}

function UserRow({ user }: { user: UserRecord }) {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [openPass, setOpenPass] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const isSelf = user.id === me?.id;

  const toggleActive = useMutation({
    mutationFn: () => user.active ? Users.deactivate(user.id) : Users.activate(user.id),
    onSuccess: () => {
      toast.success(user.active ? "Usuário desativado." : "Usuário ativado.");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro."),
  });

  const initials = user.fullName.split(" ").filter(Boolean).slice(0, 2).map(s => s[0]).join("").toUpperCase();

  return (
    <Card className={`p-4 flex items-center gap-4 ${!user.active ? "opacity-60" : ""}`}>
      {/* Avatar */}
      <div className={`size-10 rounded-full grid place-items-center text-sm font-bold shrink-0 ${ROLE_COLOR[user.role]}`}>
        {initials}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold">{user.fullName}</p>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ROLE_COLOR[user.role]}`}>
            {ROLE_LABEL[user.role]}
          </span>
          {!user.active && (
            <Badge variant="destructive" className="text-[10px] py-0">Inativo</Badge>
          )}
          {isSelf && (
            <Badge variant="secondary" className="text-[10px] py-0">Você</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Editar */}
        <Dialog open={openEdit} onOpenChange={setOpenEdit}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">Editar</Button>
          </DialogTrigger>
          <EditUserDialog user={user} onClose={() => setOpenEdit(false)} />
        </Dialog>

        {/* Resetar senha */}
        <Dialog open={openPass} onOpenChange={setOpenPass}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <KeyRound className="size-3.5" />
            </Button>
          </DialogTrigger>
          <ResetPasswordDialog userId={user.id} userName={user.fullName} onClose={() => setOpenPass(false)} />
        </Dialog>

        {/* Ativar / Desativar — não pode desativar a si mesmo */}
        {!isSelf && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={user.active ? "text-destructive hover:bg-destructive/10" : "text-green-600 hover:bg-green-50"}
              >
                {user.active
                  ? <UserX className="size-3.5" />
                  : <UserCheck className="size-3.5" />
                }
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {user.active ? "Desativar" : "Ativar"} usuário?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {user.active
                    ? `${user.fullName} não conseguirá mais acessar o sistema até ser reativado.`
                    : `${user.fullName} voltará a ter acesso ao sistema.`
                  }
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => toggleActive.mutate()}
                  className={user.active ? "bg-destructive hover:bg-destructive/90" : ""}
                >
                  {toggleActive.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                  {user.active ? "Desativar" : "Ativar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </Card>
  );
}

/* ─── Formulário: Criar usuário ─── */
function CreateUserDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<UserCreateRequest>({ fullName: "", email: "", password: "", role: "DENTIST" });
  const [showPass, setShowPass] = useState(false);

  const m = useMutation({
    mutationFn: (data: UserCreateRequest) => Users.create(data),
    onSuccess: () => {
      toast.success("Usuário criado com sucesso.");
      qc.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (e: any) => {
      const msg = e instanceof ApiError
        ? (e.status === 409 ? "E-mail já cadastrado." : e.body?.message ?? e.message)
        : "Erro ao criar usuário.";
      toast.error(msg);
    },
  });

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <UserPlus className="size-4" /> Novo usuário
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(form); }} className="space-y-4">
        <Field label="Nome completo *">
          <Input required minLength={3} value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </Field>
        <Field label="E-mail *">
          <Input required type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Função *">
          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DENTIST">Dentista</SelectItem>
              <SelectItem value="RECEPTIONIST">Recepcionista</SelectItem>
              <SelectItem value="ADMIN">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Senha *">
          <div className="relative">
            <Input required type={showPass ? "text" : "password"} minLength={6}
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="pr-10" placeholder="Mínimo 6 caracteres" />
            <button type="button" onClick={() => setShowPass(v => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground">
              {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={m.isPending}>
            {m.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}Criar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

/* ─── Formulário: Editar usuário ─── */
function EditUserDialog({ user, onClose }: { user: UserRecord; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ fullName: user.fullName, email: user.email, role: user.role });

  const m = useMutation({
    mutationFn: () => Users.update(user.id, form),
    onSuccess: () => {
      toast.success("Usuário atualizado.");
      qc.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar."),
  });

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>Editar usuário</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
        <Field label="Nome completo *">
          <Input required minLength={3} value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </Field>
        <Field label="E-mail *">
          <Input required type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Função *">
          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DENTIST">Dentista</SelectItem>
              <SelectItem value="RECEPTIONIST">Recepcionista</SelectItem>
              <SelectItem value="ADMIN">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={m.isPending}>
            {m.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}Salvar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

/* ─── Formulário: Resetar senha ─── */
function ResetPasswordDialog({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const m = useMutation({
    mutationFn: () => Users.resetPassword(userId, { newPassword }),
    onSuccess: () => {
      toast.success(`Senha de ${userName} redefinida.`);
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao redefinir senha."),
  });

  return (
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <KeyRound className="size-4" /> Redefinir senha
        </DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">
        Definindo nova senha para <strong>{userName}</strong>.
      </p>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
        <Field label="Nova senha *">
          <div className="relative">
            <Input required type={showPass ? "text" : "password"} minLength={6}
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="pr-10" placeholder="Mínimo 6 caracteres" />
            <button type="button" onClick={() => setShowPass(v => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground">
              {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={m.isPending}>
            {m.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}Redefinir
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}
