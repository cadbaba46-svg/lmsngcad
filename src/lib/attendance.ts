type AttendanceStatus = "present" | "late" | "absent" | string;

export interface AttendanceEntry {
  date?: string;
  status?: AttendanceStatus;
}

export const getAttendanceStats = (attendance: unknown, totalWeeks = 0) => {
  const entries = Array.isArray(attendance) ? (attendance as AttendanceEntry[]) : [];
  const present = entries.filter((entry) => entry?.status === "present").length;
  const late = entries.filter((entry) => entry?.status === "late").length;
  const absent = entries.filter((entry) => entry?.status === "absent").length;
  const marked = entries.length;
  const attended = present + late * 0.5;
  const roundedAttended = Math.round(attended * 10) / 10;
  const runningPercent = marked > 0 ? Math.round((attended / marked) * 100) : 0;
  const totalPercent = totalWeeks > 0 ? Math.round((attended / totalWeeks) * 100) : 0;

  return {
    entries,
    present,
    late,
    absent,
    marked,
    attended: roundedAttended,
    runningPercent,
    totalPercent,
    totalWeeks,
  };
};

export const formatAttendanceCount = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);