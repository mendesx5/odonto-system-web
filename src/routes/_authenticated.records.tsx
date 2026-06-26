import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { EmptyState } from "./_authenticated.dashboard";
import { ClipboardList, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/records")({
  ssr: false,
  component: RecordsGuard,
});

function RecordsGuard() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (user?.role === "RECEPTIONIST") return <Navigate to="/dashboard" replace />;
  return <RecordsHub />;
}

function RecordsHub() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold">Prontuários</h1>
        <p className="text-sm text-muted-foreground">Acesso ao histórico clínico dos pacientes.</p>
      </header>
      <Card className="p-10">
        <EmptyState icon={ClipboardList}
          title="Abra o prontuário pelo paciente"
          description="Prontuários, evolução e procedimentos ficam dentro da ficha de cada paciente. Acesse a lista de pacientes e selecione um para ver o histórico." />
        <div className="text-center mt-4">
          <Button asChild><Link to="/patients">Ir para pacientes <ArrowRight className="size-4 ml-1.5" /></Link></Button>
        </div>
      </Card>
    </div>
  );
}
