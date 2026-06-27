"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function GenerationProgressClient({ lessonId, initialStatus, initialProgress }) {
  const [status, setStatus] = useState(initialStatus);
  const [progressEvents, setProgressEvents] = useState(initialProgress);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const startedRef = useRef(false);

  useEffect(() => {
    if (status === "READY" || status === "NEEDS_REVIEW" || startedRef.current) {
      return;
    }

    startedRef.current = true;
    fetch(`/api/lessons/${lessonId}/generate`, { method: "POST" }).catch((error) => {
      setErrorMessage(error.message || "Failed to start generation.");
    });
  }, [lessonId, status]);

  useEffect(() => {
    if (status === "READY" || status === "NEEDS_REVIEW") {
      const timer = window.setTimeout(() => {
        router.push(`/lessons/${lessonId}/reader`);
      }, 900);

      return () => window.clearTimeout(timer);
    }

    if (status === "ERROR") {
      return undefined;
    }

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/lessons/${lessonId}/status`, { cache: "no-store" });
      const data = await response.json();
      setStatus(data.status);
      setProgressEvents(data.progressEvents);
      setErrorMessage(data.generationError || "");
    }, 1200);

    return () => window.clearInterval(interval);
  }, [lessonId, router, status]);

  const activeIndex = useMemo(
    () =>
      progressEvents.findIndex((item) => item.status === "RUNNING") >= 0
        ? progressEvents.findIndex((item) => item.status === "RUNNING")
        : progressEvents.findIndex((item) => item.status === "PENDING"),
    [progressEvents]
  );

  return (
    <div className="progress-layout">
      <div className="progress-card">
        <p className="eyebrow">Generation Progress</p>
        <h2>{status === "READY" || status === "NEEDS_REVIEW" ? "Lesson ready" : "Building your lesson"}</h2>
        <p className="product-description">
          {status === "READY" || status === "NEEDS_REVIEW"
            ? "Redirecting you into the comic reader now."
            : "The mock pipeline is chunking the source, extracting facts, writing panels, and building quizzes."}
        </p>
        {errorMessage ? <div className="status-banner status-banner--error">{errorMessage}</div> : null}
        <ol className="progress-list">
          {progressEvents.map((item, index) => (
            <li
              key={item.id}
              className={`progress-item progress-item--${item.status.toLowerCase()} ${
                index === activeIndex ? "progress-item--active" : ""
              }`}
            >
              <span className="progress-item__dot" />
              <div>
                <h3>{item.label}</h3>
                <p>{item.message || "Waiting..."}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
