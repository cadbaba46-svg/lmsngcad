import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, ExternalLink, Receipt } from "lucide-react";

const FMS_URL = "https://alpihkjywjhutukwxplj.supabase.co";
const FMS_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFscGloa2p5d2podXR1a3d4cGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4Njg5NzIsImV4cCI6MjA4NzQ0NDk3Mn0.Q229Q-Pt6ZabsDOftyrnLlkDiZdKwUm-78Ee5Pi9ZAM";

interface Challan {
  id: string;
  challan_number: string;
  description: string | null;
  issue_date: string | null;
  due_date: string | null;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
}

interface Props {
  title: string;
  icon: ReactNode;
  variant: "summary" | "full";
}

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—";

const ChallansView = ({ title, icon, variant }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cnic, setCnic] = useState<string | null>(null);
  const [challans, setChallans] = useState<Challan[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("cnic")
        .eq("user_id", user.id)
        .maybeSingle();
      const userCnic = (profile as any)?.cnic ?? null;
      if (cancelled) return;
      setCnic(userCnic);

      const { data } = await supabase
        .from("challans" as any)
        .select("id,challan_number,description,issue_date,due_date,amount,currency,status,paid_at")
        .eq("user_id", user.id)
        .order("issue_date", { ascending: false });
      const local: Challan[] = (data as any) ?? [];

      // Also fetch challans from FMS by CNIC (FMS is a separate backend where
      // vouchers generated on fms.ngcad.org are stored).
      let remote: Challan[] = [];
      if (userCnic) {
        try {
          const res = await fetch(
            `${FMS_URL}/rest/v1/challans?customer_cnic=eq.${encodeURIComponent(
              userCnic
            )}&select=id,challan_number,description,due_date,created_at,amount,currency,status,paid_at&order=created_at.desc`,
            {
              headers: {
                apikey: FMS_ANON,
                Authorization: `Bearer ${FMS_ANON}`,
              },
            }
          );
          if (res.ok) {
            const rows = await res.json();
            remote = (rows as any[]).map((r) => ({
              id: `fms-${r.id}`,
              challan_number: r.challan_number,
              description: r.description,
              issue_date: r.created_at,
              due_date: r.due_date,
              amount: r.amount,
              currency: r.currency || "PKR",
              status: r.status,
              paid_at: r.paid_at,
            }));
          }
        } catch {
          // ignore FMS failures; local list still renders
        }
      }

      // Merge, dedupe by challan_number preferring the most recently updated
      const byNumber = new Map<string, Challan>();
      for (const c of [...local, ...remote]) {
        const key = c.challan_number || c.id;
        const existing = byNumber.get(key);
        if (!existing) byNumber.set(key, c);
        else {
          // prefer the paid one if statuses differ
          if (c.status?.toLowerCase() === "paid") byNumber.set(key, c);
        }
      }
      const merged = Array.from(byNumber.values()).sort((a, b) => {
        const da = a.issue_date ? new Date(a.issue_date).getTime() : 0;
        const db = b.issue_date ? new Date(b.issue_date).getTime() : 0;
        return db - da;
      });
      if (!cancelled) setChallans(merged);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const unpaid = challans.filter((c) => c.status?.toLowerCase() !== "paid");
  const totalDue = unpaid.reduce((s, c) => s + Number(c.amount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          {icon} {title}
        </h2>
        {!loading && cnic && (
          <p className="text-sm text-muted-foreground">
            CNIC: <span className="font-mono font-medium text-foreground">{cnic}</span>
          </p>
        )}
      </div>

      {variant === "summary" && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard label="Total Vouchers" value={String(challans.length)} />
          <SummaryCard label="Unpaid" value={String(unpaid.length)} tone="danger" />
          <SummaryCard label="Outstanding Amount" value={`PKR ${totalDue.toLocaleString()}`} tone="danger" />
        </div>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !cnic ? (
          <EmptyState
            title="CNIC not set on your profile"
            subtitle="Please update your profile with a CNIC so we can load your vouchers."
          />
        ) : challans.length === 0 ? (
          <EmptyState
            title="All caught up!"
            subtitle="No pending dues or vouchers found."
            icon={<CheckCircle2 className="h-10 w-10 text-green-600" />}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Challan No</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challans.map((c) => {
                const paid = c.status?.toLowerCase() === "paid";
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.challan_number}</TableCell>
                    <TableCell className="font-medium">{c.description || "—"}</TableCell>
                    <TableCell>{fmt(c.issue_date)}</TableCell>
                    <TableCell>{fmt(c.due_date)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {c.currency} {Number(c.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          paid
                            ? "bg-green-600 hover:bg-green-600 text-white"
                            : "bg-red-600 hover:bg-red-600 text-white"
                        }
                      >
                        {paid ? "Paid" : "Unpaid"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {paid ? (
                        <span className="text-xs text-muted-foreground">{fmt(c.paid_at)}</span>
                      ) : (
                        <Button
                          size="sm"
                          asChild
                          variant="default"
                          disabled={!cnic}
                        >
                          <a
                            href={`https://fms.ngcad.org/?cnic=${encodeURIComponent(cnic || "")}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Pay / Print <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

const SummaryCard = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger";
}) => (
  <div className="rounded-lg border border-border bg-card p-4">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p
      className={`mt-2 text-2xl font-bold ${
        tone === "danger" ? "text-red-600" : "text-foreground"
      }`}
    >
      {value}
    </p>
  </div>
);

const EmptyState = ({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon?: ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6">
    <div className="mb-3">{icon ?? <Receipt className="h-10 w-10 text-muted-foreground" />}</div>
    <h3 className="font-semibold text-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
  </div>
);

export default ChallansView;