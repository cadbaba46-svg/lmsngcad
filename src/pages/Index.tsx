import { motion } from "framer-motion";
import { BookOpen, Calendar, GraduationCap, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroBanner from "@/assets/hero-banner.jpg";

const features = [
  { icon: BookOpen, title: "Semester Planning", desc: "Plan semesters, assign classes, allocate labs, and generate timetables." },
  { icon: Calendar, title: "Examination News", desc: "Stay updated with the latest examination schedules and announcements." },
  { icon: GraduationCap, title: "Thesis Track", desc: "Complete flow of Thesis Track for Postgraduate and Doctorate students." },
  { icon: Users, title: "Outcome-Based Education", desc: "Continuous improvement of student learning through OBE methodology." },
];

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative h-[420px] overflow-hidden">
        <img src={heroBanner} alt="Campus" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "var(--hero-overlay)" }} />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>
              Learning Management System
            </h1>
            <p className="max-w-2xl text-primary-foreground/90 text-base md:text-lg leading-relaxed">
              Dear Students, The LMS subject registration for Spring 2026 semester is now reopened. The final deadline is Sunday, 15 March. Students must register all pending subjects before the deadline.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Announcement bar */}
      <div className="bg-primary text-primary-foreground text-center py-3 text-sm font-medium tracking-wide">
        Examination News / Updates
      </div>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <f.icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
