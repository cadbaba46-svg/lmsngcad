import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Copy, Users, BookOpen, Settings, GraduationCap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  department: string | null;
  semester: string | null;
  roll_number: string | null;
  father_name: string | null;
  phone: string | null;
  cnic: string | null;
  created_at: string;
}

interface Course {
  id: string;
  name: string;
  price: number;
  description: string | null;
  total_weeks: number;
  course_content: string[];
  is_active: boolean;
}

const AdminPanel = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [createdEmail, setCreatedEmail] = useState("");
  const [createdRollNumber, setCreatedRollNumber] = useState("");

  // User form
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [userRole, setUserRole] = useState<"user" | "teacher">("user");

  // Course edit
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseWeeks, setCourseWeeks] = useState("");
  const [courseContent, setCourseContent] = useState("");
  const [coursePrice, setCoursePrice] = useState("");
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCoursePrice, setNewCoursePrice] = useState("");
  const [newCourseDesc, setNewCourseDesc] = useState("");
  const [newCourseWeeks, setNewCourseWeeks] = useState("12");
  const [newCourseContent, setNewCourseContent] = useState("");

  // Teacher assignment
  const [assignTeacherId, setAssignTeacherId] = useState("");
  const [assignCourseId, setAssignCourseId] = useState("");

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers((data || []) as unknown as Profile[]);
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from("courses").select("*").order("created_at");
    setCourses((data || []) as Course[]);
  };

  const fetchTeachers = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const teacherIds = (roles || []).filter((r) => (r.role as string) === "teacher").map((r) => r.user_id);
    if (teacherIds.length === 0) { setTeachers([]); return; }
    const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", teacherIds);
    setTeachers(profiles || []);
  };

  const fetchEnrollments = async () => {
    const { data } = await supabase.from("enrollments").select("*, courses(name)");
    if (!data) { setEnrollments([]); return; }
    const userIds = data.map((e) => e.user_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, roll_number").in("user_id", userIds);
    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
    setEnrollments(data.map((e) => ({ ...e, profile: profileMap[e.user_id] })));
  };

  const fetchAssignments = async () => {
    const { data } = await (supabase as any).from("teacher_assignments").select("*, courses(name)");
    if (!data) { setAssignments([]); return; }
    const teacherIds = data.map((a: any) => a.teacher_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds);
    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
    setAssignments(data.map((a: any) => ({ ...a, teacher_name: profileMap[a.teacher_id]?.full_name })));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchCourses(), fetchTeachers(), fetchEnrollments(), fetchAssignments()]).then(() => setLoading(false));
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName) {
      toast.error("Email and Full Name are required");
      return;
    }
    setCreating(true);
    try {
      const res = await supabase.functions.invoke("create-user", {
        body: { email, full_name: fullName, department, semester, roll_number: rollNumber, father_name: fatherName, phone, cnic, role: userRole },
      });

      if (res.error) {
        toast.error(res.error.message || "Failed to create user");
      } else {
        const { password } = res.data;
        setGeneratedPassword(password);
        setCreatedEmail(email);
        setCreatedRollNumber(rollNumber);
        toast.success("User created successfully!");
        setEmail(""); setFullName(""); setFatherName(""); setDepartment(""); setSemester(""); setRollNumber(""); setPhone(""); setCnic(""); setUserRole("user");
        fetchUsers();
        fetchTeachers();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    }
    setCreating(false);
  };

  const copyCredentials = () => {
    const text = `Email: ${createdEmail}\nUsername/Roll No: ${createdRollNumber || "N/A"}\nPassword: ${generatedPassword}`;
    navigator.clipboard.writeText(text);
    toast.success("Credentials copied to clipboard!");
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseWeeks(String(course.total_weeks));
    setCourseContent((course.course_content || []).join("\n"));
    setCoursePrice(String(course.price));
  };

  const handleSaveCourse = async () => {
    if (!editingCourse) return;
    const { error } = await supabase
      .from("courses")
      .update({
        total_weeks: parseInt(courseWeeks) || 12,
        course_content: courseContent.split("\n").filter(Boolean),
        price: parseFloat(coursePrice) || 0,
      })
      .eq("id", editingCourse.id);
    if (error) toast.error(error.message);
    else { toast.success("Course updated!"); setEditingCourse(null); fetchCourses(); }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("courses").insert({
      name: newCourseName,
      price: parseFloat(newCoursePrice) || 0,
      description: newCourseDesc,
      total_weeks: parseInt(newCourseWeeks) || 12,
      course_content: newCourseContent.split("\n").filter(Boolean),
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Course added!");
      setShowAddCourse(false);
      setNewCourseName(""); setNewCoursePrice(""); setNewCourseDesc(""); setNewCourseWeeks("12"); setNewCourseContent("");
      fetchCourses();
    }
  };

  const handleAssignTeacher = async () => {
    if (!assignTeacherId || !assignCourseId) { toast.error("Select teacher and course"); return; }
    const { error } = await (supabase as any).from("teacher_assignments").insert({ teacher_id: assignTeacherId, course_id: assignCourseId });
    if (error) {
      if (error.message.includes("duplicate")) toast.error("Teacher already assigned to this course");
      else toast.error(error.message);
    } else {
      toast.success("Teacher assigned!");
      setAssignTeacherId(""); setAssignCourseId("");
      fetchAssignments();
    }
  };

  const handleRemoveAssignment = async (id: string) => {
    await (supabase as any).from("teacher_assignments").delete().eq("id", id);
    toast.success("Assignment removed");
    fetchAssignments();
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Users className="h-6 w-6" /> Admin Control Panel
      </h2>

      <Tabs defaultValue="users">
        <TabsList className="flex-wrap">
          <TabsTrigger value="users" className="gap-2"><UserPlus className="h-4 w-4" /> Users</TabsTrigger>
          <TabsTrigger value="students" className="gap-2"><GraduationCap className="h-4 w-4" /> Students</TabsTrigger>
          <TabsTrigger value="teachers" className="gap-2"><Users className="h-4 w-4" /> Teachers</TabsTrigger>
          <TabsTrigger value="courses" className="gap-2"><BookOpen className="h-4 w-4" /> Courses</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => { setShowForm(!showForm); setGeneratedPassword(""); }} className="gap-2">
              <UserPlus className="h-4 w-4" /> {showForm ? "Cancel" : "Create User"}
            </Button>
          </div>

          {showForm && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Create New User</h3>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Father Name</Label>
                  <Input value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 03001234567" />
                </div>
                <div className="space-y-2">
                  <Label>CNIC Number</Label>
                  <Input value={cnic} onChange={(e) => setCnic(e.target.value)} placeholder="e.g. 35201-1234567-1" />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Input value={semester} onChange={(e) => setSemester(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Roll Number (Username)</Label>
                  <Input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="e.g. NGCAD-2025-001" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={userRole} onValueChange={(v) => setUserRole(v as "user" | "teacher")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={creating} className="w-full">
                    {creating ? "Creating..." : "Create User"}
                  </Button>
                </div>
              </form>

              {generatedPassword && (
                <div className="bg-muted border border-border rounded-lg p-4 space-y-2">
                  <p className="text-sm font-semibold text-foreground">User Created — Credentials:</p>
                  <p className="text-sm text-muted-foreground">Email: <span className="font-mono text-foreground">{createdEmail}</span></p>
                  {createdRollNumber && <p className="text-sm text-muted-foreground">Username/Roll No: <span className="font-mono text-foreground">{createdRollNumber}</span></p>}
                  <p className="text-sm text-muted-foreground">Password: <span className="font-mono text-foreground">{generatedPassword}</span></p>
                  <Button variant="outline" size="sm" onClick={copyCredentials} className="gap-2">
                    <Copy className="h-3 w-3" /> Copy Credentials
                  </Button>
                  <p className="text-xs text-destructive">⚠️ Save these credentials now. The password cannot be retrieved later.</p>
                </div>
              )}
            </div>
          )}

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Department</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Semester</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Roll Number</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No users found.</td></tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="border-t border-border hover:bg-muted/50">
                        <td className="p-3 text-foreground">{u.full_name || "—"}</td>
                        <td className="p-3 text-muted-foreground">{u.department || "—"}</td>
                        <td className="p-3 text-muted-foreground">{u.semester || "—"}</td>
                        <td className="p-3 text-muted-foreground">{u.roll_number || "—"}</td>
                        <td className="p-3 text-muted-foreground">{u.phone || "—"}</td>
                        <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4 mt-4">
          <h3 className="text-lg font-semibold text-foreground">Student Enrollments & Records</h3>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-3 font-medium text-muted-foreground">Student</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Roll Number</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Course</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Payment</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No enrollments.</td></tr>
                  ) : (
                    enrollments.map((e: any) => {
                      const att = Array.isArray(e.attendance) ? e.attendance : [];
                      const present = att.filter((a: any) => a.status === "present").length;
                      return (
                        <tr key={e.id} className="border-t border-border hover:bg-muted/50">
                          <td className="p-3 text-foreground">{e.profile?.full_name || "—"}</td>
                          <td className="p-3 text-muted-foreground">{e.profile?.roll_number || "—"}</td>
                          <td className="p-3 text-muted-foreground">{e.courses?.name || "—"}</td>
                          <td className="p-3">{e.challan_paid ? <span className="text-green-600 font-medium">Paid</span> : <span className="text-destructive font-medium">Unpaid</span>}</td>
                          <td className="p-3 text-muted-foreground capitalize">{e.status}</td>
                          <td className="p-3 text-muted-foreground">{present}/{att.length} present</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Teachers Tab */}
        <TabsContent value="teachers" className="space-y-4 mt-4">
          <h3 className="text-lg font-semibold text-foreground">Teacher Management</h3>

          {/* Assign teacher to course */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-foreground">Assign Teacher to Course</h4>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Teacher</Label>
                <Select value={assignTeacherId} onValueChange={setAssignTeacherId}>
                  <SelectTrigger className="w-52"><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.user_id} value={t.user_id}>{t.full_name || t.user_id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Course</Label>
                <Select value={assignCourseId} onValueChange={setAssignCourseId}>
                  <SelectTrigger className="w-52"><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAssignTeacher} size="sm">Assign</Button>
            </div>
          </div>

          {/* Current assignments */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left p-3 font-medium text-muted-foreground">Teacher</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Course</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No assignments.</td></tr>
                ) : (
                  assignments.map((a: any) => (
                    <tr key={a.id} className="border-t border-border hover:bg-muted/50">
                      <td className="p-3 text-foreground">{a.teacher_name || "—"}</td>
                      <td className="p-3 text-muted-foreground">{a.courses?.name || "—"}</td>
                      <td className="p-3">
                        <Button variant="destructive" size="sm" onClick={() => handleRemoveAssignment(a.id)}>Remove</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Teacher list */}
          <h4 className="font-medium text-foreground mt-4">All Teachers</h4>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Department</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
                </tr>
              </thead>
              <tbody>
                {teachers.length === 0 ? (
                  <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No teachers found.</td></tr>
                ) : (
                  teachers.map((t: any) => (
                    <tr key={t.id} className="border-t border-border hover:bg-muted/50">
                      <td className="p-3 text-foreground">{t.full_name || "—"}</td>
                      <td className="p-3 text-muted-foreground">{t.department || "—"}</td>
                      <td className="p-3 text-muted-foreground">{t.phone || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddCourse(!showAddCourse)} className="gap-2">
              <BookOpen className="h-4 w-4" /> {showAddCourse ? "Cancel" : "Add Course"}
            </Button>
          </div>

          {showAddCourse && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Add New Course</h3>
              <form onSubmit={handleAddCourse} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Course Name *</Label>
                  <Input value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Price (Rs.)</Label>
                  <Input type="number" value={newCoursePrice} onChange={(e) => setNewCoursePrice(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Input value={newCourseDesc} onChange={(e) => setNewCourseDesc(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Total Weeks</Label>
                  <Input type="number" value={newCourseWeeks} onChange={(e) => setNewCourseWeeks(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Course Content (one item per line)</Label>
                  <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground min-h-[100px]" value={newCourseContent} onChange={(e) => setNewCourseContent(e.target.value)} />
                </div>
                <div><Button type="submit">Add Course</Button></div>
              </form>
            </div>
          )}

          {editingCourse && (
            <div className="bg-card border border-primary/30 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Settings className="h-4 w-4" /> Editing: {editingCourse.name}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Weeks</Label>
                  <Input type="number" value={courseWeeks} onChange={(e) => setCourseWeeks(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Price (Rs.)</Label>
                  <Input type="number" value={coursePrice} onChange={(e) => setCoursePrice(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Course Content (one item per line)</Label>
                  <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground min-h-[120px]" value={courseContent} onChange={(e) => setCourseContent(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveCourse}>Save Changes</Button>
                <Button variant="outline" onClick={() => setEditingCourse(null)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="grid gap-3">
            {courses.map((course) => (
              <div key={course.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">{course.name}</h4>
                  <p className="text-sm text-muted-foreground">Rs. {course.price.toLocaleString()} · {course.total_weeks} weeks · {(course.course_content || []).length} topics</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleEditCourse(course)} className="gap-1">
                  <Settings className="h-3 w-3" /> Edit
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
