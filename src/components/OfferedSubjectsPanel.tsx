import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const OfferedSubjectsPanel = () => {
  const [semester, setSemester] = useState("");

  return (
    <div className="p-6 space-y-6">
      <p className="text-sm text-primary font-medium leading-relaxed">
        Semester Regulations 19(b): The student may add or drop subjects within first three weeks of fall and spring semesters and within first week of summer semester.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 items-center max-w-xl">
        <label className="text-sm font-medium text-foreground">Semester</label>
        <Input value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="Select semester" />
        <label className="text-sm font-medium text-foreground">Offered Subjects</label>
        <Input placeholder="Select subject" />
      </div>

      <Button variant="destructive" size="sm">Load Offered Sections</Button>

      <p className="text-sm text-primary font-medium leading-relaxed">
        Note: For Postgraduate and Doctorate programs, subject registration beyond the designated degree duration (4 and 6 semesters, respectively) is permissible only after converting your admission retention fee challan to a full fee challan and completing the required payment. Upon clicking the 'Register' button, the system will automatically convert your retention fee challan to a full fee challan.
      </p>

      <div className="border border-border rounded-md">
        <div className="bg-muted px-4 py-2 text-sm font-medium border-b border-border">Sections</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Subject Name</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Section Name</TableHead>
              <TableHead>Faculty</TableHead>
              <TableHead>Offered In</TableHead>
              <TableHead>Class timing</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Semester</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                No subjects loaded. Please select a semester and subject above.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OfferedSubjectsPanel;
