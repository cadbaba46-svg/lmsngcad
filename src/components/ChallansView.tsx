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

      if (userCnic) {
        const { data } = await supabase
          .from("challans" as any)
          .select("id,challan_number,description,issue_date,due_date,amount,currency,status,paid_at")
          .eq("customer_cnic", userCnic)
          .order("issue_date", { ascending: false });
        if (!cancelled) setChallans((data as any) ?? []);
      } else {
        setChallans([]);
      }
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
                        >
                          <a
                            href={`https://fms.ngcad.org/challan/${encodeURIComponent(c.challan_number)}`}
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