import { FileText } from "lucide-react";
import ChallansView from "./ChallansView";

const FeeChallansPanel = () => (
  <ChallansView title="Fee Challans" icon={<FileText className="h-5 w-5" />} variant="full" />
);

export default FeeChallansPanel;
