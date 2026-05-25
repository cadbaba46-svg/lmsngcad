import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Video, Plus } from "lucide-react";

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  video_type: string;
  duration_seconds: number;
  pass_threshold: number;
  is_active: boolean;
  course_id: string | null;
}

const AdminLecturesPanel = () => {
  const [rows, setRows] = useState<Lecture[]>([]);
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoType, setVideoType] = useState("youtube");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("300");
  const [threshold, setThreshold] = useState("7");

  const fetchAll = async () => {
    const { data } = await supabase
      .from("mandatory_lectures" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data || []) as unknown as Lecture[]);
  };
  useEffect(() => { fetchAll(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !videoUrl.trim()) { toast.error("Title and video URL required"); return; }
    const { error } = await supabase.from("mandatory_lectures" as any).insert({
      title: title.trim(),
      description: description.trim() || null,
      video_url: videoUrl.trim(),
      video_type: videoType,
      duration_seconds: parseInt(duration) || 300,
      pass_threshold: parseInt(threshold) || 7,
      is_active: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Lecture added");
    setTitle(""); setVideoUrl(""); setDescription(""); setDuration("300"); setThreshold("7");
    setShow(false);
    fetchAll();
  };

  const toggle = async (id: string, val: boolean) => {
    await supabase.from("mandatory_lectures" as any).update({ is_active: val }).eq("id", id);
    fetchAll();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete lecture and all completion records?")) return;
    await supabase.from("mandatory_lectures" as any).delete().eq("id", id);
    fetchAll();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Video className="h-5 w-5" /> Mandatory Lectures ({rows.length})
        </h3>
        <Button onClick={() => setShow(!show)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> {show ? "Cancel" : "Add Lecture"}
        </Button>
      </div>

      {show && (
        <form onSubmit={add} className="bg-card border border-border rounded-lg p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Video Type</Label>
              <Select value={videoType} onValueChange={setVideoType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="url">Direct Video URL (.mp4)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Video URL *</Label>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtu.be/... or https://.../video.mp4" required />
            </div>
            <div className="space-y-2">
              <Label>Duration (seconds)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min={30} />
            </div>
            <div className="space-y-2">
              <Label>Pass Threshold (out of 10)</Label>
              <Input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} min={1} max={10} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Lecture Content / Transcript / Notes (improves AI quiz quality)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="Paste transcript, key topics, summary, or learning objectives — the AI uses this to generate accurate MCQs." />
            </div>
          </div>
          <Button type="submit">Save Lecture</Button>
        </form>
      )}

      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="bg-muted/30 border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
            No mandatory lectures configured.
          </div>
        ) : (
          rows.map((l) => (
            <div key={l.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-foreground truncate">{l.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {l.video_type} · {Math.floor(l.duration_seconds / 60)}m · pass {l.pass_threshold}/10
                </div>
                <a href={l.video_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate block">
                  {l.video_url}
                </a>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Switch checked={l.is_active} onCheckedChange={(v) => toggle(l.id, v)} />
                  <span className="text-xs text-muted-foreground">{l.is_active ? "Active" : "Off"}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(l.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminLecturesPanel;