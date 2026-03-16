import { cn } from "@/lib/utils";

interface SidebarSection {
  title: string;
  items: { label: string; id: string }[];
}

const sections: SidebarSection[] = [
  {
    title: "Academic Calendar",
    items: [
      { label: "Offered Subjects", id: "offered-subjects" },
      { label: "Department TimeTable", id: "dept-timetable" },
      { label: "Current Courses", id: "current-courses" },
      { label: "Student TimeTable", id: "student-timetable" },
      { label: "Start Secure Exam Browser", id: "exam-browser" },
    ],
  },
  {
    title: "Hostel",
    items: [
      { label: "Hostel Cancel", id: "hostel-cancel" },
      { label: "Hostel Admission", id: "hostel-admission" },
      { label: "Hostel Comments", id: "hostel-comments" },
    ],
  },
  {
    title: "Curriculum Design",
    items: [{ label: "Thesis Track", id: "thesis-track" }],
  },
  {
    title: "Results",
    items: [{ label: "View DMC", id: "view-dmc" }],
  },
  {
    title: "Admissions",
    items: [
      { label: "Student Clearance", id: "student-clearance" },
      { label: "Student Information", id: "student-info" },
      { label: "Re-Admission Request", id: "re-admission" },
    ],
  },
  {
    title: "Reporting",
    items: [{ label: "Reports", id: "reports" }],
  },
  {
    title: "Student Services",
    items: [
      { label: "Student Services", id: "student-services" },
      { label: "Student Request", id: "student-request" },
    ],
  },
  {
    title: "Course Surveys",
    items: [
      { label: "Surveys For Subjects", id: "surveys-subjects" },
      { label: "Exit Survey", id: "exit-survey" },
      { label: "University Survey", id: "university-survey" },
      { label: "Elective Course Selection", id: "elective-selection" },
    ],
  },
  {
    title: "Dues Management",
    items: [
      { label: "Student Profile", id: "student-profile" },
      { label: "Fee Challans", id: "fee-challans" },
      { label: "Dues Summary", id: "dues-summary" },
      { label: "Miscellaneous Challan", id: "misc-challan" },
      { label: "Apply Scholarship", id: "apply-scholarship" },
    ],
  },
];

interface DashboardSidebarProps {
  activeItem: string;
  onItemClick: (id: string) => void;
}

const DashboardSidebar = ({ activeItem, onItemClick }: DashboardSidebarProps) => {
  return (
    <aside className="lms-sidebar w-60 min-h-screen overflow-y-auto flex-shrink-0">
      <div className="py-4">
        {sections.map((section) => (
          <div key={section.title} className="mb-2">
            <div className="lms-sidebar-section px-4 py-2">{section.title}</div>
            {section.items.map((item) => (
              <div
                key={item.id}
                onClick={() => onItemClick(item.id)}
                className={cn("lms-sidebar-item", activeItem === item.id && "active")}
              >
                {item.label}
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default DashboardSidebar;
