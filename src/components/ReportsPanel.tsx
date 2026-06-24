import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileBarChart, Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";

type ReportType = "attendance" | "survey";

interface AttendanceRow {
  course: string;
  weeks: number;
  attended: number;
  present: number;
  marked: number;
  runningPercent: number;
  percent: number;
  sessions: { date: string; status: string }[];
}

interface SurveyRow {
  course: string;
  active: boolean;
  submitted: boolean;
}

const ReportsPanel = () => {
  const { user } = useAuth();
  const [selected, setSelected] = useState<ReportType>("attendance");
  const [active, setActive] = useState<ReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [courseOptions, setCourseOptions] = useState<{ id: string; name: string }[]>([]);
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const containerRef = useRef<HTMLDivElement>(null);

  const loadReport = async () => {
    if (!user) return;
    setLoading(true);
    setActive(selected);

    if (selected === "attendance") {
      const { data } = await supabase
        .from("enrollments")
        .select("course_id, attendance, courses(name, total_weeks)")
        .eq("user_id", user.id);
      const opts = (data || []).map((e: any) => ({ id: e.course_id, name: e.courses?.name || "Unknown" }));
      setCourseOptions(opts);
      const filtered = (data || []).filter((e: any) => courseFilter === "all" || e.course_id === courseFilter);
      const rows: AttendanceRow[] = filtered.map((e: any) => {
        const arr = Array.isArray(e.attendance) ? e.attendance : [];
        const present = arr.filter((a: any) => a?.status === "present").length;
        const marked = arr.length;
        const weeks = e.courses?.total_weeks || 0;
        const sessions = [...arr]
          .filter((a: any) => a?.date)
          .sort((a: any, b: any) => (a.date < b.date ? -1 : 1));
        return {
          course: e.courses?.name || "Unknown",
          weeks,
          attended: marked,
          present,
          marked,
          runningPercent: marked > 0 ? Math.round((present / marked) * 100) : 0,
          percent: weeks > 0 ? Math.round((present / weeks) * 100) : 0,
          sessions,
        };
      });
      setAttendance(rows);
    } else {
      const { data: enrolls } = await supabase
        .from("enrollments")
        .select("course_id, courses(name)")
        .eq("user_id", user.id);
      const courseIds = (enrolls || []).map((e: any) => e.course_id);
      let activeSurveys: any[] = [];
      let mySubs: any[] = [];
      if (courseIds.length) {
        const { data: s } = await supabase
          .from("surveys")
          .select("id, course_id, is_active")
          .in("course_id", courseIds);
        activeSurveys = s || [];
        const ids = activeSurveys.map((x) => x.id);
        if (ids.length) {
          const { data: subs } = await supabase
            .from("survey_submissions")
            .select("survey_id")
            .eq("student_id", user.id)
            .in("survey_id", ids);
          mySubs = subs || [];
        }
      }
      const rows: SurveyRow[] = (enrolls || []).map((e: any) => {
        const survey = activeSurveys.find((s) => s.course_id === e.course_id);
        return {
          course: e.courses?.name || "Unknown",
          active: !!survey?.is_active,
          submitted: !!(survey && mySubs.find((m) => m.survey_id === survey.id)),
        };
      });
      setSurveys(rows);
    }
    setLoading(false);
  };

  const downloadPdf = async () => {
    if (!containerRef.current || !active) return;
    try {
      const canvas = await html2canvas(containerRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let y = 10;
      if (imgHeight <= pageHeight - 20) {
        pdf.addImage(img, "PNG", 10, y, imgWidth, imgHeight);
      } else {
        // Slice into pages
        let remaining = imgHeight;
        let offset = 0;
        while (remaining > 0) {
          pdf.addImage(img, "PNG", 10, y - offset, imgWidth, imgHeight);
          remaining -= pageHeight - 20;
          offset += pageHeight - 20;
          if (remaining > 0) pdf.addPage();
        }
      }
      const name =
        (active === "attendance" ? "Attendance_Report" : "Survey_Status_Report") +
        "_" +
        new Date().toISOString().slice(0, 10) +
        ".pdf";
      pdf.save(name);
    } catch (e: any) {
      toast.error("Failed to generate PDF: " + e.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <FileBarChart className="h-5 w-5" /> Reports
      </h2>

      <div className="bg-card border border-border rounded-lg p-5 space-y-4 max-w-xl">
        <div className="space-y-2">
          <Label>Select Report</Label>
          <Select value={selected} onValueChange={(v) => setSelected(v as ReportType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="attendance">Attendance Report</SelectItem>
              <SelectItem value="survey">Survey Status Report</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {selected === "attendance" && courseOptions.length > 0 && (
          <div className="space-y-2">
            <Label>Course / Subject</Label>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All My Courses</SelectItem>
                {courseOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button onClick={loadReport} disabled={loading}>
          {loading ? "Loading..." : "View Report"}
        </Button>
      </div>

      {active && (
        <div className="space-y-3">
          <Button onClick={downloadPdf} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Download Report as PDF
          </Button>

          <div ref={containerRef} className="bg-white text-black border border-border rounded-lg p-6 space-y-4">
            <div className="border-b pb-3">
              <h3 className="text-lg font-bold">
                {active === "attendance" ? "Attendance Report" : "Survey Status Report"}
              </h3>
              <p className="text-xs text-gray-600">
                Generated on {new Date().toLocaleDateString()}
              </p>
            </div>

            {loading ? (
              <div className="py-10 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : active === "attendance" ? (
              <AttendanceTable rows={attendance} />
            ) : (
              <SurveyTable rows={surveys} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AttendanceTable = ({ rows }: { rows: AttendanceRow[] }) => {
  if (!rows.length)
    return <p className="text-sm text-gray-600">No enrollments to report.</p>;
  const avg =
    Math.round(rows.reduce((a, r) => a + r.percent, 0) / rows.length) || 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Courses" value={rows.length.toString()} />
        <Metric
          label="Total Sessions Attended"
          value={rows.reduce((a, r) => a + r.attended, 0).toString()}
        />
        <Metric label="Average Attendance" value={`${avg}%`} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Course</TableHead>
            <TableHead className="text-right">Attended</TableHead>
            <TableHead className="text-right">Total Weeks</TableHead>
            <TableHead>Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.course}>
              <TableCell className="font-medium">{r.course}</TableCell>
              <TableCell className="text-right">{r.attended}</TableCell>
              <TableCell className="text-right">{r.weeks}</TableCell>
              <TableCell className="w-48">
                <div className="flex items-center gap-2">
                  <Progress value={r.percent} className="flex-1 h-2" />
                  <span className="text-xs w-10 text-right">{r.percent}%</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const SurveyTable = ({ rows }: { rows: SurveyRow[] }) => {
  if (!rows.length)
    return <p className="text-sm text-gray-600">No surveys available.</p>;
  const filed = rows.filter((r) => r.submitted).length;
  const pending = rows.filter((r) => r.active && !r.submitted).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Total Courses" value={rows.length.toString()} />
        <Metric label="Surveys Submitted" value={filed.toString()} />
        <Metric label="Pending" value={pending.toString()} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Course</TableHead>
            <TableHead>Survey Active</TableHead>
            <TableHead className="text-right">Submission Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.course}>
              <TableCell className="font-medium">{r.course}</TableCell>
              <TableCell>{r.active ? "Yes" : "No"}</TableCell>
              <TableCell className="text-right">
                {r.submitted ? (
                  <Badge className="bg-green-600 text-white">Submitted</Badge>
                ) : r.active ? (
                  <Badge variant="destructive">Pending</Badge>
                ) : (
                  <Badge variant="outline">N/A</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="border rounded-md p-3">
    <p className="text-xs text-gray-600">{label}</p>
    <p className="text-xl font-bold">{value}</p>
  </div>
);

export default ReportsPanel;