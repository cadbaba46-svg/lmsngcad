import { Search } from "lucide-react";

const MiscChallanPanel = () => {
  const fmsUrl = "https://fms.ngcad.org?option=create-bill";

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Search className="h-5 w-5" /> Miscellaneous Challan
      </h2>
      <p className="text-sm text-muted-foreground">
        Create or manage miscellaneous challans via FMS.
      </p>
      <div className="border border-border rounded-lg overflow-hidden bg-card" style={{ height: "70vh" }}>
        <iframe
          src={fmsUrl}
          className="w-full h-full border-0"
          title="FMS Miscellaneous Challan"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </div>
    </div>
  );
};

export default MiscChallanPanel;
