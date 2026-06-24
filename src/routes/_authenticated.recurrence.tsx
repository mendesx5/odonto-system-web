import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Recurrence, formatPhone, type RecurrenceEntry } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RefreshCw, MessageCircle, Phone, User, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { EmptyState } from "./_authenticated.dashboard";

export const Route = createFileRoute("/_authenticated/recurrence")({
  ssr: false,
  component: RecurrencePage,
});

function RecurrencePage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["recurrence-list"],
    queryFn: () => Recurrence.list(),
  });

  const list: RecurrenceEntry[] = data ?? [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Retornos Preventivos</h1>
          <p className="text-sm text-muted-foreground">
            Pacientes sem consulta há mais de 6 meses — envie lembretes via WhatsApp.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`size-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </header>

      {/* Contador */}
      {!isLoading && list.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="size-4" />
          <span>
            <strong className="text-foreground">{list.length}</strong> paciente
            {list.length !== 1 ? "s" : ""} para contato
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : list.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={MessageCircle}
            title="Nenhum paciente para retorno"
            description="Todos os pacientes consultaram nos últimos 6 meses. Ótimo!"
          />
        </Card>
      ) : (
        <ul className="space-y-2">
          {list.map((entry) => (
            <RecurrenceCard key={entry.patientId} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RecurrenceCard({ entry }: { entry: RecurrenceEntry }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(entry.messageTemplate);

  const trigger = useMutation({
    mutationFn: () => Recurrence.trigger(entry.phone, message),
    onSuccess: () => {
      toast.success(`Mensagem enviada para ${entry.fullName}!`);
      setOpen(false);
    },
    onError: (e: any) =>
      toast.error(e?.message ?? "Erro ao enviar mensagem. Verifique a configuração da Evolution API."),
  });

  return (
    <>
      <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 border-l-4 border-l-green-500">
        {/* Avatar inicial */}
        <div className="size-10 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold text-sm shrink-0">
          {entry.fullName.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{entry.fullName}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Phone className="size-3" />
            {entry.phone ? formatPhone(entry.phone) : "Sem telefone"}
          </p>
        </div>

        {/* Ação */}
        <Button
          size="sm"
          disabled={!entry.phone}
          onClick={() => {
            setMessage(entry.messageTemplate);
            setOpen(true);
          }}
          className="shrink-0"
        >
          <MessageCircle className="size-4 mr-1.5" />
          Enviar WhatsApp
        </Button>
      </Card>

      {/* Dialog de confirmação + edição da mensagem */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar mensagem via WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm p-3 rounded-md bg-muted/50 border">
              <Phone className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium">{entry.fullName}</p>
                <p className="text-muted-foreground">{formatPhone(entry.phone)}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mensagem</Label>
              <Textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="resize-none text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Você pode editar a mensagem antes de enviar.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => trigger.mutate()}
              disabled={trigger.isPending || !message.trim()}
            >
              {trigger.isPending ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Send className="size-4 mr-2" />
              )}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
