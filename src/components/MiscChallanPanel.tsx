import { FileText } from "lucide-react";

const MiscChallanPanel = () => {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5" /> Create Bill Online
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Generate a miscellaneous challan through the NGCAD Fee Management System.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <iframe
          src="https://fms.ngcad.org/?mode=create"
          title="FMS Create Bill Online"
          className="w-full"
          style={{ height: "1100px", border: "0" }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
};

export default MiscChallanPanel;
