import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Eraser, Play, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  clearAdminDebugEvents,
  analyzeAdminDebugJson,
  formatAdminDebugEvents,
  getAdminDebugEvents,
  subscribeAdminDebugEvents,
  type AdminDebugEvent,
  type AdminDebugStatus,
} from "@/lib/admin-debug-console";

const statusStyles: Record<AdminDebugStatus, string> = {
  info: "bg-muted-foreground",
  success: "bg-emerald-500",
  error: "bg-destructive",
};

export function DebugConsole() {
  const [events, setEvents] = useState<AdminDebugEvent[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [manualStatus, setManualStatus] = useState<AdminDebugStatus | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEvents(getAdminDebugEvents());
    return subscribeAdminDebugEvents(() => setEvents(getAdminDebugEvents()));
  }, []);

  const automaticCode = useMemo(() => formatAdminDebugEvents(events), [events]);
  const displayedCode = manualStatus ? manualCode : automaticCode;
  const status = manualStatus ?? events.at(-1)?.status ?? "info";
  const statusText =
    status === "success" ? "Sucesso" : status === "error" ? "Erro" : "Aguardando carregamento";

  function clear() {
    clearAdminDebugEvents();
    setManualCode("");
    setManualStatus(null);
    setCopied(false);
  }

  function analyzeManualCode() {
    const result = analyzeAdminDebugJson(manualCode);
    setManualStatus(result.status);
    if (result.status === "success") setManualCode(result.formatted);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(displayedCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="debug-console-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" aria-hidden="true" />
            <h1 id="debug-console-title" className="text-2xl font-extrabold">
              Debug Console
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe as consultas e páginas carregadas na aba Hashes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={copyCode}>
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Clipboard className="mr-2 h-4 w-4" />}
            {copied ? "Copiado!" : "Copiar Código"}
          </Button>
          <Button variant="outline" onClick={clear}>
            <Eraser className="mr-2 h-4 w-4" /> Limpar console
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-mono text-xs text-muted-foreground">carregamento-atual.json</span>
          <span className="inline-flex items-center gap-2 text-xs font-semibold" aria-live="polite">
            <span
              className={`h-2.5 w-2.5 rounded-full ${statusStyles[status]}`}
              aria-hidden="true"
            />
            {statusText}
          </span>
        </div>
        <pre className="max-h-[28rem] min-h-40 overflow-auto bg-slate-950 p-4 text-xs leading-6 text-slate-100 sm:text-sm">
          <code>{displayedCode || "[]"}</code>
        </pre>
        {events.length === 0 && !manualStatus ? (
          <p className="border-t px-4 py-3 text-xs text-muted-foreground">
            Abra a aba Hashes para registrar a próxima consulta. Os registros ficam apenas nesta
            sessão.
          </p>
        ) : null}
      </div>

      <div className="space-y-2 rounded-xl bg-background p-4 shadow-sm">
        <Label htmlFor="debug-manual-json">Colar código para análise</Label>
        <Textarea
          id="debug-manual-json"
          value={manualCode}
          onChange={(event) => {
            setManualCode(event.target.value);
            setManualStatus(null);
          }}
          placeholder="Cole aqui um JSON de resposta ou log…"
          className="min-h-28 font-mono text-xs"
          spellCheck={false}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={analyzeManualCode}>
            <Play className="mr-2 h-4 w-4" /> Analisar JSON
          </Button>
          {manualStatus === "error" ? (
            <span role="alert" className="text-sm text-destructive">
              O conteúdo não é um JSON válido.
            </span>
          ) : manualStatus === "success" ? (
            <span role="status" className="text-sm text-emerald-700">
              JSON válido e formatado.
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
