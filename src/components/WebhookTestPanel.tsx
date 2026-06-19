import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Webhook, CheckCircle2, XCircle, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

interface TestResult {
  ok: boolean;
  reachable?: boolean;
  status?: number;
  statusText?: string;
  elapsedMs?: number;
  webhook_url?: string;
  response?: unknown;
  sent_payload?: unknown;
  error?: string;
}

const WEBHOOK_URL =
  "https://mfjiskptanjgzcsxmmez.supabase.co/functions/v1/admission-webhook";

const WebhookTestPanel = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "test-admission-webhook",
        { body: {} }
      );
      if (error) {
        setResult({ ok: false, error: error.message });
        toast.error("Webhook test failed");
      } else {
        setResult(data as TestResult);
        if ((data as TestResult).ok) toast.success("Webhook reachable");
        else toast.error("Webhook responded but secret may be wrong");
      }
    } catch (e: any) {
      setResult({ ok: false, error: e?.message ?? "Unexpected error" });
      toast.error("Webhook test failed");
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = async () => {
    await navigator.clipboard.writeText(WEBHOOK_URL);
    toast.success("Webhook URL copied");
  };

  const statusColor =
    !result ? "text-muted-foreground"
      : result.ok ? "text-green-600" : "text-destructive";

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Admissions Portal Webhook
          </h3>
        </div>

        <div className="space-y-1 text-sm">
          <div className="text-muted-foreground">Endpoint URL</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono break-all text-foreground">
              {WEBHOOK_URL}
            </code>
            <Button size="sm" variant="outline" onClick={copyUrl} className="gap-1">
              <Copy className="h-3 w-3" /> Copy
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={runTest} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Testing…
              </>
            ) : (
              <>
                <Webhook className="h-4 w-4" /> Send Test Request
              </>
            )}
          </Button>
          {result && (
            <div className={`flex items-center gap-1.5 text-sm font-medium ${statusColor}`}>
              {result.ok ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span>
                {result.error
                  ? "Error"
                  : `HTTP ${result.status} ${result.statusText ?? ""}`}
              </span>
              {typeof result.elapsedMs === "number" && (
                <span className="text-muted-foreground ml-2">
                  ({result.elapsedMs} ms)
                </span>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Sends a sample payload (no real user is created) to verify the
          endpoint is reachable and the shared secret is configured correctly.
          A <code>200</code> means the secret matches; a <code>400</code>{" "}
          payload-validation response also confirms the secret is valid.
          A <code>401</code> means the secret is wrong or missing.
        </p>
      </div>

      {result && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <h4 className="font-semibold text-foreground">Response</h4>
          {result.error ? (
            <div className="text-sm text-destructive">{result.error}</div>
          ) : (
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-80 text-foreground">
{JSON.stringify(result.response, null, 2)}
            </pre>
          )}
          {result.sent_payload != null && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Sent payload
              </summary>
              <pre className="bg-muted p-3 rounded mt-2 overflow-auto text-foreground">
{JSON.stringify(result.sent_payload, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

export default WebhookTestPanel;