import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardSidebar from "@/components/DashboardSidebar";
import OfferedSubjectsPanel from "@/components/OfferedSubjectsPanel";
import universityLogo from "@/assets/university-logo.png";
import { LogOut } from "lucide-react";

const Dashboard = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState("offered-subjects");
  const [profileName, setProfileName] = useState("");

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
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const renderContent = () => {
    switch (activeItem) {
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
            <img src={universityLogo} alt="University Logo" className="h-20 w-20 object-contain" />
          </div>
          <DashboardSidebar activeItem={activeItem} onItemClick={setActiveItem} />
        </div>
        <main className="flex-1 overflow-auto">{renderContent()}</main>
      </div>
    </div>
  );
};

export default Dashboard;
