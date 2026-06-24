import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, RotateCcw, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Odontograms, type ToothStatus } from "@/lib/api";

const STATUS_META: Record<ToothStatus, { label: string; color: string }> = {
  HIGIDO: { label: "Higido", color: "oklch(0.94 0.01 230)" },
  RESTAURADO: { label: "Restaurado", color: "oklch(0.55 0.12 230)" },
  CARIE: { label: "Carie", color: "oklch(0.65 0.2 30)" },
  CANAL: { label: "Canal", color: "oklch(0.78 0.16 75)" },
  AUSENTE: { label: "Ausente", color: "oklch(0.6 0.02 230)" },
  IMPLANTE: { label: "Implante", color: "oklch(0.5 0.13 160)" },
  COROA: { label: "Coroa", color: "oklch(0.62 0.16 295)" },
  FRATURA: { label: "Fratura", color: "oklch(0.72 0.17 50)" },
  OUTRO: { label: "Outro", color: "oklch(0.66 0.03 230)" },
};

const Q1 = [18, 17, 16, 15, 14, 13, 12, 11];
const Q2 = [21, 22, 23, 24, 25, 26, 27, 28];
const Q4 = [48, 47, 46, 45, 44, 43, 42, 41];
const Q3 = [31, 32, 33, 34, 35, 36, 37, 38];
const Q5 = [55, 54, 53, 52, 51];
const Q6 = [61, 62, 63, 64, 65];
const Q8 = [85, 84, 83, 82, 81];
const Q7 = [71, 72, 73, 74, 75];

export function Odontogram({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<number, ToothStatus>>({});
  const [selected, setSelected] = useState<ToothStatus>("CARIE");
  const [dirty, setDirty] = useState(false);
  const [showDeciduous, setShowDeciduous] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["odontogram", patientId],
    queryFn: () => Odontograms.get(patientId),
  });

  const currentTeeth = useMemo(() => {
    const next: Record<number, ToothStatus> = {};
    for (const tooth of data?.teeth ?? []) next[tooth.toothNumber] = tooth.status;
    return next;
  }, [data?.teeth]);

  const teeth = dirty ? draft : currentTeeth;

  function paint(n: number) {
    setDraft((prev) => {
      const base = dirty ? prev : currentTeeth;
      const next = { ...base };
      next[n] = selected;
      return next;
    });
    setDirty(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const changed = Object.entries(teeth)
        .map(([toothNumber, status]) => ({ toothNumber: Number(toothNumber), status }))
        .filter(({ toothNumber, status }) => currentTeeth[toothNumber] !== status);
      await Promise.all(changed.map((item) => Odontograms.record(patientId, item)));
      return changed.length;
    },
    onSuccess: (count) => {
      toast.success(count === 1 ? "1 dente atualizado." : `${count} dentes atualizados.`);
      setDirty(false);
      setDraft({});
      qc.invalidateQueries({ queryKey: ["odontogram", patientId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar odontograma."),
  });

  function reload() {
    setDraft({});
    setDirty(false);
    refetch();
  }

  function discard() {
    setDraft({});
    setDirty(false);
  }

  return (
    <div className="space-y-4">
      <Card className="p-3 sm:p-4">
        <div className="flex flex-wrap gap-2 items-center">
          {(Object.keys(STATUS_META) as ToothStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSelected(s)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-all ${
                selected === s ? "ring-2 ring-ring border-transparent" : "border-border hover:bg-muted"
              }`}
            >
              <span className="size-3 rounded-sm border" style={{ background: STATUS_META[s].color }} />
              {STATUS_META[s].label}
            </button>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowDeciduous((v) => !v)}>
              {showDeciduous ? "Permanente" : "Deciduo"}
            </Button>
            <Button variant="outline" size="sm" onClick={reload}>
              <RotateCcw className="size-3.5 mr-1.5" />Recarregar
            </Button>
            <Button variant="outline" size="sm" onClick={discard} disabled={!dirty}>
              Descartar
            </Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="size-3.5 mr-1.5" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-6 overflow-x-auto">
        {isLoading ? (
          <div className="h-40 grid place-items-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="min-w-[640px] space-y-2">
            {showDeciduous ? (
              <>
                <Arch label="Superior deciduos" left={Q5} right={Q6} teeth={teeth} onClick={paint} />
                <Divider />
                <Arch label="Inferior deciduos" left={Q8} right={Q7} teeth={teeth} onClick={paint} flip />
              </>
            ) : (
              <>
                <Arch label="Superior" left={Q1} right={Q2} teeth={teeth} onClick={paint} />
                <Divider />
                <Arch label="Inferior" left={Q4} right={Q3} teeth={teeth} onClick={paint} flip />
              </>
            )}
          </div>
        )}
      </Card>

      <Card className="p-4 flex gap-3 items-start">
        <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Clique nos dentes para aplicar o status selecionado. Ao salvar, cada alteracao vira um novo registro
          no historico clinico do backend.
          {data?.lastUpdated && <> Ultima atualizacao por {data.updatedBy}.</>}
        </p>
      </Card>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border my-3" />;
}

function Arch({
  label,
  left,
  right,
  teeth,
  onClick,
  flip,
}: {
  label: string;
  left: number[];
  right: number[];
  teeth: Record<number, ToothStatus>;
  onClick: (n: number) => void;
  flip?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
      <div className="flex gap-4 justify-center">
        <ArchHalf nums={left} teeth={teeth} onClick={onClick} flip={flip} />
        <div className="w-px bg-border" />
        <ArchHalf nums={right} teeth={teeth} onClick={onClick} flip={flip} />
      </div>
    </div>
  );
}

function ArchHalf({
  nums,
  teeth,
  onClick,
  flip,
}: {
  nums: number[];
  teeth: Record<number, ToothStatus>;
  onClick: (n: number) => void;
  flip?: boolean;
}) {
  return (
    <div className={`flex gap-1.5 ${flip ? "flex-row" : ""}`}>
      {nums.map((n) => {
        const s = teeth[n];
        return (
          <button
            key={n}
            type="button"
            onClick={() => onClick(n)}
            className="group flex flex-col items-center"
            title={s ? STATUS_META[s].label : `Dente ${n}`}
          >
            <span className="text-[10px] text-muted-foreground tabular-nums group-hover:text-foreground">{n}</span>
            <span
              className="size-8 sm:size-10 rounded-md border-2 hover:scale-110 transition-transform"
              style={{
                background: s ? STATUS_META[s].color : "oklch(0.98 0.005 240)",
                borderColor: s ? STATUS_META[s].color : "oklch(0.85 0.01 230)",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
