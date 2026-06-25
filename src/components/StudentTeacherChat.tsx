import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { encryptMessage, decryptMessage, threadKey } from "@/lib/chatCrypto";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  studentId: string;
  teacherId: string;
  teacherName?: string;
  courseName?: string;
}

interface Msg {
  id: string;
  sender_id: string;
  ciphertext: string;
  created_at: string;
}

const StudentTeacherChat = ({ open, onOpenChange, courseId, studentId, teacherId, teacherName, courseName }: Props) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const key = threadKey(courseId, studentId, teacherId);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("student_teacher_messages")
      .select("id, sender_id, ciphertext, created_at")
      .eq("course_id", courseId)
      .eq("student_id", studentId)
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: true });
    if (error) toast.error("Could not load chat");
    setMessages((data || []) as Msg[]);
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
  };

  useEffect(() => {
    if (!open) return;
    load();
    const channel = (supabase as any)
      .channel(`chat-${courseId}-${studentId}-${teacherId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "student_teacher_messages",
          filter: `course_id=eq.${courseId}`,
        },
        (payload: any) => {
          const row = payload.new as Msg & { student_id: string; teacher_id: string };
          if (row.student_id === studentId && row.teacher_id === teacherId) {
            setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
            setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
          }
        }
      )
      .subscribe();
    return () => {
      (supabase as any).removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, courseId, studentId, teacherId]);

  const send = async () => {
    const body = text.trim();
    if (!body || !user) return;
    setSending(true);
    const ciphertext = encryptMessage(body, key);
    const { error } = await (supabase as any).from("student_teacher_messages").insert({
      course_id: courseId,
      student_id: studentId,
      teacher_id: teacherId,
      sender_id: user.id,
      ciphertext,
    });
    if (error) {
      toast.error(error.message || "Failed to send");
    } else {
      setText("");
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Chat with {teacherName || "Instructor"}</DialogTitle>
          <DialogDescription className="flex items-center gap-1 text-xs">
            <Lock className="h-3 w-3" /> {courseName || "Course"} · Messages are stored encrypted. Admins can view for moderation.
          </DialogDescription>
        </DialogHeader>
        <div ref={scrollRef} className="h-80 overflow-y-auto rounded border border-border bg-muted/30 p-3 space-y-2">
          {loading ? (
            <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">No messages yet. Say hello!</p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"}`}>
                    <div>{decryptMessage(m.ciphertext, key)}</div>
                    <div className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <Button onClick={send} disabled={sending || !text.trim()} className="gap-1">
            <Send className="h-4 w-4" /> Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentTeacherChat;