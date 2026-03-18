import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardSidebar from "@/components/DashboardSidebar";
import OfferedSubjectsPanel from "@/components/OfferedSubjectsPanel";
import AdminPanel from "@/components/AdminPanel";
import ngcadLogo from "@/assets/ngcad-logo.png";
import { LogOut } from "lucide-react";

const Dashboard = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState("offered-subjects");
  const [profileName, setProfileName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.full_name) setProfileName(data.full_name);
        });

      // Check admin role
      supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
        setIsAdmin(data === true);
        if (data === true) setActiveItem("admin-panel");
      });
    }
  }, [user]);

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
        <span className="opacity-70">Portal</span>
        <span className="opacity-70">Website</span>
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
          <DashboardSidebar activeItem={activeItem} onItemClick={setActiveItem} isAdmin={isAdmin} />
        </div>
        <main className="flex-1 overflow-auto">{renderContent()}</main>
      </div>
    </div>
  );
};

export default Dashboard;
