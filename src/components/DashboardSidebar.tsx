import { cn } from "@/lib/utils";

interface SidebarSection {
  title: string;
  items: { label: string; id: string }[];
}

export const ADMIN_SECTIONS: { label: string; id: string }[] = [
  { label: "Users", id: "admin-users" },
  { label: "Students", id: "admin-students" },
  { label: "Teachers", id: "admin-teachers" },
  { label: "Courses", id: "admin-courses" },
  { label: "Survey Tracking", id: "admin-survey-tracking" },
  { label: "Complaints", id: "admin-complaints" },
  { label: "Lectures", id: "admin-lectures" },
  { label: "Vault", id: "admin-vault" },
  { label: "Webhook", id: "admin-webhook" },
];

const studentSections: SidebarSection[] = [
  {
    title: "Academic Calendar",
    items: [
      { label: "Offered Subjects", id: "offered-subjects" },
      { label: "Department TimeTable", id: "dept-timetable" },
      { label: "Current Courses", id: "current-courses" },
      { label: "Student TimeTable", id: "student-timetable" },
      { label: "Elective Course Selection", id: "elective-selection" },
      { label: "Start Secure Exam Browser", id: "exam-browser" },
    ],
  },
  {
    title: "Results",
    items: [
      { label: "View DMC", id: "view-dmc" },
      { label: "Course Track", id: "course-track" },
    ],
  },
  {
    title: "Admissions",
    items: [
      { label: "Student Clearance", id: "student-clearance" },
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
      { label: "Course Freeze", id: "course-freeze" },
      { label: "Complaints", id: "complaints" },
    ],
  },
  {
    title: "Course Surveys",
    items: [
      { label: "Surveys For Subjects", id: "surveys-subjects" },
      { label: "Exit Survey", id: "exit-survey" },
      { label: "University Survey", id: "university-survey" },
    ],
  },
  {
    title: "Dues Management",
    items: [
      { label: "Student Profile", id: "student-profile" },
      { label: "Fee Challans & Dues", id: "dues-summary" },
      { label: "Miscellaneous Challan", id: "misc-challan" },
      { label: "Apply Scholarship", id: "apply-scholarship" },
    ],
  },
];

const teacherSections: SidebarSection[] = [
  {
    title: "Course Management",
    items: [
      { label: "My Courses", id: "teacher-courses" },
      { label: "Student Details", id: "teacher-students" },
      { label: "Attendance", id: "teacher-attendance" },
      { label: "Mark Evaluations", id: "teacher-evaluations" },
      { label: "Result Sheet", id: "teacher-result-sheet" },
    ],
  },
];

interface DashboardSidebarProps {
  activeItem: string;
  onItemClick: (id: string) => void;
  isAdmin?: boolean;
  isTeacher?: boolean;
  profileLabel?: string;
  isStaff?: boolean;
  allowedAdminSections?: string[];
}

const DashboardSidebar = ({ activeItem, onItemClick, isAdmin, isTeacher, profileLabel, isStaff, allowedAdminSections }: DashboardSidebarProps) => {
  // Admins and staff get ONLY the admin sections vertically (no student sidebar).
  if (isAdmin || isStaff) {
    const items = isAdmin
      ? ADMIN_SECTIONS
      : ADMIN_SECTIONS.filter((s) => (allowedAdminSections || []).includes(s.id));
    return (
      <aside className="lms-sidebar w-44 min-h-screen overflow-y-auto flex-shrink-0">
        <div className="py-4">
          <div className="mb-2">
            <div className="lms-sidebar-section px-4 py-2">Administration</div>
            {items.length === 0 ? (
              <div className="px-4 py-2 text-xs text-muted-foreground/70">No sections assigned.</div>
            ) : items.map((item) => (
              <div
                key={item.id}
                onClick={() => onItemClick(item.id)}
                className={cn("lms-sidebar-item", activeItem === item.id && "active")}
              >
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  const baseSections = isTeacher ? teacherSections : studentSections;
  const sections = profileLabel
    ? baseSections.map((s) => ({
        ...s,
        items: s.items.map((i) =>
          i.id === "student-profile" ? { ...i, label: profileLabel } : i
        ),
      }))
    : baseSections;

  return (
    <aside className="lms-sidebar w-44 min-h-screen overflow-y-auto flex-shrink-0">
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
