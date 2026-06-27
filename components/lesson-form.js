"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createLessonAction } from "@/app/actions/lesson-actions";

const initialState = {
  ok: true,
  errors: {},
  values: {
    title: "",
    subject: "",
    gradeLevel: "",
    pastedText: ""
  }
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="button button--primary" type="submit" disabled={pending}>
      {pending ? "Generating..." : "Generate Lesson"}
    </button>
  );
}

export function LessonForm() {
  const [state, formAction] = useActionState(createLessonAction, initialState);
  const values = state?.values || initialState.values;
  const errors = state?.errors || {};

  return (
    <form action={formAction} className="manga-form">
      <div className="form-grid">
        <label className="field">
          <span>Chapter title</span>
          <input name="title" defaultValue={values.title} placeholder="Industrial Revolution - Chapter 2" />
          {errors.title ? <small className="field-error">{errors.title}</small> : null}
        </label>
        <label className="field">
          <span>Subject</span>
          <input name="subject" defaultValue={values.subject} placeholder="History" />
          {errors.subject ? <small className="field-error">{errors.subject}</small> : null}
        </label>
        <label className="field">
          <span>Grade level</span>
          <input name="gradeLevel" defaultValue={values.gradeLevel} placeholder="Grade 8" />
          {errors.gradeLevel ? <small className="field-error">{errors.gradeLevel}</small> : null}
        </label>
        <label className="field">
          <span>Optional PDF upload</span>
          <input type="file" name="pdf" accept=".pdf,application/pdf" />
          {errors.pdf ? <small className="field-error">{errors.pdf}</small> : null}
        </label>
      </div>

      <label className="field field--full">
        <span>Pasted textbook content</span>
        <textarea
          name="pastedText"
          rows={12}
          defaultValue={values.pastedText}
          placeholder="Paste a textbook chapter here..."
        />
        {errors.sourceText ? <small className="field-error">{errors.sourceText}</small> : null}
      </label>

      <div className="form-footer">
        <p className="form-note">
          This MVP creates source-grounded facts, panel scripts, quiz cards, and prompt exports.
          It does not generate final comic artwork.
        </p>
        <SubmitButton />
      </div>
    </form>
  );
}
