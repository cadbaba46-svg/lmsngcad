import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Lock, AlertTriangle, CheckCircle2, RotateCw, Play, Pause } from "lucide-react";
import { toast } from "sonner";

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  video_type: string;
  duration_seconds: number;
  pass_threshold: number;
  is_quiz_mandatory?: boolean;
  watch_percentage_required?: number;
}

interface MCQ { question: string; options: string[]; }
type Phase = "watching" | "loading-quiz" | "quiz" | "result";

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

let ytApiPromise: Promise<any> | null = null;
function loadYouTubeAPI(): Promise<any> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if ((window as any).YT?.Player) return resolve((window as any).YT);
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    (window as any).onYouTubeIframeAPIReady = () => resolve((window as any).YT);
  });
  return ytApiPromise;
}

const MandatoryLectureGate = ({ lecture, onPassed }: { lecture: Lecture; onPassed: () => void }) => {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("watching");
  const [strikes, setStrikes] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const [ytReady, setYtReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [maxWatched, setMaxWatched] = useState(0);
  const [videoDuration, setVideoDuration] = useState(lecture.duration_seconds || 0);

  const requiredPct = Math.max(1, Math.min(100, lecture.watch_percentage_required ?? 80));
  const quizMandatory = lecture.is_quiz_mandatory !== false;
  const ytId = lecture.video_type === "youtube" ? extractYouTubeId(lecture.video_url) : null;

  useEffect(() => {
    if (phase !== "quiz") return;
    let strikeCount = 0;
    const onHide = () => {
      if (document.hidden) {
        strikeCount++;
        setStrikes(strikeCount);
        setWarning(`Don't switch tabs! Strike ${strikeCount}/3. ${strikeCount >= 3 ? "Quiz reset." : ""}`);
        if (strikeCount >= 3) {
          setAnswers([]); setStrikes(0); strikeCount = 0;
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

  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", prevent);
    return () => document.removeEventListener("contextmenu", prevent);
  }, []);

  useEffect(() => {
    if (phase !== "watching" || !ytId || !ytContainerRef.current) return;
    let mounted = true;
    let poll: any;
    loadYouTubeAPI().then((YT) => {
      if (!mounted || !ytContainerRef.current) return;
      ytPlayerRef.current = new YT.Player(ytContainerRef.current, {
        videoId: ytId,
        playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, fs: 0, playsinline: 1, iv_load_policy: 3 },
        events: {
          onReady: () => {
            setYtReady(true);
            const d = ytPlayerRef.current?.getDuration?.() || 0;
            if (d > 0) setVideoDuration(d);
          },
          onStateChange: (e: any) => setPlaying(e.data === 1),
        },
      });
      poll = setInterval(() => {
        const p = ytPlayerRef.current;
        if (!p?.getCurrentTime) return;
        const t = p.getCurrentTime() || 0;
        setCurrentTime(t);
        setMaxWatched((m) => {
          if (t > m + 1.5) { p.seekTo(m, true); return m; }
          return Math.max(m, t);
        });
      }, 500);
    });
    return () => {
      mounted = false;
      if (poll) clearInterval(poll);
      try { ytPlayerRef.current?.destroy?.(); } catch { /* ignore */ }
      ytPlayerRef.current = null;
    };
  }, [phase, ytId]);

  useEffect(() => {
    if (phase !== "watching" || ytId) return;
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => { if (isFinite(v.duration)) setVideoDuration(v.duration); };
    const onTime = () => {
      setCurrentTime(v.currentTime);
      setMaxWatched((m) => Math.max(m, v.currentTime));
    };
    const onSeeking = () => {
      if (v.currentTime > maxWatched + 1.5) v.currentTime = maxWatched;
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("seeking", onSeeking);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("seeking", onSeeking);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [phase, ytId, maxWatched]);

  const watchedPct = videoDuration > 0 ? Math.min(100, Math.round((maxWatched / videoDuration) * 100)) : 0;
  const canProceed = watchedPct >= requiredPct;

  const togglePlay = () => {
    if (ytId) {
      const p = ytPlayerRef.current; if (!p) return;
      if (playing) p.pauseVideo(); else p.playVideo();
    } else {
      const v = videoRef.current; if (!v) return;
      if (v.paused) v.play(); else v.pause();
    }
  };

  const markLectureCompleted = async () => {
    if (!user) return false;
    const { error } = await (supabase as any).from("lecture_completions").upsert({
      user_id: user.id,
      lecture_id: lecture.id,
      passed: true,
      score: 0,
      total_questions: 0,
      completed_at: new Date().toISOString(),
    }, { onConflict: "user_id,lecture_id" });
    if (error) { toast.error("Failed to record completion: " + error.message); return false; }
    return true;
  };

  const startQuiz = useCallback(async () => {
    if (!quizMandatory) {
      const ok = await markLectureCompleted();
      if (ok) onPassed();
      return;
    }
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
  }, [lecture, quizMandatory, user, onPassed]);

  const submitQuiz = async () => {
    if (!user || !sessionId) return;
    if (answers.some((a) => a < 0)) { toast.error("Answer all questions"); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-lecture-quiz", {
        body: { session_id: sessionId, answers },
      });
      if (error || data?.error) { toast.error(data?.error || "Failed to submit quiz."); return; }
      setScore(data.score);
      setTotal(data.total);
      setPhase("result");
    } finally { setSubmitting(false); }
  };

  const retake = () => {
    setAnswers([]); setQuestions([]); setScore(0); setTotal(0); setSessionId(null); setWarning(null);
    setMaxWatched(0); setCurrentTime(0);
    setPhase("watching");
  };

  const passed = phase === "result" && score >= lecture.pass_threshold;
  const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 sm:p-8">
        <div className="w-full max-w-3xl bg-card border border-border rounded-xl shadow-2xl">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <Lock className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold text-foreground">Mandatory Lecture: {lecture.title}</h2>
              <p className="text-xs text-muted-foreground">
                {quizMandatory
                  ? "You must watch the video and pass the quiz to access the LMS."
                  : "You must watch the video to access the LMS."}
              </p>
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
                <div className="aspect-video w-full bg-black rounded-lg overflow-hidden relative">
                  {ytId ? (
                    <div className="w-full h-full pointer-events-none">
                      <div ref={ytContainerRef} className="w-full h-full" />
                    </div>
                  ) : (
                    <video
                      ref={videoRef}
                      src={lecture.video_url}
                      onContextMenu={(e) => e.preventDefault()}
                      disablePictureInPicture
                      className="w-full h-full pointer-events-none"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button type="button" onClick={togglePlay} size="sm" variant="secondary" className="gap-1" disabled={!!ytId && !ytReady}>
                      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {playing ? "Pause" : "Play"}
                    </Button>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {fmt(currentTime)}{videoDuration > 0 && <> / {fmt(videoDuration)}</>}
                    </div>
                    <div className="ml-auto text-xs font-medium text-foreground">
                      Watched {watchedPct}% <span className="text-muted-foreground">(need {requiredPct}%)</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden select-none">
                    <div className="h-full bg-primary transition-all" style={{ width: `${watchedPct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">Seeking is disabled. This bar only shows how much you have watched.</p>
                </div>

                <Button onClick={startQuiz} disabled={!canProceed} className="w-full gap-2" size="lg">
                  <Play className="h-4 w-4" /> {quizMandatory ? "Start Quiz" : "Mark Completed & Continue"}
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