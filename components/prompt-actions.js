"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button type="button" className="mini-button" onClick={handleCopy}>
      {copied ? "Copied" : label}
    </button>
  );
}

export function PromptExportActions({ lessonId, allPrompts }) {
  const [copied, setCopied] = useState(false);

  async function handleCopyAll() {
    await navigator.clipboard.writeText(allPrompts);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="prompt-export-actions">
      <button type="button" className="button button--ghost" onClick={handleCopyAll}>
        {copied ? "Copied All Prompts" : "Copy All Prompts"}
      </button>
      <a className="button button--ghost" href={`/api/lessons/${lessonId}/prompts?format=json`}>
        Export JSON
      </a>
      <a className="button button--ghost" href={`/api/lessons/${lessonId}/prompts?format=md`}>
        Export Markdown
      </a>
    </div>
  );
}
