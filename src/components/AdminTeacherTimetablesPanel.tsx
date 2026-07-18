import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Calendar } from "lucide-react";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const SECTIONS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface Course { id: string; name: string }
interface Teacher { user_id: string; full_name: string | null }
interface Slot { id: string; teacher_id: string; course_id: string; section: string | null; day_of_week: string; start_time: string; end_time: string; room: string | null }

const AdminTeacherTimetablesPanel = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [section, setSection] = useState<string>("");
  const [day, setDay] = useState<string>("Monday");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("11:00");
  const [room, setRoom] = useState("");

  const load = async () => {
    const { data: tr } = await (supabase as any).from("user_roles").select("user_id").eq("role", "teacher");
    const teacherIds = ((tr as any) || []).map((r: any) => r.user_id);
    let names: Teacher[] = [];
    if (teacherIds.length) {
      const { data: profs } = await (supabase as any).rpc("get_public_teacher_profiles", { _teacher_ids: teacherIds });
      names = (profs || []) as Teacher[];
    }
    setTeachers(names);
    const { data: c } = await supabase.from("courses").select("id, name").eq("is_active", true).order("name");
    setCourses((c as any) || []);
    const { data: tt } = await (supabase as any).from("teacher_timetables").select("*").order("day_of_week").order("start_time");
    setSlots(((tt as any) || []) as Slot[]);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!teacherId || !courseId || !day || !start || !end) { toast.error("Fill teacher, course, day, and times"); return; }
    const { error } = await (supabase as any).from("teacher_timetables").insert({
      teacher_id: teacherId, course_id: courseId, section: section || null, day_of_week: day, start_time: start, end_time: end, room: room || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Slot added");
    setRoom("");
    load();
  };

  const remove = async (id: string) => {
    await (supabase as any).from("teacher_timetables").delete().eq("id", id);
    load();
  };

  const teacherName = (id: string) => teachers.find((t) => t.user_id === id)?.full_name || "—";
  const courseName = (id: string) => courses.find((c) => c.id === id)?.name || "—";

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2"><Calendar className="h-5 w-5" /> Teacher Timetables</h3>

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <p className="text-sm text-muted-foreground">Add a timetable slot for a teacher & course. Students will see all published slots on <strong>Department TimeTable</strong>.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="space-y-1"><Label className="text-xs">Teacher</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
              <SelectContent>
                {teachers.map((t) => <SelectItem key={t.user_id} value={t.user_id}>{t.full_name || t.user_id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Section (A–Z)</Label>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Day</Label>
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Start</Label>
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-1"><Label className="text-xs">End</Label>
            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="space-y-1"><Label className="text-xs">Room</Label>
            <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Optional" />
          </div>
          <div className="flex items-end">
            <Button onClick={add} className="gap-1 w-full"><Plus className="h-4 w-4" /> Add slot</Button>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left font-medium text-muted-foreground">Teacher</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Course</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Section</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Day</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Time</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Room</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {slots.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No timetable slots yet.</td></tr>
            ) : slots.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-3 text-foreground">{teacherName(s.teacher_id)}</td>
                <td className="p-3 text-muted-foreground">{courseName(s.course_id)}</td>
                <td className="p-3 text-muted-foreground">{s.section || "—"}</td>
                <td className="p-3 text-muted-foreground">{s.day_of_week}</td>
                <td className="p-3 text-muted-foreground">{s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}</td>
                <td className="p-3 text-muted-foreground">{s.room || "—"}</td>
                <td className="p-3"><Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTeacherTimetablesPanel;