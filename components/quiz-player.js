"use client";

import { useMemo, useState } from "react";

function normalizeAnswer(value) {
  return value.trim().toLowerCase();
}

export function QuizPlayer({ quizCards }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState({});

  const currentCard = quizCards[currentIndex];
  const selectedValue = answers[currentCard.id] || "";

  const score = useMemo(
    () => Object.values(results).filter((result) => result.correct).length,
    [results]
  );

  function submitAnswer() {
    const userAnswer = selectedValue;
    const correct =
      currentCard.quizType === "SHORT_ANSWER"
        ? normalizeAnswer(userAnswer).length > 0
        : normalizeAnswer(userAnswer) === normalizeAnswer(currentCard.correctAnswer);

    setResults((previous) => ({
      ...previous,
      [currentCard.id]: {
        correct,
        answer: userAnswer
      }
    }));
  }

  function nextQuestion() {
    if (currentIndex < quizCards.length - 1) {
      setCurrentIndex((value) => value + 1);
    }
  }

  return (
    <div className="quiz-layout">
      <div className="status-banner">
        <strong>
          Score: {score}/{quizCards.length}
        </strong>
        <span>{Object.keys(results).length} answered</span>
      </div>

      <article className="quiz-card">
        <p className="character-panel__tag">
          {currentCard.quizType.replaceAll("_", " ")} // {currentCard.difficulty}
        </p>
        <h2>{currentCard.question}</h2>
        <p className="quiz-card__facts">Facts: {currentCard.factIds.join(", ")}</p>

        {currentCard.options ? (
          <div className="quiz-options">
            {currentCard.options.map((option) => (
              <label key={option} className="quiz-option">
                <input
                  type="radio"
                  name={`quiz-${currentCard.id}`}
                  value={option}
                  checked={selectedValue === option}
                  onChange={(event) =>
                    setAnswers((previous) => ({
                      ...previous,
                      [currentCard.id]: event.target.value
                    }))
                  }
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        ) : (
          <textarea
            rows={5}
            className="quiz-input"
            value={selectedValue}
            onChange={(event) =>
              setAnswers((previous) => ({
                ...previous,
                [currentCard.id]: event.target.value
              }))
            }
            placeholder="Write your short answer here..."
          />
        )}

        <div className="quiz-actions">
          <button type="button" className="button button--primary" onClick={submitAnswer}>
            Check Answer
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={nextQuestion}
            disabled={currentIndex === quizCards.length - 1}
          >
            Next Question
          </button>
        </div>

        {results[currentCard.id] ? (
          <div
            className={`status-banner ${
              results[currentCard.id].correct ? "status-banner--success" : "status-banner--warning"
            }`}
          >
            <strong>{results[currentCard.id].correct ? "Correct" : "Needs review"}</strong>
            <span>Answer: {currentCard.correctAnswer}</span>
            <p>{currentCard.explanation}</p>
          </div>
        ) : null}
      </article>

      <div className="quiz-summary">
        <h3>Progress</h3>
        <ul>
          {quizCards.map((card, index) => (
            <li key={card.id} className={index === currentIndex ? "is-current" : ""}>
              <button type="button" onClick={() => setCurrentIndex(index)}>
                Question {index + 1} {results[card.id] ? "• done" : ""}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
