import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Wallet, TrendingUp, TrendingDown, Clock, Construction } from "lucide-react";

export const Route = createFileRoute("/_authenticated/financial")({
  ssr: false,
  component: FinancialPage,
});

function FinancialPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Visão geral de receitas, despesas e contas a receber.</p>
      </header>

      <Card className="p-5 sm:p-6 border-dashed bg-gradient-to-br from-card to-warning/5">
        <div className="flex items-start gap-4">
          <div className="size-11 rounded-xl bg-warning/20 text-warning-foreground grid place-items-center shrink-0">
            <Construction className="size-5" />
          </div>
          <div className="space-y-2">
            <h2 className="font-semibold">Módulo em desenvolvimento</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A integração financeira (Asaas + PIX) faz parte da v1.5 do roadmap. Os KPIs abaixo são placeholders
              estruturais — começarão a exibir dados reais assim que o backend expor
              <code className="mx-1 bg-muted px-1.5 py-0.5 rounded text-xs">/financial/*</code>.
            </p>
          </div>
        </div>
      </Card>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 opacity-60 pointer-events-none">
        <Kpi label="Receita do mês"     value="—" icon={TrendingUp} />
        <Kpi label="A receber"          value="—" icon={Clock} />
        <Kpi label="Inadimplência"      value="—" icon={TrendingDown} />
        <Kpi label="Ticket médio"       value="—" icon={Wallet} />
      </section>
    </div>
  );
}
function Kpi({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold mt-3">{value}</p>
    </Card>
  );
}
