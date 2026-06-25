import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Save, RotateCcw, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Odontograms, type ToothStatus } from "@/lib/api";

// ── Paleta de status ──────────────────────────────────────────────────────────
const STATUS_META: Record<ToothStatus, { label: string; fill: string; stroke: string; textColor?: string }> = {
  HIGIDO:     { label: "Hígido",     fill: "#f0fafa", stroke: "#b2dfdb", textColor: "#1a3a4a" },
  RESTAURADO: { label: "Restaurado", fill: "#1565c0", stroke: "#0d47a1", textColor: "#fff" },
  CARIE:      { label: "Cárie",      fill: "#e53935", stroke: "#b71c1c", textColor: "#fff" },
  CANAL:      { label: "Canal",      fill: "#f9a825", stroke: "#f57f17", textColor: "#fff" },
  AUSENTE:    { label: "Ausente",    fill: "#90a4ae", stroke: "#607d8b", textColor: "#fff" },
  IMPLANTE:   { label: "Implante",   fill: "#2e7d32", stroke: "#1b5e20", textColor: "#fff" },
  COROA:      { label: "Coroa",      fill: "#6a1b9a", stroke: "#4a148c", textColor: "#fff" },
  FRATURA:    { label: "Fratura",    fill: "#e64a19", stroke: "#bf360c", textColor: "#fff" },
  OUTRO:      { label: "Outro",      fill: "#546e7a", stroke: "#37474f", textColor: "#fff" },
};

// ── Numeração FDI ─────────────────────────────────────────────────────────────
const Q1 = [18, 17, 16, 15, 14, 13, 12, 11];
const Q2 = [21, 22, 23, 24, 25, 26, 27, 28];
const Q4 = [48, 47, 46, 45, 44, 43, 42, 41];
const Q3 = [31, 32, 33, 34, 35, 36, 37, 38];
const Q5 = [55, 54, 53, 52, 51];
const Q6 = [61, 62, 63, 64, 65];
const Q8 = [85, 84, 83, 82, 81];
const Q7 = [71, 72, 73, 74, 75];

// ── Forma de dente SVG genérica ───────────────────────────────────────────────
// Molares = mais largos; caninos/incisivos = mais estreitos; décimos = menor
function toothPath(n: number, _upper: boolean) {
  // largura relativa por tipo de dente
  const lastDigit = n % 10;
  const isDeciduous = n >= 51;
  const W = isDeciduous ? 20 : lastDigit >= 6 ? 24 : lastDigit >= 3 ? 20 : 18;
  const H = isDeciduous ? 26 : 32;
  const rx = W / 2;
  const ry = 5;
  // Coroa: retângulo arredondado na parte de cima
  // Raiz: triângulo embaixo
  const bodyH = H * 0.65;
  const rootH = H * 0.35;
  return { W, H, bodyH, rootH, rx };
}

