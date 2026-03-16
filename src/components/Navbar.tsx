import { Link, useNavigate } from "react-router-dom";
import universityLogo from "@/assets/university-logo.png";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Degree Verification", to: "#" },
  { label: "LMS Help", to: "#" },
  { label: "Contact us", to: "#" },
  { label: "Support", to: "#" },
  { label: "Downloads", to: "#" },
  { label: "Alumni Registration", to: "#" },
];

interface NavbarProps {
  isLoggedIn?: boolean;
  userName?: string;
}

const Navbar = ({ isLoggedIn = false, userName }: NavbarProps) => {
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-card shadow-sm">
      <div className="flex items-center gap-4 px-4 py-2">
        <Link to="/" className="flex items-center gap-2">
          <img src={universityLogo} alt="University Logo" className="h-12 w-12 object-contain" />
        </Link>
        <nav className="hidden md:flex items-center gap-1 flex-wrap">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          {isLoggedIn ? (
            <span className="text-sm font-medium text-foreground">{userName}</span>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors border-l-2 border-primary pl-3"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
