import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Video, Plus, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  course_ids: string[] | null;
  is_quiz_mandatory: boolean;
  watch_percentage_required: number;
}

interface Course { id: string; name: string; }

const extractYouTubeId = (url: string): string | null => {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || null;
      return u.searchParams.get("v");
    }
  } catch {}
  return null;
};

const AdminLecturesPanel = () => {
  const [rows, setRows] = useState<Lecture[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoType, setVideoType] = useState("youtube");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("300");
  const [threshold, setThreshold] = useState("7");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [quizMandatory, setQuizMandatory] = useState(true);
  const [watchPct, setWatchPct] = useState("80");
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const fetchAll = async () => {
    const [{ data: lecs }, { data: cs }] = await Promise.all([
      supabase.from("mandatory_lectures" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("id, name").eq("is_active", true).order("name"),
    ]);
    setRows((lecs || []) as unknown as Lecture[]);
    setCourses((cs || []) as any);
  };
  useEffect(() => { fetchAll(); }, []);

  const toggleCourse = (id: string) => {
    setSelectedCourses((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const allSelected = courses.length > 0 && selectedCourses.length === courses.length;
  const toggleAll = () => setSelectedCourses(allSelected ? [] : courses.map((c) => c.id));

  // Auto-detect video duration
  const detectDuration = async (url: string, type: string) => {
    if (!url.trim()) return;
    setDetecting(true);
    try {
      if (type === "url") {
        await new Promise<void>((resolve) => {
          const v = document.createElement("video");
          v.preload = "metadata";
          v.onloadedmetadata = () => {
            if (isFinite(v.duration) && v.duration > 0) {
              setDuration(String(Math.round(v.duration)));
            }
            resolve();
          };
          v.onerror = () => resolve();
          v.src = url;
          setTimeout(resolve, 8000);
        });
      } else if (type === "youtube") {
        // Use YouTube IFrame API to read duration
        const id = extractYouTubeId(url);
        if (!id) { toast.message("Could not parse YouTube URL"); return; }
        await new Promise<void>((resolve) => {
          const container = document.createElement("div");
          container.style.position = "fixed";
          container.style.left = "-9999px";
          container.style.top = "0";
          container.style.width = "1px";
          container.style.height = "1px";
          const target = document.createElement("div");
          container.appendChild(target);
          document.body.appendChild(container);

          const cleanup = () => { try { document.body.removeChild(container); } catch {} };
          const timeout = setTimeout(() => { cleanup(); resolve(); }, 10000);

          const loadPlayer = () => {
            const YT = (window as any).YT;
            const player = new YT.Player(target, {
              videoId: id,
              events: {
                onReady: () => {
                  const d = player.getDuration?.();
                  if (d && d > 0) setDuration(String(Math.round(d)));
                  clearTimeout(timeout);
                  try { player.destroy?.(); } catch {}
                  cleanup(); resolve();
                },
              },
            });
          };
          if ((window as any).YT && (window as any).YT.Player) loadPlayer();
          else {
            const s = document.createElement("script");
            s.src = "https://www.youtube.com/iframe_api";
            (window as any).onYouTubeIframeAPIReady = loadPlayer;
            document.head.appendChild(s);
          }
        });
      }
    } finally {
      setDetecting(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !videoUrl.trim()) { toast.error("Title and video URL required"); return; }
    if (selectedCourses.length === 0) { toast.error("Select at least one course"); return; }
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      video_url: videoUrl.trim(),
      video_type: videoType,
      duration_seconds: parseInt(duration) || 300,
      pass_threshold: quizMandatory ? (parseInt(threshold) || 7) : 0,
      course_ids: selectedCourses,
      course_id: selectedCourses[0], // legacy NOT NULL column fallback
      is_quiz_mandatory: quizMandatory,
      watch_percentage_required: Math.min(100, Math.max(0, parseInt(watchPct) || 80)),
      is_active: true,
    };
    const { error } = await supabase.from("mandatory_lectures" as any).insert(payload);
    setSaving(false);
    if (error) { console.error("[AdminLecturesPanel] insert failed", error, payload); toast.error(error.message || "Failed to add lecture"); return; }
    toast.success("Lecture added");
    setTitle(""); setVideoUrl(""); setDescription(""); setDuration("300"); setThreshold("7");
    setSelectedCourses([]); setQuizMandatory(true); setWatchPct("80");
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
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onBlur={(e) => detectDuration(e.target.value, videoType)}
                placeholder="https://youtu.be/... or https://.../video.mp4"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (seconds) {detecting && <span className="text-xs text-muted-foreground">— detecting…</span>}</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min={30} />
              <p className="text-xs text-muted-foreground">Auto-detected for direct video URLs.</p>
            </div>
            <div className="space-y-2">
              <Label>Required Watch %</Label>
              <Input type="number" value={watchPct} onChange={(e) => setWatchPct(e.target.value)} min={1} max={100} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Applies to Courses *</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-start font-normal">
                    {selectedCourses.length === 0
                      ? "Select courses…"
                      : allSelected
                      ? `All courses (${courses.length})`
                      : `${selectedCourses.length} course${selectedCourses.length > 1 ? "s" : ""} selected`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72 max-h-80 overflow-auto bg-popover">
                  <DropdownMenuLabel>Courses</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem checked={allSelected} onCheckedChange={toggleAll} onSelect={(e) => e.preventDefault()}>
                    Select all
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  {courses.map((c) => (
                    <DropdownMenuCheckboxItem
                      key={c.id}
                      checked={selectedCourses.includes(c.id)}
                      onCheckedChange={() => toggleCourse(c.id)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {c.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="md:col-span-2 flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
              <Switch checked={quizMandatory} onCheckedChange={setQuizMandatory} />
              <div className="flex-1">
                <Label className="cursor-pointer">Quiz is mandatory</Label>
                <p className="text-xs text-muted-foreground">If off, students only need to watch the video — no quiz, and pass threshold / content notes are disabled.</p>
              </div>
            </div>

            <div className={`space-y-2 ${!quizMandatory ? "opacity-50 pointer-events-none" : ""}`}>
              <Label>Pass Threshold (out of 10)</Label>
              <Input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} min={1} max={10} disabled={!quizMandatory} />
            </div>
            <div className="space-y-2 md:col-span-2 hidden md:block" />
            <div className={`space-y-2 md:col-span-2 ${!quizMandatory ? "opacity-50 pointer-events-none" : ""}`}>
              <Label>Lecture Content / Transcript / Notes (improves AI quiz quality)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} disabled={!quizMandatory} placeholder="Paste transcript, key topics, summary, or learning objectives — the AI uses this to generate accurate MCQs." />
            </div>
          </div>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Lecture"}</Button>
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
                  {l.video_type} · {Math.floor(l.duration_seconds / 60)}m · watch {l.watch_percentage_required ?? 80}% · {l.is_quiz_mandatory === false ? "no quiz" : `quiz pass ${l.pass_threshold}/10`} · {(l.course_ids?.length ?? 0)} course(s)
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