// SVG de um único dente
function ToothSVG({
  n, status, upper, onClick, selected,
}: {
  n: number; status: ToothStatus | undefined; upper: boolean;
  onClick: () => void; selected: boolean;
}) {
  const isDeciduous = n >= 51;
  const lastDigit = n % 10;
  const W = isDeciduous ? 22 : lastDigit >= 6 ? 26 : lastDigit >= 3 ? 22 : 20;
  const TOTAL_H = isDeciduous ? 40 : 52;
  const bodyH = TOTAL_H * 0.62;
  const rootH = TOTAL_H * 0.38;
  const rx = W / 2 - 2;

  const meta = status ? STATUS_META[status] : STATUS_META.HIGIDO;
  const isAbsent = status === "AUSENTE";

  // Raiz points (trapézio afunilado)
  const rootW = W * 0.45;
  const rootX = (W - rootW) / 2;
  // Superior: raiz apontando para cima; inferior: apontando para baixo
  const rootPoints = upper
    ? `${rootX},${bodyH} ${rootX + rootW},${bodyH} ${W / 2 + 2},${bodyH + rootH} ${W / 2 - 2},${bodyH + rootH}`
    : `${rootX},0 ${rootX + rootW},0 ${W / 2 + 2},${-rootH + bodyH > 0 ? bodyH - rootH : 0} ${W / 2 - 2},${bodyH - rootH > 0 ? bodyH - rootH : 0}`;

  // Para dente inferior: corpo em cima, raiz embaixo
  const bodyY = upper ? 0 : rootH;
  const rootPointsLower = `${rootX},${TOTAL_H} ${rootX + rootW},${TOTAL_H} ${W / 2 + 2},${rootH} ${W / 2 - 2},${rootH}`;

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Dente ${n}${status ? " — " + meta.label : ""}`}
      className="flex flex-col items-center gap-0.5 group focus:outline-none"
      style={{ padding: "2px" }}
    >
      {/* Número superior */}
      {upper && (
        <span className="text-[9px] tabular-nums transition-colors"
          style={{ color: selected ? "#00b8a9" : "#6b7f96", fontWeight: selected ? 700 : 400 }}>
          {n}
        </span>
      )}

      <svg
        width={W + 4} height={TOTAL_H + 4}
        viewBox={`-2 -2 ${W + 4} ${TOTAL_H + 4}`}
        className="transition-transform group-hover:scale-110 cursor-pointer"
        style={{ filter: selected ? "drop-shadow(0 0 4px rgba(0,184,169,0.6))" : undefined }}
      >
        {isAbsent ? (
          /* Dente ausente: X */
          <>
            <line x1="2" y1="2" x2={W - 2} y2={TOTAL_H - 2} stroke="#90a4ae" strokeWidth="2" strokeLinecap="round" />
            <line x1={W - 2} y1="2" x2="2" y2={TOTAL_H - 2} stroke="#90a4ae" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* Raiz */}
            <polygon
              points={upper ? rootPoints : rootPointsLower}
              fill={meta.fill}
              stroke={meta.stroke}
              strokeWidth="1.2"
              opacity="0.7"
            />
            {/* Coroa (corpo) */}
            <rect
              x={0} y={upper ? 0 : rootH}
              width={W} height={bodyH}
              rx={rx} ry={4}
              fill={meta.fill}
              stroke={meta.stroke}
              strokeWidth={selected ? "2" : "1.5"}
            />
            {/* Detalhe central (linha oclusal) */}
            {!["HIGIDO"].includes(status ?? "HIGIDO") && (
              <line
                x1={W * 0.3} y1={(upper ? bodyH : rootH + bodyH) / 2}
                x2={W * 0.7} y2={(upper ? bodyH : rootH + bodyH) / 2}
                stroke={meta.stroke} strokeWidth="1" opacity="0.5"
              />
            )}
            {/* Inicial do status */}
            {status && status !== "HIGIDO" && (
              <text
                x={W / 2} y={upper ? bodyH / 2 + 1 : rootH + bodyH / 2 + 1}
                textAnchor="middle" dominantBaseline="middle"
                fill={meta.textColor ?? "#fff"}
                fontSize={isDeciduous ? "7" : "8"}
                fontWeight="700"
                fontFamily="system-ui, sans-serif"
              >
                {meta.label.charAt(0)}
              </text>
            )}
          </>
        )}
      </svg>

      {/* Número inferior */}
      {!upper && (
        <span className="text-[9px] tabular-nums transition-colors"
          style={{ color: selected ? "#00b8a9" : "#6b7f96", fontWeight: selected ? 700 : 400 }}>
          {n}
        </span>
      )}
    </button>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
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
      return { ...base, [n]: selected };
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

  function reload() { setDraft({}); setDirty(false); refetch(); }
  function discard() { setDraft({}); setDirty(false); }

  return (
    <div className="space-y-3">
      {/* ── Barra de status ── */}
      <div className="rounded-xl border bg-white p-3" style={{ borderColor: "#dde3ec" }}>
        <div className="flex flex-wrap gap-2 items-center">
          {(Object.keys(STATUS_META) as ToothStatus[]).map((s) => {
            const m = STATUS_META[s];
            const active = selected === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSelected(s)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: active ? m.fill : "#f5f7fa",
                  border: active ? `2px solid ${m.stroke}` : "2px solid #dde3ec",
                  color: active ? (m.textColor === "#fff" ? m.stroke : "#1a3a4a") : "#6b7f96",
                  boxShadow: active ? `0 0 0 3px ${m.fill}` : undefined,
                }}
              >
                <span className="size-3 rounded-sm inline-block"
                  style={{ background: m.fill, border: `1.5px solid ${m.stroke}` }} />
                {m.label}
              </button>
            );
          })}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowDeciduous((v) => !v)}
              className="text-xs border-[#dde3ec]">
              {showDeciduous ? "Permanente" : "Deciduo"}
            </Button>
            <Button variant="outline" size="sm" onClick={reload} className="text-xs border-[#dde3ec]">
              <RotateCcw className="size-3.5 mr-1" />Recarregar
            </Button>
            <Button variant="outline" size="sm" onClick={discard} disabled={!dirty}
              className="text-xs border-[#dde3ec]">
              Descartar
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={!dirty || saveMutation.isPending}
              className="text-xs text-white"
              style={{ background: "#1a3a4a", border: "none" }}
            >
              {saveMutation.isPending
                ? <Loader2 className="size-3.5 mr-1 animate-spin" />
                : <Save className="size-3.5 mr-1" />}
              Salvar
            </Button>
          </div>
        </div>
      </div>

      {/* ── Odontograma ── */}
      <div className="rounded-xl border bg-white shadow-sm" style={{ borderColor: "#dde3ec" }}>
        {isLoading ? (
          <div className="h-52 grid place-items-center">
            <Loader2 className="size-5 animate-spin text-[#00b8a9]" />
          </div>
        ) : (
          <div className="p-4 overflow-x-auto">
            <div className="min-w-[480px] space-y-1">
              {showDeciduous ? (
                <>
                  <Arch label="Superior deciduos" left={Q5} right={Q6} teeth={teeth} onClick={paint} upper />
                  <div className="h-px my-3" style={{ background: "#dde3ec" }} />
                  <Arch label="Inferior deciduos" left={Q8} right={Q7} teeth={teeth} onClick={paint} upper={false} />
                </>
              ) : (
                <>
                  <Arch label="Superior" left={Q1} right={Q2} teeth={teeth} onClick={paint} upper />
                  <div className="h-px my-3" style={{ background: "#dde3ec" }} />
                  <Arch label="Inferior" left={Q4} right={Q3} teeth={teeth} onClick={paint} upper={false} />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legenda / dica */}
      <div className="rounded-xl border p-3 flex gap-3 items-start"
        style={{ borderColor: "#dde3ec", background: "#f5f7fa" }}>
        <Info className="size-4 shrink-0 mt-0.5" style={{ color: "#00b8a9" }} />
        <p className="text-xs" style={{ color: "#6b7f96" }}>
          Clique nos dentes para aplicar o status selecionado. Ao salvar, cada alteração vira um novo registro
          no histórico clínico do backend.
          {data?.lastUpdated && <> Última atualização por {data.updatedBy}.</>}
        </p>
      </div>
    </div>
  );
}

// ── Arco ─────────────────────────────────────────────────────────────────────
function Arch({ label, left, right, teeth, onClick, upper }: {
  label: string; left: number[]; right: number[];
  teeth: Record<number, ToothStatus>; onClick: (n: number) => void; upper: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest mb-2 font-semibold"
        style={{ color: "#6b7f96" }}>{label}</p>
      <div className="flex gap-3 justify-center items-end">
        <div className="flex gap-1 items-end">
          {left.map((n) => (
            <ToothSVG key={n} n={n} status={teeth[n]} upper={upper}
              onClick={() => onClick(n)} selected={false} />
          ))}
        </div>
        <div className="w-px self-stretch my-1" style={{ background: "#dde3ec" }} />
        <div className="flex gap-1 items-end">
          {right.map((n) => (
            <ToothSVG key={n} n={n} status={teeth[n]} upper={upper}
              onClick={() => onClick(n)} selected={false} />
          ))}
        </div>
      </div>
    </div>
  );
}
