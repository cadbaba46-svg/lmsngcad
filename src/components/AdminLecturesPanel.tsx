import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Video, Plus } from "lucide-react";
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

interface LectureEntry {
  id: string;
  title: string;
  videoUrl: string;
  duration: string;
  detecting: boolean;
}

const createLectureEntry = (): LectureEntry => ({
  id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  title: "",
  videoUrl: "",
  duration: "",
  detecting: false,
});

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
  const [entries, setEntries] = useState<LectureEntry[]>([createLectureEntry()]);
  const [videoType, setVideoType] = useState("youtube");
  const [description, setDescription] = useState("");
  const [threshold, setThreshold] = useState("7");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [quizMandatory, setQuizMandatory] = useState(true);
  const [watchPct, setWatchPct] = useState("80");
  const [saving, setSaving] = useState(false);
  const detecting = useMemo(() => entries.some((entry) => entry.detecting), [entries]);

  const fetchAll = async () => {
    const [{ data: lecs, error: lectureError }, { data: cs, error: courseError }] = await Promise.all([
      supabase.from("mandatory_lectures" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("id, name").eq("is_active", true).order("name"),
    ]);
    if (lectureError) toast.error(`Lectures failed to load: ${lectureError.message}`);
    if (courseError) toast.error(`Courses failed to load: ${courseError.message}`);
    setRows((lecs || []) as unknown as Lecture[]);
    setCourses((cs || []) as any);
  };
  useEffect(() => { fetchAll(); }, []);

  const toggleCourse = (id: string) => {
    setSelectedCourses((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const allSelected = courses.length > 0 && selectedCourses.length === courses.length;
  const toggleAll = () => setSelectedCourses(allSelected ? [] : courses.map((c) => c.id));

  const updateEntry = (id: string, patch: Partial<LectureEntry>) => {
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  };

  const addEntry = () => setEntries((prev) => [...prev, createLectureEntry()]);

  const removeEntry = (id: string) => {
    setEntries((prev) => (prev.length === 1 ? prev : prev.filter((entry) => entry.id !== id)));
  };

  const addPastedLinks = (value: string, targetId: string) => {
    const links = value
      .split(/[\n,]+/)
      .map((x) => x.trim())
      .filter(Boolean);

    if (links.length <= 1) {
      updateEntry(targetId, { videoUrl: value });
      return;
    }

    setEntries((prev) => {
      const target = prev.find((entry) => entry.id === targetId);
      const targetTitle = target?.title.trim() || "";
      const replacement = links.map((link, index) => ({
        ...createLectureEntry(),
        title: targetTitle && links.length > 1 ? `${targetTitle} ${index + 1}` : targetTitle,
        videoUrl: link,
      }));
      return prev.flatMap((entry) => (entry.id === targetId ? replacement : [entry]));
    });
  };

  // Auto-detect video duration
  const detectDurationSeconds = async (url: string, type: string): Promise<number | null> => {
    if (!url.trim()) return null;
    if (type === "url") {
      return new Promise<number | null>((resolve) => {
          const v = document.createElement("video");
          v.preload = "metadata";
          v.onloadedmetadata = () => {
            resolve(isFinite(v.duration) && v.duration > 0 ? Math.round(v.duration) : null);
          };
          v.onerror = () => resolve(null);
          v.src = url;
          setTimeout(() => resolve(null), 8000);
        });
    }
    if (type === "youtube") {
      // Use YouTube IFrame API to read duration
      const id = extractYouTubeId(url);
      if (!id) return null;
      return new Promise<number | null>((resolve) => {
          const container = document.createElement("div");
          container.style.position = "fixed";
          container.style.left = "-9999px";
          container.style.top = "0";
          container.style.width = "1px";
          container.style.height = "1px";
          const target = document.createElement("div");
          container.appendChild(target);
          document.body.appendChild(container);

        const cleanup = () => {
          try { document.body.removeChild(container); } catch {}
        };
        const timeout = setTimeout(() => { cleanup(); resolve(null); }, 10000);

          const loadPlayer = () => {
            const YT = (window as any).YT;
            const player = new YT.Player(target, {
              videoId: id,
              events: {
                onReady: () => {
                  const d = player.getDuration?.();
                  clearTimeout(timeout);
                  try { player.destroy?.(); } catch {}
                cleanup(); resolve(d && d > 0 ? Math.round(d) : null);
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
    return null;
  };

  const detectDuration = async (entryId: string, value: string, type: string) => {
    const link = value.trim();
    if (!link) return;
    updateEntry(entryId, { detecting: true });
    try {
      const detected = await detectDurationSeconds(link, type);
      if (detected) updateEntry(entryId, { duration: String(detected) });
    } finally {
      updateEntry(entryId, { detecting: false });
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const readyEntries = entries
      .map((entry) => ({ ...entry, title: entry.title.trim(), videoUrl: entry.videoUrl.trim() }))
      .filter((entry) => entry.title || entry.videoUrl);
    if (readyEntries.length === 0 || readyEntries.some((entry) => !entry.title || !entry.videoUrl)) {
      toast.error("Each lecture needs its own title and video URL");
      return;
    }
    if (selectedCourses.length === 0) { toast.error("Select at least one course"); return; }
    setSaving(true);
    const payloads = [];
    for (const entry of readyEntries) {
      const detected = await detectDurationSeconds(entry.videoUrl, videoType);
      payloads.push({
        title: entry.title,
        description: description.trim() || null,
        video_url: entry.videoUrl,
        video_type: videoType,
        duration_seconds: detected || parseInt(entry.duration) || 300,
        pass_threshold: quizMandatory ? (parseInt(threshold) || 7) : 0,
        course_ids: selectedCourses,
        course_id: selectedCourses[0], // legacy column fallback
        is_quiz_mandatory: quizMandatory,
        watch_percentage_required: Math.min(100, Math.max(1, parseInt(watchPct) || 80)),
        is_active: true,
      });
    }
    const { error } = await supabase.from("mandatory_lectures" as any).insert(payloads);
    setSaving(false);
    if (error) { console.error("[AdminLecturesPanel] insert failed", error, payloads); toast.error(error.message || "Failed to add lecture"); return; }
    toast.success(`${payloads.length} lecture${payloads.length > 1 ? "s" : ""} added`);
    setEntries([createLectureEntry()]); setDescription(""); setThreshold("7");
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
              <Label>Video Type</Label>
              <Select value={videoType} onValueChange={setVideoType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="url">Direct Video URL (.mp4)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Lectures *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addEntry} className="gap-2">
                  <Plus className="h-4 w-4" /> Add another
                </Button>
              </div>
              <div className="space-y-3">
                {entries.map((entry, index) => (
                  <div key={entry.id} className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-foreground">Lecture {index + 1}</div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeEntry(entry.id)} disabled={entries.length === 1} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_10rem] gap-3">
                      <div className="space-y-2">
                        <Label>Lecture Name *</Label>
                        <Input value={entry.title} onChange={(e) => updateEntry(entry.id, { title: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Video URL *</Label>
                        <Input
                          value={entry.videoUrl}
                          onChange={(e) => addPastedLinks(e.target.value, entry.id)}
                          onBlur={(e) => detectDuration(entry.id, e.target.value, videoType)}
                          placeholder="Paste video link"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Duration {entry.detecting && <span className="text-xs text-muted-foreground">…</span>}</Label>
                        <Input type="number" value={entry.duration || "300"} readOnly min={30} className="bg-muted/40" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Paste multiple links into one Video URL box to split them into separate lecture rows, then set each lecture name.</p>
            </div>
            <div className="space-y-2">
              <Label>Duration status {detecting && <span className="text-xs text-muted-foreground">— detecting…</span>}</Label>
              <Input value="Auto-calculated per lecture" readOnly className="bg-muted/40" />
              <p className="text-xs text-muted-foreground">Each lecture duration is calculated from its own video link during save.</p>
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
          <Button type="submit" disabled={saving}>{saving ? "Calculating & saving…" : "Save Lecture(s)"}</Button>
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