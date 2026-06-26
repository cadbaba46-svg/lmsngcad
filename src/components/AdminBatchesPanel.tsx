import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Layers, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Course { id: string; name: string; short_code: string | null; }
interface Teacher { user_id: string; full_name: string | null; }
interface Batch {
  id: string;
  course_id: string;
  course_code: string | null;
  name: string;
  teacher_id: string | null;
  is_active: boolean;
  courses?: { name: string; short_code: string | null };
}

const AdminBatchesPanel = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [courseId, setCourseId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [teacherId, setTeacherId] = useState<string>("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [c, b, tr] = await Promise.all([
      supabase.from("courses").select("id, name, short_code").eq("is_active", true).order("name"),
      (supabase as any).from("batches").select("*, courses(name, short_code)").order("created_at", { ascending: false }),
      (supabase as any).from("user_roles").select("user_id").eq("role", "teacher"),
    ]);
    setCourses((c.data as any) || []);
    setBatches((b.data as any) || []);
    const teacherIds = ((tr.data as any) || []).map((x: any) => x.user_id);
    if (teacherIds.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds);
      setTeachers((profs as any) || []);
    } else {
      setTeachers([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const reset = () => {
    setEditing(null); setCourseId(""); setName(""); setCode(""); setTeacherId(""); setActive(true);
  };

  const startEdit = (b: Batch) => {
    setEditing(b);
    setCourseId(b.course_id);
    setName(b.name);
    setCode(b.course_code || b.courses?.short_code || "");
    setTeacherId(b.teacher_id || "");
    setActive(b.is_active);
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !name.trim()) { toast.error("Course and batch name required"); return; }
    setSaving(true);
    const payload = {
      course_id: courseId,
      name: name.trim(),
      course_code: code.trim() || courses.find((c) => c.id === courseId)?.short_code || null,
      teacher_id: teacherId || null,
      is_active: active,
    };
    const res = editing
      ? await (supabase as any).from("batches").update(payload).eq("id", editing.id)
      : await (supabase as any).from("batches").insert(payload);
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editing ? "Batch updated" : "Batch created");
    reset(); setShowForm(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this batch? Students assigned to it will be unassigned.")) return;
    const { error } = await (supabase as any).from("batches").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted"); load();
  };

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Layers className="h-5 w-5" /> Manage Batches / Classes</h3>
        <Button onClick={() => { if (showForm) { reset(); } setShowForm(!showForm); }} className="gap-2">
          <Plus className="h-4 w-4" /> {showForm ? "Cancel" : "New Batch"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-card border border-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Course *</Label>
            <Select value={courseId} onValueChange={(v) => { setCourseId(v); const c = courses.find((x) => x.id === v); if (c && !code) setCode(c.short_code || ""); }}>
              <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
              <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Course Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. ACAD" />
          </div>
          <div>
            <Label>Batch Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Class A" required />
          </div>
          <div>
            <Label>Assigned Teacher</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
              <SelectContent>{teachers.map((t) => <SelectItem key={t.user_id} value={t.user_id}>{t.full_name || t.user_id}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="batch-active" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <Label htmlFor="batch-active">Active</Label>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Update Batch" : "Create Batch"}</Button>
          </div>
        </form>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No batches yet.</TableCell></TableRow>
            ) : batches.map((b) => {
              const t = teachers.find((x) => x.user_id === b.teacher_id);
              return (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.courses?.name || "—"}</TableCell>
                  <TableCell className="font-mono">{b.course_code || b.courses?.short_code || "—"}</TableCell>
                  <TableCell>{b.name}</TableCell>
                  <TableCell>{t?.full_name || "Not assigned"}</TableCell>
                  <TableCell>
                    {b.is_active ? <Badge className="bg-green-600 text-white">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(b)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(b.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminBatchesPanel;