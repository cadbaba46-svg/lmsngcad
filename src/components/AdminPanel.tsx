import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Copy, Users } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  department: string | null;
  semester: string | null;
  roll_number: string | null;
  created_at: string;
}

const AdminPanel = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [createdEmail, setCreatedEmail] = useState("");

  // Form state
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [rollNumber, setRollNumber] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load users");
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName) {
      toast.error("Email and Full Name are required");
      return;
    }
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("create-user", {
        body: { email, full_name: fullName, department, semester, roll_number: rollNumber },
      });

      if (res.error) {
        toast.error(res.error.message || "Failed to create user");
      } else {
        const { password } = res.data;
        setGeneratedPassword(password);
        setCreatedEmail(email);
        toast.success("User created successfully!");
        setEmail("");
        setFullName("");
        setDepartment("");
        setSemester("");
        setRollNumber("");
        fetchUsers();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    }
    setCreating(false);
  };

  const copyCredentials = () => {
    const text = `Email: ${createdEmail}\nPassword: ${generatedPassword}`;
    navigator.clipboard.writeText(text);
    toast.success("Credentials copied to clipboard!");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-6 w-6" /> Admin Control Panel
        </h2>
        <Button onClick={() => { setShowForm(!showForm); setGeneratedPassword(""); }} className="gap-2">
          <UserPlus className="h-4 w-4" />
          {showForm ? "Cancel" : "Create User"}
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
              <Label>Department</Label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Semester</Label>
              <Input value={semester} onChange={(e) => setSemester(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Roll Number</Label>
              <Input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} />
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
                <th className="text-left p-3 font-medium text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No users found.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t border-border hover:bg-muted/50">
                    <td className="p-3 text-foreground">{u.full_name || "—"}</td>
                    <td className="p-3 text-muted-foreground">{u.department || "—"}</td>
                    <td className="p-3 text-muted-foreground">{u.semester || "—"}</td>
                    <td className="p-3 text-muted-foreground">{u.roll_number || "—"}</td>
                    <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
