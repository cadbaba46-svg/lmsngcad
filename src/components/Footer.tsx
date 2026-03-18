import { Mail } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-card px-6 py-4 text-sm text-muted-foreground">
    <div className="flex flex-col md:flex-row justify-between items-start gap-3">
      <div className="space-y-1">
        <a href="#" className="block text-primary hover:underline">LMS Help Center</a>
        <a href="#" className="block text-primary hover:underline">News</a>
        <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> lms@ngcad.org</span>
      </div>
      <p>Copyright © Next Gen Cad Academy</p>
    </div>
  </footer>
);

export default Footer;
