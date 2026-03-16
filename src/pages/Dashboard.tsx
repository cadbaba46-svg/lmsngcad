import { useState } from "react";
import Navbar from "@/components/Navbar";
import DashboardSidebar from "@/components/DashboardSidebar";
import OfferedSubjectsPanel from "@/components/OfferedSubjectsPanel";
import universityLogo from "@/assets/university-logo.png";

const Dashboard = () => {
  const [activeItem, setActiveItem] = useState("offered-subjects");

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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top nav bar */}
      <div className="lms-navbar flex items-center gap-4 px-4 py-1.5 text-sm">
        <span className="font-medium">LMS</span>
        <span className="opacity-70">Portal</span>
        <span className="opacity-70">Website</span>
        <span className="ml-auto font-medium">Muhammad Bilal</span>
      </div>

      <div className="flex flex-1">
        {/* Sidebar with logo */}
        <div className="flex flex-col">
          <div className="lms-sidebar flex items-center justify-center py-4 px-4">
            <img src={universityLogo} alt="University Logo" className="h-20 w-20 object-contain" />
          </div>
          <DashboardSidebar activeItem={activeItem} onItemClick={setActiveItem} />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto">{renderContent()}</main>
      </div>
    </div>
  );
};

export default Dashboard;
