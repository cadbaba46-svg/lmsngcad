import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Lock, AlertTriangle, CheckCircle2, RotateCw, Play } from "lucide-react";
import { toast } from "sonner";

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  video_type: string;
  duration_seconds: number;
  pass_threshold: number;
}

interface MCQ {
  question: string;
  options: string[];
}

type Phase = "watching" | "loading-quiz" | "quiz" | "result";

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

const MandatoryLectureGate = ({ lecture, onPassed }: { lecture: Lecture; onPassed: () => void }) => {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("watching");
  const [videoEnded, setVideoEnded] = useState(false);
  const [strikes, setStrikes] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Anti-multitasking: detect visibility/focus changes during quiz
  useEffect(() => {
    if (phase !== "quiz") return;
    let strikeCount = 0;
    const onHide = () => {
      if (document.hidden) {
        strikeCount++;
        setStrikes(strikeCount);
        setWarning(`Don't switch tabs! Strike ${strikeCount}/3. ${strikeCount >= 3 ? "Quiz reset." : ""}`);
        if (strikeCount >= 3) {
          // Reset answers and reshuffle by re-fetching
          setAnswers([]);
          setStrikes(0);
          strikeCount = 0;
          setQuestions((q) => [...q].reverse());
          toast.error("Quiz reset due to tab switching.");
        }
      }
    };
    const onBlur = () => onHide();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("blur", onBlur);
    };
  }, [phase]);

  // Block right-click and keyboard shortcuts while in gate
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", prevent);
    return () => document.removeEventListener("contextmenu", prevent);
  }, []);

  const ytId = lecture.video_type === "youtube" ? extractYouTubeId(lecture.video_url) : null;

  // For YouTube, we cannot reliably detect end without IFrame API; use a Mark Watched button gated by a minimum time
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  useEffect(() => {
    if (phase !== "watching" || !ytId) return;
    const t = setInterval(() => setWatchedSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase, ytId]);

  const minWatchSeconds = Math.max(60, Math.floor((lecture.duration_seconds || 300) * 0.8));
  const canProceedYT = ytId && watchedSeconds >= minWatchSeconds;

  const startQuiz = useCallback(async () => {
    setPhase("loading-quiz");
    try {
      const { data, error } = await supabase.functions.invoke("generate-lecture-quiz", {
        body: { lecture_id: lecture.id },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Failed to generate quiz. Try again.");
        setPhase("watching");
        return;
      }
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(-1));
      setSessionId(data.session_id);
      setPhase("quiz");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate quiz.");
      setPhase("watching");
    }
  }, [lecture]);

  const submitQuiz = async () => {
    if (!user || !sessionId) return;
    if (answers.some((a) => a < 0)) { toast.error("Answer all questions"); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-lecture-quiz", {
        body: { session_id: sessionId, answers },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Failed to submit quiz.");
        return;
      }
      setScore(data.score);
      setTotal(data.total);
      setPhase("result");
    } finally {
      setSubmitting(false);
    }
  };

  const retake = () => {
    setAnswers([]);
    setQuestions([]);
    setScore(0);
    setTotal(0);
    setSessionId(null);
    setWarning(null);
    setVideoEnded(false);
    setWatchedSeconds(0);
    setPhase("watching");
  };

  const passed = phase === "result" && score >= lecture.pass_threshold;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 sm:p-8">
        <div className="w-full max-w-3xl bg-card border border-border rounded-xl shadow-2xl">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <Lock className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold text-foreground">Mandatory Lecture: {lecture.title}</h2>
              <p className="text-xs text-muted-foreground">You must watch the video and pass the quiz to access the LMS.</p>
            </div>
          </div>

          {warning && (
            <div className="m-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> {warning}
            </div>
          )}

          <div className="p-5 space-y-5">
            {phase === "watching" && (
              <>
                <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
                  {ytId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}?modestbranding=1&rel=0&controls=1`}
                      title={lecture.title}
                      className="w-full h-full"
                      allow="accelerometer; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      src={lecture.video_url}
                      controls
                      controlsList="nodownload noplaybackrate"
                      disablePictureInPicture
                      className="w-full h-full"
                      onEnded={() => setVideoEnded(true)}
                    />
                  )}
                </div>
                {ytId ? (
                  <div className="text-sm text-muted-foreground">
                    Watched: {Math.floor(watchedSeconds / 60)}m {watchedSeconds % 60}s
                    {!canProceedYT && <> · need at least {Math.floor(minWatchSeconds / 60)}m {minWatchSeconds % 60}s</>}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {videoEnded ? "Video completed." : "Watch the full video to unlock the quiz."}
                  </div>
                )}
                <Button
                  onClick={startQuiz}
                  disabled={ytId ? !canProceedYT : !videoEnded}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Play className="h-4 w-4" /> Start Quiz
                </Button>
              </>
            )}

            {phase === "loading-quiz" && (
              <div className="py-12 text-center space-y-3">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Generating quiz questions from the lecture…</p>
              </div>
            )}

            {phase === "quiz" && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Answer all {questions.length} questions. You need {lecture.pass_threshold}/{questions.length} to pass.
                  Do not switch tabs — you have 3 strikes.
                </p>
                {questions.map((q, qi) => (
                  <div key={qi} className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
                    <div className="font-semibold text-foreground">{qi + 1}. {q.question}</div>
                    <div className="space-y-2">
                      {q.options.map((opt, oi) => (
                        <label
                          key={oi}
                          className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted/60 ${answers[qi] === oi ? "bg-primary/10 ring-1 ring-primary" : ""}`}
                        >
                          <input
                            type="radio"
                            name={`q-${qi}`}
                            checked={answers[qi] === oi}
                            onChange={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                          />
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <Button onClick={submitQuiz} disabled={submitting} className="w-full" size="lg">
                  {submitting ? "Submitting…" : "Submit Quiz"}
                </Button>
              </div>
            )}

            {phase === "result" && (
              <div className="text-center space-y-4 py-6">
                {passed ? (
                  <>
                    <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
                    <h3 className="text-2xl font-bold text-foreground">Passed! Score: {score}/{total}</h3>
                    <p className="text-muted-foreground">Your dashboard is now unlocked.</p>
                    <Button onClick={onPassed} size="lg">Enter LMS</Button>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto" />
                    <h3 className="text-2xl font-bold text-foreground">Score: {score}/{total}</h3>
                    <p className="text-muted-foreground">You need {lecture.pass_threshold} to pass. Try again with fresh questions.</p>
                    <Button onClick={retake} size="lg" className="gap-2">
                      <RotateCw className="h-4 w-4" /> Retake
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MandatoryLectureGate;