"use client";

import { useState } from "react";
import {
  Plus,
  Upload,
  Play,
  RotateCcw,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Layers,
  Clock,
  Sparkles,
} from "lucide-react";
import type { AppActions } from "./app";
import { Button, Progress, SectionTitle } from "./ui";
import { RichText } from "./rich-text";
import { api } from "../lib/client";
import { dayIndex, manilaDate } from "../lib/types";
import { samples } from "../lib/samples";

export default function Dashboard({ a }: { a: AppActions }) {
  const d = a.data,
    stats = d.stats;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [revealed, setRevealed] = useState(false);
  const decks = d.decks.filter((deck) => !deck.archived);
  const activeIds = new Set(decks.map((deck) => deck.id));
  const cards = d.cards.filter((card) => activeIds.has(card.deckId));
  const fresh = cards.filter((card) => !card.review?.reviews);
  const due = cards
    .filter((card) => card.review?.reviews && card.review.due <= Date.now())
    .sort((a, b) => a.review!.due - b.review!.due);
  const preview = due[0] || fresh[0] || cards[0];
  const previewDeck = decks.find((deck) => deck.id === preview?.deckId);
  const subject = d.subjects.find(
    (subject) => subject.id === previewDeck?.subjectId,
  );
  const prompt = preview?.front || "What does “pag-asa” mean?";
  const answer = preview
    ? preview.type === "cloze"
      ? [...prompt.matchAll(/\[([^\]]+)\]/g)]
          .map((match) => match[1])
          .join(" · ")
      : preview.answer.join(" · ")
    : "Hope";
  const today = dayIndex();
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = today - 6 + i;
    return {
      day,
      answers:
        d.activity.find((activity) => activity.day === day)?.answers || 0,
    };
  });
  const weekTotal = week.reduce((sum, day) => sum + day.answers, 0);
  const max = Math.max(d.settings.dailyGoal, ...week.map((day) => day.answers));
  const recent = [...decks]
    .sort((a, b) => (b.lastStudied || b.created) - (a.lastStudied || a.created))
    .slice(0, 4);
  const exam = d.exams.find((exam) => exam.date >= manilaDate());
  const dateLabel = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(Date.now());
  const start = async (deckId?: string) => {
    setBusy(true);
    setError("");
    try {
      const selected = deckId
        ? cards.filter((card) => card.deckId === deckId)
        : cards;
      const hasDueOrNew = selected.some(
        (card) => !card.review?.reviews || card.review.due <= Date.now(),
      );
      const session = await api("start", {
        id: crypto.randomUUID(),
        mode: "memorise",
        filter: hasDueOrNew ? "due" : "all",
        deckIds: deckId ? [deckId] : [],
        count: Math.min(200, d.settings.dailyGoal),
      });
      a.go(`session/${session.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const addSample = async (index: number) => {
    setBusy(true);
    try {
      const result = await api("sample", { index });
      await a.reload();
      a.go(`deck/${result.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="study-desk">
      <div className="desk-heading">
        <div>
          <p className="desk-date">{dateLabel}</p>
          <h1>Your study desk</h1>
        </div>
        <div className="heading-actions">
          <Button variant="secondary" onClick={() => a.importDeck()}>
            <Upload size={17} />
            Import notes
          </Button>
          <Button onClick={a.createDeck}>
            <Plus size={18} />
            Create deck
          </Button>
        </div>
      </div>
      <section className="desk-stage" aria-label="Start a study session">
        <div className="desk-start">
          <h2>
            {cards.length
              ? "Keep what\nyou know."
              : "Start with one\ngood question."}
          </h2>
          <p>
            {due.length
              ? `${due.length} cards are due for review. Recalling them now helps the answers stay with you.`
              : fresh.length
                ? `${fresh.length} new cards are ready when you are. Start a session and see what you remember.`
                : cards.length
                  ? "Your scheduled reviews are up to date. Practice a deck or add something new to learn."
                  : "Turn your class notes into a deck, then test yourself one question at a time."}
          </p>
          <Button
            busy={busy}
            className="desk-start-button"
            onClick={() => (cards.length ? start() : a.createDeck())}
          >
            {cards.length ? (
              <Play size={16} fill="currentColor" />
            ) : (
              <Plus size={18} />
            )}{" "}
            {cards.length
              ? due.length
                ? "Review due cards"
                : "Start studying"
              : "Create your first deck"}
          </Button>
          <div className="session-details">
            <Clock size={14} />
            <span>
              {cards.length
                ? `Up to ${Math.min(d.settings.dailyGoal, 200, cards.length)} cards per session`
                : "Save your progress as you go"}
            </span>
          </div>
        </div>
        <div className="index-card-stack">
          <span className="card-backing back-two" />
          <span className="card-backing back-one" />
          <article
            className={`desk-card ${revealed ? "is-revealed" : ""}`}
            style={
              {
                "--subject-ink": subject?.color || "#406d91",
              } as React.CSSProperties
            }
          >
            <header>
              <span>
                <i />
                {subject?.name || "Filipino"}
              </span>
              <span className="card-origin">
                {preview ? "From your library" : "Sample card"}
              </span>
            </header>
            <button
              className="card-turn"
              aria-label={
                revealed
                  ? "Show question"
                  : preview
                    ? "Reveal answer"
                    : "Reveal sample answer"
              }
              aria-pressed={revealed}
              onClick={() => setRevealed(!revealed)}
            >
              <span className="card-side-label">
                {revealed ? "Answer" : "Question"}
              </span>
              <div className="desk-card-prompt">
                <RichText
                  text={
                    revealed
                      ? answer
                      : preview?.type === "cloze"
                        ? prompt.replace(/\[[^\]]+\]/g, "________")
                        : prompt
                  }
                />
              </div>
              <span className="card-turn-hint">
                <RotateCcw size={14} />
                {revealed ? "Show question" : "Reveal answer"}
              </span>
            </button>
            <footer>
              <span>{previewDeck?.title || "Filipino vocabulary"}</span>
              <button
                disabled={busy}
                onClick={() => (preview ? start(preview.deckId) : addSample(0))}
              >
                {preview ? "Study this deck" : "Add sample deck"}
                <ArrowUpRight size={16} />
              </button>
            </footer>
          </article>
        </div>
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="learning-totals" aria-label="Learning overview">
        {[
          [Layers, "Due for review", stats.due, "coral"],
          [BookOpen, "In progress", stats.learning, "blue"],
          [Check, "Mastered", stats.mastered, "teal"],
          [Sparkles, "Total XP", stats.xp.toLocaleString(), "amber"],
        ].map(([Icon, label, value, tone]: any) => (
          <div key={label} className={`total-${tone}`}>
            <span className="total-label">
              <Icon size={16} />
              {label}
            </span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>
      <div className="desk-columns">
        <div className="desk-library">
          <SectionTitle
            title="Back to your decks"
            subtitle={
              recent.length
                ? "Your most recent study material."
                : "Create a deck to organize what you’re learning."
            }
          >
            <a className="text-link" href="#library">
              Open library
              <ArrowUpRight size={15} />
            </a>
          </SectionTitle>
          {recent.length ? (
            <div className="desk-deck-list">
              {recent.map((deck) => (
                <a
                  key={deck.id}
                  href={`#deck/${deck.id}`}
                  className="desk-deck-row"
                  style={{ "--deck-color": deck.color } as React.CSSProperties}
                >
                  <span className="deck-spine">
                    <BookOpen size={20} />
                  </span>
                  <div className="desk-deck-name">
                    <small>
                      {
                        d.subjects.find(
                          (subject) => subject.id === deck.subjectId,
                        )?.name
                      }
                      {deck.sample ? " · Sample" : ""}
                    </small>
                    <h3>{deck.title}</h3>
                    <span>{deck.count} cards</span>
                  </div>
                  <div className="row-mastery">
                    <span>{deck.mastery}% mastery</span>
                    <Progress value={deck.mastery} />
                  </div>
                  <span className={`row-due ${deck.due ? "has-due" : ""}`}>
                    {deck.due ? `${deck.due} due` : "Up to date"}
                  </span>
                  <ChevronRight size={17} />
                </a>
              ))}
            </div>
          ) : (
            <div className="desk-empty-library">
              <div className="empty-index-card">
                <span />
                <span />
                <span />
              </div>
              <h3>A place for your subjects.</h3>
              <p>
                Keep your questions, sources, and review history together in a
                deck.
              </p>
              <Button variant="secondary" onClick={a.createDeck}>
                <Plus size={16} />
                Create deck
              </Button>
            </div>
          )}
          <section className="desk-starters">
            <SectionTitle
              title="Try a starter deck"
              subtitle="Optional examples you can edit or remove."
            />
            <div className="starter-shelf">
              {samples.slice(0, 3).map((sample, index) => (
                <button
                  key={sample.name}
                  disabled={busy}
                  style={
                    { "--deck-color": sample.color } as React.CSSProperties
                  }
                  onClick={() => addSample(index)}
                >
                  <span className="starter-tab" />
                  <span>
                    <strong>{sample.name}</strong>
                    <small>{sample.cards.length} cards</small>
                  </span>
                  <Plus size={17} />
                </button>
              ))}
            </div>
          </section>
        </div>
        <aside className="desk-aside">
          <section className="desk-goal">
            <div className="goal-heading">
              <h2>Today’s target</h2>
              <a href="#settings" aria-label="Adjust daily target">
                <TargetIcon />
              </a>
            </div>
            <p className="goal-count">
              <strong>{stats.today}</strong>
              <span> / {d.settings.dailyGoal} cards</span>
              {stats.today >= d.settings.dailyGoal && <Check size={18} />}
            </p>
            <Progress value={(stats.today / d.settings.dailyGoal) * 100} />
            <p className="goal-description">
              {stats.today >= d.settings.dailyGoal
                ? "Daily target complete."
                : "A steady pace beats a last-minute rush."}
            </p>
            <div className="level-line">
              <span>Level {stats.level.level}</span>
              <strong>{stats.xp.toLocaleString()} XP</strong>
            </div>
            <Progress
              className="level-progress"
              value={(stats.level.inLevel / stats.level.needed) * 100}
            />
            <small>
              {stats.level.needed - stats.level.inLevel} XP to the next level
            </small>
          </section>
          <section className="desk-activity">
            <div className="goal-heading">
              <h2>This week</h2>
              <span>{weekTotal} reviews</span>
            </div>
            <div
              className="week-chart"
              role="img"
              aria-label={`${weekTotal} reviews in the last seven days`}
            >
              {week.map(({ day, answers }, i) => (
                <div
                  key={day}
                  className={i === 6 ? "current" : ""}
                  title={`${answers} reviews`}
                >
                  <div className="week-bar-space">
                    <span
                      style={{
                        height: `${Math.max(3, (answers / max) * 100)}%`,
                      }}
                    />
                  </div>
                  <small>
                    {new Intl.DateTimeFormat("en", {
                      weekday: "narrow",
                      timeZone: "UTC",
                    }).format(day * 86400000)}
                  </small>
                </div>
              ))}
            </div>
          </section>
          <section className="desk-exam">
            <div className="goal-heading">
              <h2>Next exam</h2>
              <CalendarDays size={16} />
            </div>
            {exam ? (
              <>
                <h3>{exam.name}</h3>
                <p>
                  {new Intl.DateTimeFormat("en", {
                    month: "long",
                    day: "numeric",
                    timeZone: "Asia/Manila",
                  }).format(Date.parse(exam.date + "T12:00:00+08:00"))}
                </p>
                <a className="text-link" href="#exams">
                  Open study plan
                  <ArrowUpRight size={15} />
                </a>
              </>
            ) : (
              <>
                <p>Add an exam date to give your review sessions a deadline.</p>
                <a className="text-link" href="#exams">
                  <Plus size={14} />
                  Add an exam
                </a>
              </>
            )}
          </section>
        </aside>
      </div>
      {!d.settings.onboarded && (
        <div className="desk-first-run">
          <BookOpen size={17} />
          <span>
            Your library is private. Add your own notes or choose a sample to
            get started.
          </span>
          <button
            onClick={async () => {
              try {
                await api("settings", {
                  data: { ...d.settings, onboarded: true },
                  version: d.settingsVersion,
                });
                await a.reload();
              } catch (e: any) {
                a.toast(e.message);
              }
            }}
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
function TargetIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="m16 8 4-4M18 4h2v2" />
    </svg>
  );
}
