import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageSquare, Trash2 } from "lucide-react";

interface Row {
  id: string;
  student_id: string;
  subject: string;
  category: string;
  message: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  student_name?: string;
  student_roll?: string;
}

const statusColor: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  in_progress: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  resolved: "bg-green-500/15 text-green-700 dark:text-green-300",
};

const AdminComplaintsPanel = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<string>("all");

  const fetchAll = async () => {
    const { data } = await supabase
      .from("complaints" as any)
      .select("*")
      .order("created_at", { ascending: false });
    const items = (data || []) as unknown as Row[];
    const ids = Array.from(new Set(items.map((r) => r.student_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, roll_number")
        .in("user_id", ids);
      const map = Object.fromEntries((profs || []).map((p) => [p.user_id, p]));
      items.forEach((r) => {
        r.student_name = map[r.student_id]?.full_name || "Unknown";
        r.student_roll = map[r.student_id]?.roll_number || "";
      });
    }
    setRows(items);
  };

  useEffect(() => { fetchAll(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("complaints" as any).update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Status updated"); fetchAll(); }
  };

  const saveResponse = async (id: string) => {
    const text = (drafts[id] || "").trim();
    if (!text) { toast.error("Response cannot be empty"); return; }
    const { error } = await supabase
      .from("complaints" as any)
      .update({ admin_response: text, status: "resolved" })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Response sent"); setDrafts((d) => ({ ...d, [id]: "" })); fetchAll(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this complaint?")) return;
    const { error } = await supabase.from("complaints" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); fetchAll(); }
  };

  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Complaints ({rows.length})
        </h3>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-muted/30 border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
          No complaints {filter !== "all" ? `with status "${filter}"` : "yet"}.
        </div>
      ) : (
        filtered.map((r) => (
          <div key={r.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-foreground">{r.subject}</div>
                <div className="text-xs text-muted-foreground">
                  {r.student_name} {r.student_roll ? `(${r.student_roll})` : ""} · {new Date(r.created_at).toLocaleString()} · {r.category}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusColor[r.status] || ""} variant="secondary">{r.status.replace("_", " ")}</Badge>
                <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                  <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{r.message}</p>
            {r.admin_response && (
              <div className="p-3 bg-muted/40 border-l-2 border-primary rounded">
                <div className="text-xs font-semibold text-primary mb-1">Your Response</div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{r.admin_response}</p>
              </div>
            )}
            <div className="space-y-2">
              <Textarea
                placeholder={r.admin_response ? "Update your response…" : "Write a response (marks as resolved)…"}
                rows={3}
                value={drafts[r.id] ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
              />
              <Button size="sm" onClick={() => saveResponse(r.id)}>Send Response</Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AdminComplaintsPanel;