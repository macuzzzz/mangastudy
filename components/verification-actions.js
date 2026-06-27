"use client";

import { useState, useTransition } from "react";

export function VerificationActions({ lessonId, targetType, targetId, initialStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();

  function updateStatus(nextStatus) {
    startTransition(async () => {
      const response = await fetch(`/api/lessons/${lessonId}/verification`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          targetType,
          targetId,
          status: nextStatus
        })
      });

      if (response.ok) {
        setStatus(nextStatus);
      }
    });
  }

  return (
    <div className="verification-actions">
      <span className={`badge badge--${status.toLowerCase()}`}>{status}</span>
      <button
        type="button"
        className="mini-button"
        disabled={isPending}
        onClick={() => updateStatus("PASS")}
      >
        Approve
      </button>
      <button
        type="button"
        className="mini-button"
        disabled={isPending}
        onClick={() => updateStatus("NEEDS_REVIEW")}
      >
        Mark Needs Review
      </button>
    </div>
  );
}
