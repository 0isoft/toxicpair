// src/hooks/useSessionTimer.ts
import { useEffect, useRef, useState } from "react";
import { useApi } from "../lib/api";

type SessionStatus = "active" | "expired" | "completed" | null;

type PollResp = {
  sessionId: string;
  attemptId: number | null;
  status?: "active" | "expired" | "completed";
  deadlineAt: string | null;
  remainingSeconds: number | null;
  editorMode: "CODE" | "VIBECODE";
};

type TimerState = {
  editorMode: "CODE" | "VIBECODE";
  remainingSeconds: number | null;  // null => no timer (completed/untimed)
  status: SessionStatus;
  deadlineAt: Date | null;
};

export function useSessionTimer(sessionId?: string) {
  const api = useApi();
  const apiRef = useRef(api);
  useEffect(() => { apiRef.current = api; }, [api]); // keep latest without retriggering

  const [state, setState] = useState<TimerState>({
    editorMode: "CODE",
    remainingSeconds: null,
    status: null,
    deadlineAt: null,
  });

  // local absolute deadline we count down against
  const absDeadlineMsRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const tickIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // cleanup any prior timers
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
    if (tickIntervalRef.current) { clearInterval(tickIntervalRef.current); tickIntervalRef.current = null; }
    absDeadlineMsRef.current = null;

    // no session => neutral state
    if (!sessionId) {
      setState({ editorMode: "CODE", remainingSeconds: null, status: null, deadlineAt: null });
      return;
    }

    const applyServer = (r: PollResp) => {
      const status: SessionStatus = r.status ?? null;
      const deadlineAt = r.deadlineAt ? new Date(r.deadlineAt) : null;

      // Completed or no deadline => stop local clock
      if (status === "completed" || r.remainingSeconds == null || !deadlineAt) {
        absDeadlineMsRef.current = null;
        setState({
          editorMode: r.editorMode ?? "CODE",
          remainingSeconds: null,
          status,
          deadlineAt: null,
        });
        return;
      }

      // Set/reset absolute deadline and snap remaining from it
      absDeadlineMsRef.current = deadlineAt.getTime();
      setState({
        editorMode: r.editorMode ?? "CODE",
        remainingSeconds: Math.max(0, Math.ceil((absDeadlineMsRef.current - Date.now()) / 1000)),
        status,
        deadlineAt,
      });
    };

    const poll = async () => {
      try {
        const r = await apiRef.current<PollResp>(`/sessions/${sessionId}`);
        applyServer(r);
      } catch {
        /* ignore; next poll will retry */
      }
    };

    // server resync (2s feels snappy and cheap)
    poll();
    pollIntervalRef.current = window.setInterval(poll, 2000);

    // smooth local ticking (200ms) from absolute deadline
    tickIntervalRef.current = window.setInterval(() => {
      const end = absDeadlineMsRef.current;
      if (end == null) return;
      const secLeft = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setState(s => (s.remainingSeconds === secLeft ? s : { ...s, remainingSeconds: secLeft }));
    }, 200);

    // also catch up immediately on tab focus
    const onFocus = () => poll();
    window.addEventListener("focus", onFocus);

    return () => {
      if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
      if (tickIntervalRef.current) { clearInterval(tickIntervalRef.current); tickIntervalRef.current = null; }
      absDeadlineMsRef.current = null;
      window.removeEventListener("focus", onFocus);
    };
  }, [sessionId]); // <-- ONLY depends on sessionId

  return state;
}
