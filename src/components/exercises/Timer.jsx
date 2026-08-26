import { useEffect, useMemo, useRef, useState } from "react";
import { ClockIcon } from "@heroicons/react/24/solid";

export function resolveTimerSeconds(timer, difficulty, level = null) {
  if (!timer || timer.enabled === false) {
    return 0;
  }

  if (typeof timer.seconds === "number") {
    return timer.seconds;
  }

  const byDifficulty = timer.seconds ?? timer.secondsByDifficulty;
  const variantTiming = byDifficulty?.[difficulty];

  if (typeof variantTiming === "number") {
    return variantTiming;
  }

  if (variantTiming && typeof variantTiming === "object") {
    return variantTiming[level] ?? variantTiming.default ?? byDifficulty?.default ?? 0;
  }

  return byDifficulty?.[`${difficulty}:${level}`]
    ?? byDifficulty?.[level]
    ?? byDifficulty?.default
    ?? 0;
}

export default function Timer({ timer, difficulty, level, resetKey, paused, onExpire, labels }) {
  const seconds = resolveTimerSeconds(timer, difficulty, level);
  const [remainingMs, setRemainingMs] = useState(seconds * 1000);
  const remainingRef = useRef(seconds * 1000);
  const onExpireRef = useRef(onExpire);
  const expiredRef = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const nextDuration = seconds * 1000;
    remainingRef.current = nextDuration;
    setRemainingMs(nextDuration);
    expiredRef.current = false;
  }, [resetKey, seconds]);

  useEffect(() => {
    if (!seconds || paused || expiredRef.current) {
      return undefined;
    }

    const startedAt = Date.now();
    const initial = remainingRef.current;
    const interval = window.setInterval(() => {
      const next = Math.max(0, initial - (Date.now() - startedAt));
      remainingRef.current = next;
      setRemainingMs(next);

      if (next === 0 && !expiredRef.current) {
        expiredRef.current = true;
        window.clearInterval(interval);
        onExpireRef.current?.();
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [paused, resetKey, seconds]);

  const display = useMemo(() => {
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const rest = totalSeconds % 60;
    return minutes > 0 ? `${minutes}:${String(rest).padStart(2, "0")}` : `${rest}`;
  }, [remainingMs]);

  if (!seconds || timer.show === false) {
    return null;
  }

  const ratio = Math.max(0, Math.min(1, remainingMs / (seconds * 1000)));
  const expired = remainingMs === 0;
  const urgentThresholdMs = Math.min(5000, seconds * 1000 * 0.35);
  const urgent = remainingMs > 0 && remainingMs <= urgentThresholdMs;
  const timerClassName = [
    "exercise-timer",
    urgent ? "exercise-timer-urgent" : "",
    expired ? "exercise-timer-expired" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={timerClassName}
      role="timer"
      aria-live={expired ? "assertive" : "off"}
    >
      <div className="exercise-timer-head">
        <span className="exercise-timer-label">
          <span className="exercise-timer-icon" aria-hidden="true"><ClockIcon /></span>
          {expired ? labels.timeExpired : labels.timeRemaining}
        </span>
        <strong>{expired ? labels.timeExpiredShort : `${display}${minutesSuffix(display, labels.seconds)}`}</strong>
      </div>
      <div className="exercise-timer-track" aria-hidden="true">
        <span style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

function minutesSuffix(display, secondsLabel) {
  return display.includes(":") ? "" : ` ${secondsLabel}`;
}
