import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Users, BookOpen, Settings, GraduationCap, Trash2, X, Eye, ClipboardList, KeyRound, MessageSquare, Video, Webhook } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminSurveysPanel from "@/components/AdminSurveysPanel";
import CredentialVaultPanel from "@/components/CredentialVaultPanel";
import AdminComplaintsPanel from "@/components/AdminComplaintsPanel";
import AdminLecturesPanel from "@/components/AdminLecturesPanel";
import WebhookTestPanel from "@/components/WebhookTestPanel";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  department: string | null;
  semester: string | null;
  roll_number: string | null;
  father_name: string | null;
  phone: string | null;
  cnic: string | null;
  created_at: string;
  gender?: string | null;
  city?: string | null;
  province?: string | null;
  dob?: string | null;
  qualification?: string | null;
  photo_url?: string | null;
  documents?: Record<string, string> | null;
}

interface Course {
  id: string;
  name: string;
  price: number;
  description: string | null;
  total_weeks: number;
  course_content: string[];
  is_active: boolean;
  short_code?: string | null;
}

const AdminPanel = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedUserEnrollment, setSelectedUserEnrollment] = useState<any>(null);
  const [selectedUserRole, setSelectedUserRole] = useState<string>("");
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [editProfile, setEditProfile] = useState<any | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // User form
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [userRole, setUserRole] = useState<"user" | "student" | "teacher">("student");

  // Course edit
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseWeeks, setCourseWeeks] = useState("");
  const [courseContent, setCourseContent] = useState("");
  const [coursePrice, setCoursePrice] = useState("");
  const [courseShortCode, setCourseShortCode] = useState("");
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCoursePrice, setNewCoursePrice] = useState("");
  const [newCourseDesc, setNewCourseDesc] = useState("");
  const [newCourseWeeks, setNewCourseWeeks] = useState("12");
  const [newCourseContent, setNewCourseContent] = useState("");
  const [newCourseShortCode, setNewCourseShortCode] = useState("");

  // Teacher assignment
  const [assignTeacherId, setAssignTeacherId] = useState("");
  const [assignCourseId, setAssignCourseId] = useState("");

  const PROFILE_COLUMNS = "id,user_id,full_name,email,department,semester,roll_number,father_name,phone,cnic,created_at,gender,city,province,dob,qualification,photo_url,documents";

  const matchesQuery = (p: any) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const norm = (v: any) => String(v ?? "").toLowerCase();
    const noDash = (v: any) => norm(v).replace(/[-\s]/g, "");
    const qNoDash = q.replace(/[-\s]/g, "");
    return [p.full_name, p.email, p.phone, p.cnic, p.father_name].some((f) => norm(f).includes(q))
      || noDash(p.roll_number).includes(qNoDash);
  };
  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).order("created_at", { ascending: false });
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
    const { data: profiles } = await supabase.from("profiles").select(PROFILE_COLUMNS).in("user_id", teacherIds);
    setTeachers(profiles || []);
  };

  const fetchStudents = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const studentIds = (roles || []).filter((r) => (r.role as string) === "student").map((r) => r.user_id);
    if (studentIds.length === 0) { setStudents([]); return; }
    const { data: profiles } = await supabase.from("profiles").select(PROFILE_COLUMNS).in("user_id", studentIds);
    setStudents((profiles || []) as unknown as Profile[]);
  };

  const fetchEnrollments = async () => {
    const { data } = await supabase.from("enrollments").select("*, courses(name)");
    if (!data) { setEnrollments([]); return; }
    const userIds = data.map((e) => e.user_id);
    if (userIds.length === 0) { setEnrollments([]); return; }
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, roll_number").in("user_id", userIds);
    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
    setEnrollments(data.map((e) => ({ ...e, profile: profileMap[e.user_id] })));
  };

  const fetchAssignments = async () => {
    const { data } = await (supabase as any).from("teacher_assignments").select("*, courses(name)");
    if (!data) { setAssignments([]); return; }
    const teacherIds = data.map((a: any) => a.teacher_id);
    if (teacherIds.length === 0) { setAssignments([]); return; }
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds);
    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
    setAssignments(data.map((a: any) => ({ ...a, teacher_name: profileMap[a.teacher_id]?.full_name })));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchCourses(), fetchTeachers(), fetchStudents(), fetchEnrollments(), fetchAssignments()]).then(() => setLoading(false));
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
        body: { email, full_name: fullName, roll_number: rollNumber, father_name: fatherName, phone, cnic, role: userRole },
      });

      if (res.error) {
        toast.error(res.error.message || "Failed to create user");
      } else {
        toast.success("User created successfully. Credentials are available only in the vault.");
        setEmail(""); setFullName(""); setFatherName(""); setRollNumber(""); setPhone(""); setCnic(""); setUserRole("student");
        setShowForm(false);
        fetchUsers();
        fetchStudents();
        fetchTeachers();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    }
    setCreating(false);
  };

  const openCreateWithRole = (role: "user" | "student" | "teacher") => {
    setUserRole(role);
    setShowForm(true);
    setTimeout(() => {
      document.getElementById("admin-create-user-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    setDeletingUserId(userId);
    try {
      const res = await supabase.functions.invoke("delete-user", {
        body: { user_id: userId },
      });
      if (res.error || res.data?.error) {
        toast.error(res.data?.error || "Failed to delete user");
      } else {
        toast.success("User deleted successfully");
        if (selectedUser?.user_id === userId) setSelectedUser(null);
        fetchUsers();
        fetchStudents();
        fetchTeachers();
        fetchEnrollments();
        fetchAssignments();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    }
    setDeletingUserId(null);
  };

  const handleSelectUser = async (user: Profile) => {
    setSelectedUser(user);
    setEditProfile(null);
    // Fetch enrollment for this user
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("*, courses(name)")
      .eq("user_id", user.user_id)
      .maybeSingle();
    setSelectedUserEnrollment(enrollment);
    // Fetch role
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.user_id);
    setSelectedUserRole((roles || []).map((r) => r.role as string).join(", ") || "user");
    // Fetch email from auth via edge function is not possible, use user metadata
    // We'll show email from the users list if available
  };

  const openEditProfile = () => {
    if (!selectedUser) return;
    setEditProfile({
      full_name: selectedUser.full_name || "",
      father_name: (selectedUser as any).father_name || "",
      phone: selectedUser.phone || "",
      cnic: selectedUser.cnic || "",
      roll_number: selectedUser.roll_number || "",
      gender: (selectedUser as any).gender || "",
      dob: (selectedUser as any).dob || "",
      city: (selectedUser as any).city || "",
      province: (selectedUser as any).province || "",
      qualification: (selectedUser as any).qualification || "",
      photo_url: (selectedUser as any).photo_url || "",
      documents_json: JSON.stringify((selectedUser as any).documents || {}, null, 2),
    });
  };

  const handleSaveProfile = async () => {
    if (!selectedUser || !editProfile) return;
    setSavingProfile(true);
    let documents: Record<string, string> = {};
    try {
      documents = editProfile.documents_json ? JSON.parse(editProfile.documents_json) : {};
    } catch {
      toast.error("Documents JSON is invalid");
      setSavingProfile(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editProfile.full_name || null,
        father_name: editProfile.father_name || null,
        phone: editProfile.phone || null,
        cnic: editProfile.cnic || null,
        roll_number: editProfile.roll_number || null,
        gender: editProfile.gender || null,
        dob: editProfile.dob || null,
        city: editProfile.city || null,
        province: editProfile.province || null,
        qualification: editProfile.qualification || null,
        photo_url: editProfile.photo_url || null,
        documents,
      })
      .eq("user_id", selectedUser.user_id);
    setSavingProfile(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile updated");
      setEditProfile(null);
      await fetchUsers();
      await fetchStudents();
      const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("user_id", selectedUser.user_id).maybeSingle();
      if (data) setSelectedUser(data as any);
    }
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseWeeks(String(course.total_weeks));
    setCourseContent((course.course_content || []).join("\n"));
    setCoursePrice(String(course.price));
    setCourseShortCode(course.short_code || "");
  };

  const handleSaveCourse = async () => {
    if (!editingCourse) return;
    const { error } = await supabase
      .from("courses")
      .update({
        total_weeks: parseInt(courseWeeks) || 12,
        course_content: courseContent.split("\n").filter(Boolean),
        price: parseFloat(coursePrice) || 0,
        short_code: courseShortCode.trim().toUpperCase() || null,
      } as any)
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
      short_code: newCourseShortCode.trim().toUpperCase() || null,
    } as any);
    if (error) toast.error(error.message);
    else {
      toast.success("Course added!");
      setShowAddCourse(false);
      setNewCourseName(""); setNewCoursePrice(""); setNewCourseDesc(""); setNewCourseWeeks("12"); setNewCourseContent(""); setNewCourseShortCode("");
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
          <TabsTrigger value="surveys" className="gap-2"><ClipboardList className="h-4 w-4" /> Surveys</TabsTrigger>
          <TabsTrigger value="complaints" className="gap-2"><MessageSquare className="h-4 w-4" /> Complaints</TabsTrigger>
          <TabsTrigger value="lectures" className="gap-2"><Video className="h-4 w-4" /> Lectures</TabsTrigger>
          <TabsTrigger value="vault" className="gap-2"><KeyRound className="h-4 w-4" /> Vault</TabsTrigger>
          <TabsTrigger value="webhook" className="gap-2"><Webhook className="h-4 w-4" /> Webhook</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, reg no, CNIC, phone, email…"
              className="max-w-sm"
            />
            <Button onClick={() => { setUserRole("user"); setShowForm(!showForm); }} className="gap-2">
              <UserPlus className="h-4 w-4" /> {showForm ? "Cancel" : "Create User"}
            </Button>
          </div>

          {showForm && (
            <div id="admin-create-user-form" className="bg-card border border-border rounded-lg p-6 space-y-4">
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
                  <Label>Registration Number</Label>
                  <Input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="e.g. NGCAD-2025-001" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={userRole} onValueChange={(v) => setUserRole(v as "user" | "student" | "teacher")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User (Staff)</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
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
            </div>
          )}

          {/* Selected User Details */}
          {selectedUser && (
            <div className="bg-card border-2 border-primary/30 rounded-lg p-5 space-y-3 relative">
              <button onClick={() => setSelectedUser(null)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Eye className="h-5 w-5" /> User Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div><span className="text-muted-foreground">Full Name:</span> <span className="font-medium text-foreground">{selectedUser.full_name || "—"}</span></div>
                <div><span className="text-muted-foreground">Father Name:</span> <span className="font-medium text-foreground">{(selectedUser as any).father_name || "—"}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium text-foreground font-mono">{(selectedUser as any).email || "—"}</span></div>
                <div><span className="text-muted-foreground">Registration No:</span> <span className="font-medium text-foreground">{selectedUser.roll_number || "—"}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium text-foreground">{selectedUser.phone || "—"}</span></div>
                <div><span className="text-muted-foreground">CNIC:</span> <span className="font-medium text-foreground">{selectedUser.cnic || "—"}</span></div>
                <div><span className="text-muted-foreground">Role:</span> <span className="font-medium text-foreground capitalize">{selectedUserRole}</span></div>
                <div className="md:col-span-2 text-xs text-muted-foreground italic">Passwords are only viewable via the Credential Vault (requires password + 2FA).</div>
                <div><span className="text-muted-foreground">Enrolled Course:</span> <span className="font-medium text-foreground">{selectedUserEnrollment?.courses?.name || "None"}</span></div>
                <div><span className="text-muted-foreground">Payment:</span> <span className={`font-medium ${selectedUserEnrollment?.challan_paid ? "text-green-600" : "text-destructive"}`}>{selectedUserEnrollment ? (selectedUserEnrollment.challan_paid ? "Paid" : "Unpaid") : "N/A"}</span></div>
                <div><span className="text-muted-foreground">Created:</span> <span className="font-medium text-foreground">{new Date(selectedUser.created_at).toLocaleDateString()}</span></div>
              </div>
              <div className="pt-2">
                <Button size="sm" onClick={openEditProfile} className="gap-1">
                  <Settings className="h-3 w-3" /> Edit profile
                </Button>
              </div>
              {editProfile && (
                <div className="mt-4 border-t border-border pt-4 space-y-3">
                  <h4 className="font-semibold text-foreground">Edit Profile</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Full Name</Label><Input value={editProfile.full_name} onChange={(e) => setEditProfile({ ...editProfile, full_name: e.target.value })} /></div>
                    <div className="space-y-1"><Label className="text-xs">Father Name</Label><Input value={editProfile.father_name} onChange={(e) => setEditProfile({ ...editProfile, father_name: e.target.value })} /></div>
                    <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={editProfile.phone} onChange={(e) => setEditProfile({ ...editProfile, phone: e.target.value })} /></div>
                    <div className="space-y-1"><Label className="text-xs">CNIC</Label><Input value={editProfile.cnic} onChange={(e) => setEditProfile({ ...editProfile, cnic: e.target.value })} /></div>
                    <div className="space-y-1"><Label className="text-xs">Registration No.</Label><Input value={editProfile.roll_number} onChange={(e) => setEditProfile({ ...editProfile, roll_number: e.target.value })} /></div>
                    <div className="space-y-1">
                      <Label className="text-xs">Gender</Label>
                      <Select value={editProfile.gender || ""} onValueChange={(v) => setEditProfile({ ...editProfile, gender: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Date of Birth</Label><Input type="date" value={editProfile.dob || ""} onChange={(e) => setEditProfile({ ...editProfile, dob: e.target.value })} /></div>
                    <div className="space-y-1"><Label className="text-xs">City</Label><Input value={editProfile.city} onChange={(e) => setEditProfile({ ...editProfile, city: e.target.value })} /></div>
                    <div className="space-y-1"><Label className="text-xs">Province</Label><Input value={editProfile.province} onChange={(e) => setEditProfile({ ...editProfile, province: e.target.value })} /></div>
                    <div className="space-y-1"><Label className="text-xs">Qualification</Label><Input value={editProfile.qualification} onChange={(e) => setEditProfile({ ...editProfile, qualification: e.target.value })} /></div>
                    <div className="space-y-1 md:col-span-2"><Label className="text-xs">Photo URL</Label><Input value={editProfile.photo_url} onChange={(e) => setEditProfile({ ...editProfile, photo_url: e.target.value })} placeholder="https://…" /></div>
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs">Documents (JSON map of label → URL)</Label>
                      <textarea
                        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground min-h-[120px] font-mono"
                        value={editProfile.documents_json}
                        onChange={(e) => setEditProfile({ ...editProfile, documents_json: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile}>
                      {savingProfile ? "Saving…" : "Save Changes"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditProfile(null)}>Cancel</Button>
                  </div>
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
                    <th className="text-left p-3 font-medium text-muted-foreground">Reg. Number</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Created</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No users found.</td></tr>
                  ) : (
                    users.map((u) => (
                      <tr
                        key={u.id}
                        className="border-t border-border hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleSelectUser(u)}
                      >
                        <td className="p-3 text-foreground font-medium">{u.full_name || "—"}</td>
                        <td className="p-3 text-muted-foreground">{u.department || "—"}</td>
                        <td className="p-3 text-muted-foreground">{u.semester || "—"}</td>
                        <td className="p-3 text-muted-foreground">{u.roll_number || "—"}</td>
                        <td className="p-3 text-muted-foreground">{u.phone || "—"}</td>
                        <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1 h-7 text-xs"
                            disabled={deletingUserId === u.user_id}
                            onClick={() => handleDeleteUser(u.user_id)}
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </Button>
                        </td>
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
          <h3 className="text-lg font-semibold text-foreground">All Students</h3>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Reg. No</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Father Name</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
                     <th className="text-left p-3 font-medium text-muted-foreground">CNIC</th>
                     <th className="text-left p-3 font-medium text-muted-foreground">Created</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                   {students.length === 0 ? (
                     <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No students found.</td></tr>
                  ) : (
                    students.map((s) => (
                      <tr key={s.id} className="border-t border-border hover:bg-muted/50">
                        <td className="p-3 text-foreground font-medium">{s.full_name || "—"}</td>
                        <td className="p-3 text-muted-foreground font-mono text-xs">{s.email || "—"}</td>
                        <td className="p-3 text-muted-foreground">{s.roll_number || "—"}</td>
                        <td className="p-3 text-muted-foreground">{s.father_name || "—"}</td>
                        <td className="p-3 text-muted-foreground">{s.phone || "—"}</td>
                         <td className="p-3 text-muted-foreground">{s.cnic || "—"}</td>
                         <td className="p-3 text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                        <td className="p-3">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1 h-7 text-xs"
                            disabled={deletingUserId === s.user_id}
                            onClick={() => handleDeleteUser(s.user_id)}
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </Button>
                        </td>
                      </tr>
                    ))
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
                    {teachers.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">No teachers. Create a user with Teacher role first.</div>
                    ) : (
                      teachers.map((t) => (
                        <SelectItem key={t.user_id} value={t.user_id}>{t.full_name || t.user_id}</SelectItem>
                      ))
                    )}
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
                  <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No teachers found. Create a user with Teacher role first.</td></tr>
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
        <TabsContent value="surveys" className="space-y-4 mt-4">
          <AdminSurveysPanel />
        </TabsContent>
        <TabsContent value="complaints" className="space-y-4 mt-4">
          <AdminComplaintsPanel />
        </TabsContent>
        <TabsContent value="lectures" className="space-y-4 mt-4">
          <AdminLecturesPanel />
        </TabsContent>
        <TabsContent value="vault" className="mt-4">
          <CredentialVaultPanel />
        </TabsContent>
        <TabsContent value="webhook" className="mt-4">
          <WebhookTestPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
