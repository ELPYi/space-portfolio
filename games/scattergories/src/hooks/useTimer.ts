import { useState, useEffect, useRef } from 'react';

export function useTimer(timerEndsAt: number | null) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!timerEndsAt) {
      setSecondsLeft(null);
      return;
    }

    const update = () => {
      const remaining = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

    update();
    intervalRef.current = window.setInterval(update, 250);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerEndsAt]);

  return secondsLeft;
}
