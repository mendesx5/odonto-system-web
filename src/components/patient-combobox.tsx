import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Patients, formatCpf, type Patient } from "@/lib/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: Patient | null;
  onChange: (p: Patient | null) => void;
  placeholder?: string;
}

/**
 * Combobox que busca pacientes no backend por nome OU CPF (debounced).
 * Usa GET /patients?name= ou ?cpf= — sem precisar do ID na mão.
 */
export function PatientCombobox({ value, onChange, placeholder = "Buscar paciente por nome ou CPF…" }: Props) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const debounced = useDebounce(term, 250);

  const isCpf = useMemo(() => /\d/.test(debounced) && debounced.replace(/\D/g, "").length >= 3, [debounced]);

  const { data, isFetching } = useQuery({
    queryKey: ["patients", "search", debounced, isCpf],
    queryFn: () => Patients.list({
      ...(isCpf ? { cpf: debounced.replace(/\D/g, "") } : { name: debounced }),
      size: 8,
    }),
    enabled: open && debounced.length >= 2,
    staleTime: 10_000,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open}
          className="w-full justify-between font-normal h-10">
          {value ? (
            <span className="truncate text-left">
              <span className="font-medium">{value.fullName}</span>
              <span className="text-muted-foreground ml-2 text-xs">{formatCpf(value.cpf)}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="size-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[280px]" align="start">
        <div className="flex items-center border-b px-3 gap-2">
          <Search className="size-4 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Nome ou CPF…"
            className="border-0 focus-visible:ring-0 px-0 h-10 shadow-none"
            autoFocus
          />
          {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {debounced.length < 2 && (
            <p className="text-xs text-muted-foreground p-4 text-center">Digite ao menos 2 caracteres.</p>
          )}
          {debounced.length >= 2 && !isFetching && data?.content?.length === 0 && (
            <p className="text-xs text-muted-foreground p-4 text-center">Nenhum paciente encontrado.</p>
          )}
          {data?.content?.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => { onChange(p); setOpen(false); setTerm(""); }}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent/40 flex items-center gap-2 border-b last:border-0"
            >
              <Check className={cn("size-4 shrink-0", value?.id === p.id ? "opacity-100 text-primary" : "opacity-0")} />
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{p.fullName}</p>
                <p className="text-xs text-muted-foreground">{formatCpf(p.cpf)} · {p.age} anos</p>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function useDebounce<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
