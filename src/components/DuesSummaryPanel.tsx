import { Receipt } from "lucide-react";
import ChallansView from "./ChallansView";

const DuesSummaryPanel = () => (
  <ChallansView title="Dues Summary" icon={<Receipt className="h-5 w-5" />} variant="summary" />
);

export default DuesSummaryPanel;
