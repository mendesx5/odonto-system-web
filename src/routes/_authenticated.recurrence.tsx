import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Recurrence, formatPhone, type RecurrenceEntry } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  RefreshCw, MessageCircle, Phone, User, Send, Loader2,
  CheckCircle2, Info, Smartphone,
} from "lucide-react";
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
  const withPhone = list.filter((e) => !!e.phone);
  const withoutPhone = list.filter((e) => !e.phone);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Retornos Preventivos</h1>
          <p className="text-sm text-muted-foreground">
            Pacientes sem consulta há mais de 6 meses — lembretes automáticos via WhatsApp às 8h.
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

      {/* Banner informativo — lembretes automáticos */}
      <Card className="p-4 flex items-start gap-3 border-l-4 border-l-[#00b8a9] bg-[#f0faf9]">
        <Smartphone className="size-5 text-[#00b8a9] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#1a3a4a]">Lembretes automáticos ativos</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            O sistema envia automaticamente lembretes via WhatsApp todo dia às <strong>8h</strong> para pacientes
            com consultas agendadas ou confirmadas para o dia seguinte. Aqui você pode enviar mensagens
            de retorno manualmente para quem está há mais de 6 meses sem visita.
          </p>
        </div>
      </Card>

      {/* Counters */}
      {!isLoading && list.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="gap-1.5 text-xs">
            <User className="size-3" />
            {list.length} paciente{list.length !== 1 ? "s" : ""} para contato
          </Badge>
          {withPhone.length > 0 && (
            <Badge className="gap-1.5 text-xs bg-green-100 text-green-800 hover:bg-green-100">
              <CheckCircle2 className="size-3" />
              {withPhone.length} com WhatsApp
            </Badge>
          )}
          {withoutPhone.length > 0 && (
            <Badge variant="outline" className="gap-1.5 text-xs text-muted-foreground">
              <Info className="size-3" />
              {withoutPhone.length} sem telefone
            </Badge>
          )}
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
        <div className="space-y-4">
          {/* Com telefone */}
          {withPhone.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Prontos para envio
              </p>
              <ul className="space-y-2">
                {withPhone.map((entry) => (
                  <RecurrenceCard key={entry.patientId} entry={entry} />
                ))}
              </ul>
            </div>
          )}

          {/* Sem telefone */}
          {withoutPhone.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Sem telefone cadastrado
              </p>
              <ul className="space-y-2">
                {withoutPhone.map((entry) => (
                  <RecurrenceCard key={entry.patientId} entry={entry} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RecurrenceCard({ entry }: { entry: RecurrenceEntry }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(entry.messageTemplate);
  const hasPhone = !!entry.phone;

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
      <Card
        className={`p-4 flex flex-col sm:flex-row sm:items-center gap-4 border-l-4 ${
          hasPhone ? "border-l-green-500" : "border-l-gray-300 opacity-70"
        }`}
      >
        {/* Avatar */}
        <div className="size-10 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold text-sm shrink-0">
          {entry.fullName.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{entry.fullName}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Phone className="size-3" />
            {hasPhone ? formatPhone(entry.phone) : "Sem telefone cadastrado"}
          </p>
        </div>

        {/* Ação */}
        <Button
          size="sm"
          disabled={!hasPhone}
          variant={hasPhone ? "default" : "ghost"}
          onClick={() => {
            setMessage(entry.messageTemplate);
            setOpen(true);
          }}
          className="shrink-0"
        >
          <MessageCircle className="size-4 mr-1.5" />
          {hasPhone ? "Enviar WhatsApp" : "Sem telefone"}
        </Button>
      </Card>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="size-4 text-green-600" />
              Enviar mensagem via WhatsApp
            </DialogTitle>
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
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
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
