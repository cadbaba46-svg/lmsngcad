import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardSidebar from "@/components/DashboardSidebar";
import OfferedSubjectsPanel from "@/components/OfferedSubjectsPanel";
import CurrentCoursesPanel from "@/components/CurrentCoursesPanel";
import StudentProfilePanel from "@/components/StudentProfilePanel";
import AdminPanel from "@/components/AdminPanel";
import TeacherCoursesPanel from "@/components/TeacherCoursesPanel";
import TeacherStudentsPanel from "@/components/TeacherStudentsPanel";
import TeacherAttendancePanel from "@/components/TeacherAttendancePanel";
import FeeChallansPanel from "@/components/FeeChallansPanel";
import MiscChallanPanel from "@/components/MiscChallanPanel";
import DuesSummaryPanel from "@/components/DuesSummaryPanel";
import CourseFreezePanel from "@/components/CourseFreezePanel";
import ngcadLogo from "@/assets/ngcad-logo.png";
import { LogOut } from "lucide-react";

const Dashboard = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState("offered-subjects");
  const [profileName, setProfileName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [history, setHistory] = useState<string[]>(["offered-subjects"]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("full_name, roll_number")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.full_name) setProfileName(data.roll_number || data.full_name);
        });

      supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
        const roles = (data || []).map((r) => r.role as string);
        const admin = roles.includes("admin");
        const teacher = roles.includes("teacher");
        setIsAdmin(admin);
        setIsTeacher(teacher);

        if (admin) {
          setActiveItem("admin-panel");
          setHistory(["admin-panel"]);
        } else if (teacher) {
          setActiveItem("teacher-courses");
          setHistory(["teacher-courses"]);
        }
      });
    }
  }, [user]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      setHistory((prev) => {
        if (prev.length > 1) {
          const newHistory = prev.slice(0, -1);
          setActiveItem(newHistory[newHistory.length - 1]);
          return newHistory;
        }
        window.history.pushState({ dashboard: true }, "");
        return prev;
      });
    };

    window.history.pushState({ dashboard: true }, "");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleItemClick = useCallback((id: string) => {
    setActiveItem(id);
    setHistory((prev) => [...prev, id]);
    window.history.pushState({ dashboard: true, panel: id }, "");
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const renderContent = () => {
    switch (activeItem) {
      case "admin-panel":
        return isAdmin ? <AdminPanel /> : null;
      case "offered-subjects":
        return <OfferedSubjectsPanel />;
      case "current-courses":
        return <CurrentCoursesPanel />;
      case "student-profile":
        return <StudentProfilePanel />;
      case "fee-challans":
        return <FeeChallansPanel />;
      case "misc-challan":
        return <MiscChallanPanel />;
      case "dues-summary":
        return <DuesSummaryPanel />;
      case "teacher-courses":
        return <TeacherCoursesPanel />;
      case "teacher-students":
        return <TeacherStudentsPanel />;
      case "teacher-attendance":
        return <TeacherAttendancePanel />;
      default:
        return (
          <div className="p-6 text-muted-foreground flex items-center justify-center min-h-[300px]">
            <p className="text-lg">Select a menu item from the sidebar to get started.</p>
          </div>
        );
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="lms-navbar flex items-center gap-4 px-4 py-1.5 text-sm">
        <span className="font-medium">LMS</span>
        <a href="https://ngcad.org" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer">Portal</a>
        <a href="https://ngcad.org" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer">Website</a>
        <a href="https://fms.ngcad.org" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity cursor-pointer">FMS</a>
        <div className="ml-auto flex items-center gap-3">
          <span className="font-medium">{profileName || user?.email}</span>
          <button onClick={handleSignOut} className="opacity-70 hover:opacity-100 transition-opacity">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1">
        <div className="flex flex-col">
          <div className="lms-sidebar flex items-center justify-center py-4 px-4">
            <img src={ngcadLogo} alt="Next Gen Cad Academy" className="h-20 w-20 object-contain" />
          </div>
          <DashboardSidebar activeItem={activeItem} onItemClick={handleItemClick} isAdmin={isAdmin} isTeacher={isTeacher} />
        </div>
        <main className="flex-1 overflow-auto">{renderContent()}</main>
      </div>
    </div>
  );
};

export default Dashboard;
