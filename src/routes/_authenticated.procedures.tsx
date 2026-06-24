import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Procedures } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "./_authenticated.dashboard";

export const Route = createFileRoute("/_authenticated/procedures")({
  ssr: false,
  component: ProceduresPage,
});

function ProceduresPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["procedures"], queryFn: () => Procedures.catalog() });
  const filtered = useMemo(
    () => (data ?? []).filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase())),
    [data, q]
  );
  const grouped = useMemo(() => {
    const m: Record<string, typeof filtered> = {};
    for (const p of filtered) (m[p.category] ??= []).push(p);
    return m;
  }, [filtered]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold">Catálogo de procedimentos</h1>
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} procedimentos disponíveis.</p>
      </header>
      <Card className="p-3">
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar procedimento…" className="pl-9 border-0 shadow-none focus-visible:ring-0 h-10" />
        </div>
      </Card>
      {isLoading ? <Skeleton className="h-40" /> :
        Object.keys(grouped).length === 0 ? (
          <Card className="p-10"><EmptyState icon={Wrench} title="Nada encontrado" /></Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([cat, items]) => (
              <section key={cat}>
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{cat}</h2>
                <div className="grid sm:grid-cols-2 gap-2">
                  {items.map(p => (
                    <Card key={p.id} className="p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{p.name}</p>
                        {p.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.description}</p>}
                      </div>
                      <Badge variant="secondary" className="shrink-0">{p.defaultDurationMinutes}min</Badge>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
    </div>
  );
}
