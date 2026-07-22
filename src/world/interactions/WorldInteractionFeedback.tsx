import { useEffect, useRef, useState } from "react";
import "./WorldInteractionFeedback.css";

type FeedbackDetail = { message?: string };

export default function WorldInteractionFeedback() {
  const [message, setMessage] = useState("");
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleFeedback = (event: Event) => {
      const detail = (event as CustomEvent<FeedbackDetail>).detail;
      if (!detail?.message) return;
      setMessage(detail.message);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setMessage(""), 1800);
    };

    window.addEventListener("worlds:interaction-feedback", handleFeedback);
    return () => {
      window.removeEventListener("worlds:interaction-feedback", handleFeedback);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="world-interaction-feedback" data-visible={Boolean(message)} role="status" aria-live="polite">
      {message}
    </div>
  );
}
