import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, Send, Inbox } from "lucide-react";

interface Complaint {
  id: string;
  subject: string;
  category: string;
  message: string;
  status: string;
  admin_response: string | null;
  created_at: string;
}

const statusColor: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  in_progress: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  resolved: "bg-green-500/15 text-green-700 dark:text-green-300",
};

const ComplaintsPanel = () => {
  const { user } = useAuth();
  const [list, setList] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchList = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("complaints" as any)
      .select("*")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });
    setList((data || []) as unknown as Complaint[]);
    setLoading(false);
  };

  useEffect(() => { fetchList(); /* eslint-disable-next-line */ }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!subject.trim() || !message.trim()) { toast.error("Subject and message are required"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("complaints" as any).insert({
      student_id: user.id,
      subject: subject.trim(),
      category,
      message: message.trim(),
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Complaint submitted");
    setSubject(""); setMessage(""); setCategory("general");
    fetchList();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="h-6 w-6" /> Complaints & Support
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Submit an issue and track its status here.</p>
      </div>

      <form onSubmit={submit} className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h3 className="font-semibold text-foreground">New Complaint</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} required />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="finance">Finance / Dues</SelectItem>
                <SelectItem value="technical">Technical / LMS</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Message *</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={2000} required />
        </div>
        <Button type="submit" disabled={submitting} className="gap-2">
          <Send className="h-4 w-4" /> {submitting ? "Submitting…" : "Submit Complaint"}
        </Button>
      </form>

      <div className="space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Inbox className="h-5 w-5" /> Your Complaints
        </h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : list.length === 0 ? (
          <div className="bg-muted/30 border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
            No complaints submitted yet.
          </div>
        ) : (
          list.map((c) => (
            <div key={c.id} className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-foreground">{c.subject}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleString()} · {c.category}
                  </div>
                </div>
                <Badge className={statusColor[c.status] || ""} variant="secondary">
                  {c.status.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{c.message}</p>
              {c.admin_response && (
                <div className="mt-2 p-3 bg-muted/40 border-l-2 border-primary rounded">
                  <div className="text-xs font-semibold text-primary mb-1">Admin Response</div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{c.admin_response}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ComplaintsPanel;