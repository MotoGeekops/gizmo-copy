"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Play,
  Layers,
  Brain,
  Timer,
  Target,
  SlidersHorizontal,
  BookOpen,
  Clock,
  Pause,
  Check,
  X,
  RotateCcw,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Shuffle,
  Flag,
  Trophy,
  Sparkles,
  Loader2,
  Keyboard,
} from "lucide-react";
import {
  Button,
  IconButton,
  Field,
  Empty,
  Progress,
  SectionTitle,
  Ring,
} from "./ui";
import { RichText } from "./rich-text";
import type { AppActions } from "./app";
import { api, request } from "../lib/client";
import { browserEngine } from "../lib/browser-engine";
import { type Session, type Card, cardTypes, uid } from "../lib/types";
const modes = [
  {
    id: "memorise",
    name: "Memorise",
    tag: "YOUR EVERYDAY GO-TO",
    text: "Make a connection. Recall it. Make it last.",
    icon: Brain,
    color: "violet",
  },
  {
    id: "classic",
    name: "Classic flashcards",
    tag: "ONE CARD AT A TIME",
    text: "Flip, reflect, and find your own rhythm.",
    icon: Layers,
    color: "green",
  },
  {
    id: "test",
    name: "Practice test",
    tag: "A LITTLE EXAM CONFIDENCE",
    text: "Put your knowledge together. See what sticks.",
    icon: BookOpen,
    color: "blue",
  },
  {
    id: "speed",
    name: "Speed round",
    tag: "QUICK THINKING",
    text: "A short, timed burst of active recall.",
    icon: Timer,
    color: "amber",
  },
  {
    id: "weakness",
    name: "Weakness review",
    tag: "TURN “NOT YET” INTO “I KNOW”",
    text: "Give the tricky things a little extra attention.",
    icon: Target,
    color: "pink",
  },
  {
    id: "custom",
    name: "Custom study",
    tag: "YOUR OWN MIX",
    text: "Choose your subjects, formats, and focus.",
    icon: SlidersHorizontal,
    color: "violet",
  },
];
export function StudyHome({ a }: { a: AppActions }) {
  const [mode, setMode] = useState("memorise"),
    [decks, setDecks] = useState<string[]>([]),
    [filter, setFilter] = useState("due"),
    [count, setCount] = useState(Math.min(200, a.data.settings.dailyGoal)),
    [minutes, setMinutes] = useState(0),
    [types, setTypes] = useState<string[]>([]),
    [difficulty, setDifficulty] = useState("all"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const active = a.data.sessions.filter((s) => !s.ended);
  const selectedMode = modes.find((m) => m.id === mode)!;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Study</h1>
          <p>Choose a mode, select your decks, and set up a session.</p>
        </div>
      </div>
      {active.length > 0 && (
        <div className="resume-banner">
          <span className="resume-icon">
            <Play size={19} />
          </span>
          <div>
            <h3>Continue your saved session</h3>
            <p>
              {active[0].cursor} of {active[0].total} cards ·{" "}
              {modes.find((m) => m.id === active[0].mode)?.name ||
                active[0].mode}
            </p>
          </div>
          <Button onClick={() => a.go(`session/${active[0].id}`)}>
            Resume session <ArrowRight size={16} />
          </Button>
        </div>
      )}
      <div className="study-home-layout">
        <div className="mode-grid">
          {modes.map((m) => (
            <button
              key={m.id}
              className={`mode-card ${mode === m.id ? "selected" : ""}`}
              onClick={() => {
                setMode(m.id);
                setFilter(
                  m.id === "weakness"
                    ? "weak"
                    : ["test", "speed", "classic"].includes(m.id)
                      ? "all"
                      : "due",
                );
                setMinutes(m.id === "speed" ? 1 : 0);
              }}
            >
              <div>
                <span className={`mode-icon ${m.color}`}>
                  <m.icon size={25} />
                </span>
                <span className="mode-radio">{mode === m.id && <span />}</span>
              </div>
              <small>{m.tag}</small>
              <h2>{m.name}</h2>
              <p>{m.text}</p>
            </button>
          ))}
        </div>
        <section className="panel session-builder">
          <div className="section-title">
            <h2>Session settings</h2>
            <selectedMode.icon size={20} />
          </div>
          <Field label="Choose your decks">
            <div className="deck-checklist">
              {a.data.decks
                .filter((d) => !d.archived && d.count > 0)
                .map((d) => (
                  <label key={d.id}>
                    <input
                      type="checkbox"
                      checked={decks.includes(d.id)}
                      onChange={() =>
                        setDecks(
                          decks.includes(d.id)
                            ? decks.filter((x) => x !== d.id)
                            : [...decks, d.id],
                        )
                      }
                    />
                    <span>{d.title}</span>
                    <small>{d.count}</small>
                  </label>
                ))}
              {!a.data.decks.some((d) => !d.archived && d.count > 0) && (
                <p>Add cards to a deck to get started.</p>
              )}
            </div>
            <small>
              {decks.length
                ? "Studying your selected decks."
                : "No selection includes all active decks."}
            </small>
          </Field>
          <Field label="What shall we focus on?">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="due">Due reviews + new cards</option>
              <option value="new">New cards</option>
              <option value="all">All cards</option>
              <option value="weak">Previously missed cards</option>
              {mode === "custom" && (
                <option value="cram">Cram · all cards, no retries</option>
              )}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Cards per session">
              <input
                type="number"
                min={1}
                max={200}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </Field>
            <Field label="Time limit">
              <select
                value={minutes}
                onChange={(e) => setMinutes(+e.target.value)}
              >
                {mode !== "speed" && <option value={0}>No timer</option>}
                <option value={1}>1 minute</option>
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </Field>
          </div>
          {["custom", "test"].includes(mode) && (
            <>
              <Field label="Difficulty">
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="all">All difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="normal">Standard</option>
                  <option value="hard">Challenging</option>
                </select>
              </Field>
              <Field label="Question formats">
                <div className="format-checks">
                  {Object.entries(cardTypes).map(([id, name]) => (
                    <label key={id}>
                      <input
                        type="checkbox"
                        checked={types.includes(id)}
                        onChange={() =>
                          setTypes(
                            types.includes(id)
                              ? types.filter((t) => t !== id)
                              : [...types, id],
                          )
                        }
                      />
                      {name}
                    </label>
                  ))}
                </div>
                <small>No selection includes every available format.</small>
              </Field>
            </>
          )}
          {mode === "test" && (
            <p className="info-note">
              Answers and explanations appear when you finish. Typed answers use
              exact matching and your configured alternatives.
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button
            busy={busy}
            className="full"
            disabled={!a.data.stats.total}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const s = await api("start", {
                  id: uid(),
                  mode: filter === "cram" ? "cram" : mode,
                  deckIds: decks,
                  filter: filter === "cram" ? "all" : filter,
                  count,
                  timeLimit: minutes * 60,
                  types,
                  difficulty,
                });
                await a.reload();
                a.go(`session/${s.id}`);
              } catch (e: any) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Start session <ArrowRight size={17} />
          </Button>
          <small className="builder-note">
            Your progress saves after every answer.
          </small>
        </section>
      </div>
    </>
  );
}
function shuffled<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}
export function StudySession({ a, id }: { a: AppActions; id: string }) {
  const [session, setSession] = useState<Session | null>(null),
    [card, setCard] = useState<Card | null>(null),
    [feedback, setFeedback] = useState<any>(null),
    [response, setResponse] = useState<string[]>([]),
    [revealed, setRevealed] = useState(false),
    [hint, setHint] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [remaining, setRemaining] = useState<number | null>(null),
    [browse, setBrowse] = useState(0),
    [order, setOrder] = useState<string[]>([]);
  const pending = useRef<any>(null),
    started = useRef(Date.now()),
    sref = useRef(session),
    finishing = useRef(false);
  sref.current = session;
  const load = async () => {
    try {
      const s = await request<Session>(
        `/api/app?session=${encodeURIComponent(id)}`,
      );
      setSession(s);
      setCard(s.card);
      setBrowse(s.cursor);
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  };
  useEffect(() => {
    load();
  }, [id]);
  useEffect(() => {
    setResponse([]);
    setRevealed(false);
    setHint(false);
    setFeedback(null);
    setOrder(card?.type === "ordering" ? shuffled(card.answer) : []);
    started.current = Date.now();
    pending.current = null;
  }, [card?.id]);
  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    setBusy(true);
    try {
      const s = await api<Session>("finish", { id });
      setSession(s);
      setCard(null);
      await a.reload();
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
      finishing.current = false;
    }
  };
  useEffect(() => {
    if (!session?.timeLimit || session.ended) return;
    const timer = setInterval(() => {
      const s = sref.current;
      if (!s || s.ended) return;
      const left = Math.max(
        0,
        Math.ceil((s.started + s.timeLimit * 1000 - Date.now()) / 1000),
      );
      setRemaining(left);
      if (left === 0) finish();
    }, 500);
    return () => clearInterval(timer);
  }, [session?.id, session?.timeLimit, session?.ended]);
  const submit = async (rating?: number, manual = false) => {
    if (!session || !card || busy || feedback) return;
    setBusy(true);
    setError("");
    try {
      const resp = card.type === "ordering" ? order : response;
      if (!manual)
        await browserEngine({ action: "evaluate", card, response: resp });
      const payload = pending.current || {
        id: uid(),
        sessionId: id,
        position: session.cursor,
        response: resp,
        rating,
        manual,
        seconds: Math.min(
          600,
          Math.round((Date.now() - started.current) / 1000),
        ),
      };
      pending.current = payload;
      const result = await api("answer", payload);
      setFeedback(result);
      setSession(result.session);
      if (a.data.settings.sound) {
        try {
          const ctx = new AudioContext();
          const o = ctx.createOscillator(),
            g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.value = result.correct ? 660 : 220;
          g.gain.value = 0.035;
          o.start();
          o.stop(ctx.currentTime + 0.1);
          o.onended = () => ctx.close();
        } catch {}
      }
      if (session.mode === "test") {
        setTimeout(() => advance(result), 150);
      } else if (a.data.settings.autoAdvance && result.correct)
        setTimeout(() => advance(result), 1600);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const advance = async (result = feedback) => {
    if (!result) return;
    if (result.session.cursor >= result.session.total) {
      await finish();
    } else {
      setCard(result.session.card);
      setBrowse(result.session.cursor);
      setFeedback(null);
      setResponse([]);
      setRevealed(false);
      setHint(false);
      setOrder(
        result.session.card?.type === "ordering"
          ? shuffled(result.session.card.answer)
          : [],
      );
      started.current = Date.now();
      pending.current = null;
    }
  };
  useEffect(() => {
    if (!a.data.settings.keyboard) return;
    const handler = (e: KeyboardEvent) => {
      const input = ["INPUT", "TEXTAREA", "SELECT"].includes(
        (e.target as HTMLElement).tagName,
      );
      if (e.key === "Enter" && !e.shiftKey) {
        if (feedback) {
          e.preventDefault();
          advance();
        } else if (
          !revealed &&
          session?.mode !== "classic" &&
          (response.some(Boolean) || card?.type === "ordering")
        ) {
          e.preventDefault();
          submit();
        }
      }
      if (input) return;
      if (e.code === "Space" && session?.mode === "classic") {
        e.preventDefault();
        setRevealed((v) => !v);
      }
      if (
        ["1", "2", "3", "4"].includes(e.key) &&
        revealed &&
        !feedback &&
        session?.mode !== "test"
      )
        submit(+e.key, true);
    };
    addEventListener("keydown", handler);
    return () => removeEventListener("keydown", handler);
  }, [
    session,
    card,
    feedback,
    revealed,
    response,
    order,
    busy,
    a.data.settings.keyboard,
  ]);
  const matchOptions = useMemo(
    () => (card?.type === "matching" ? shuffled(card.answer) : []),
    [card?.id],
  );
  if (!session)
    return error ? (
      <Empty
        title="We couldn’t open this session"
        action={<Button onClick={load}>Try again</Button>}
      >
        {error}
      </Empty>
    ) : (
      <div className="loading-state">
        <Loader2 className="spin" /> Opening your study session…
      </div>
    );
  if (session.ended) {
    const answers = session.answers || [];
    const percent = session.cursor
      ? Math.round((session.correct / session.cursor) * 100)
      : 0;
    return (
      <div className="session-results">
        <div className="results-celebration">
          <span>
            <Trophy size={34} />
          </span>

          <h1>{session.cursor ? "Session complete" : "Session saved"}</h1>
          <p>
            {session.cursor
              ? "Your answers and review schedules have been saved."
              : "Your cards will be here when you’re ready."}
          </p>
        </div>
        <div className="results-metrics">
          <div>
            <strong>{percent}%</strong>
            <span>Accuracy</span>
          </div>
          <div>
            <strong>
              {session.correct}/{session.cursor}
            </strong>
            <span>Correct recalls</span>
          </div>
          <div>
            <strong>
              {answers.reduce((s, x) => s + (x.result?.xp || 0), 0) +
                (session.cursor ? (session.mode === "test" ? 40 : 20) : 0)}
            </strong>
            <span>Recall & session XP</span>
          </div>
          <div>
            <strong>{Math.max(0, Math.round(session.duration / 60))}m</strong>
            <span>Active answer time</span>
          </div>
        </div>
        <div className="results-actions">
          <Button onClick={() => a.go("study")}>
            Study again <ArrowRight size={17} />
          </Button>
          <Button variant="secondary" onClick={() => a.go("dashboard")}>
            Back to dashboard
          </Button>
        </div>
        {answers.length > 0 && (
          <section className="panel">
            <SectionTitle
              title="Answer review"
              subtitle="Missed cards are scheduled sooner. You can find them in Weakness review."
            />
            {answers.map((ans, i) => (
              <div
                className={`result-answer ${ans.correct ? "correct" : "incorrect"}`}
                key={ans.id}
              >
                <span>
                  {ans.correct ? <Check size={17} /> : <X size={17} />}
                </span>
                <div>
                  <small>
                    Question {i + 1} {ans.manual ? "· Self graded" : ""}
                  </small>
                  <h3>{ans.front}</h3>
                  <p>
                    Your answer: {ans.response.join(" · ") || "Self assessed"}
                  </p>
                  <p>
                    <strong>Correct answer:</strong>{" "}
                    {ans.result.answer?.join(" · ")}
                  </p>
                  {ans.explanation && <p>{ans.explanation}</p>}
                  <small>
                    Scheduled from this attempt:{" "}
                    {new Intl.DateTimeFormat("en", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "Asia/Manila",
                    }).format(ans.result.nextReview)}
                  </small>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    );
  }
  const mode = modes.find((m) => m.id === session.mode);
  const classic = session.mode === "classic";
  const shown =
    classic && browse !== session.cursor
      ? session.browse?.[browse] || card
      : card;
  const browsing = classic && browse !== session.cursor;
  if (!shown && !feedback)
    return (
      <div className="empty">
        <h2>This session is ready to wrap up.</h2>
        <Button onClick={finish}>Save & see results</Button>
      </div>
    );
  const question = shown || card!;
  const correctAnswers =
    question.type === "cloze"
      ? [...question.front.matchAll(/\[([^\]]+)\]/g)].map((x) => x[1])
      : question.answer;
  return (
    <div className="study-session">
      <div className="study-top">
        <button
          className="back-link"
          onClick={() => {
            a.reload();
            a.go("study");
          }}
        >
          <Pause size={16} /> Save & pause
        </button>
        <span>{mode?.name || session.mode}</span>
        <div>
          {remaining !== null && (
            <span className={`timer ${remaining < 15 ? "urgent" : ""}`}>
              <Clock size={15} />
              {Math.floor(remaining / 60)}:
              {String(remaining % 60).padStart(2, "0")}
            </span>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              if (
                window.confirm(
                  "Finish this session and save the answers you have completed?",
                )
              )
                finish();
            }}
          >
            Finish <Flag size={15} />
          </Button>
        </div>
      </div>
      <div className="session-progress">
        <Progress value={(session.cursor / session.total) * 100} />
        <span>
          {session.cursor} / {session.total} cards
        </span>
      </div>
      <div className="study-context">
        <span className="pill">
          {a.data.decks.find((d) => d.id === question.deckId)?.title ||
            "Your study deck"}
        </span>
        <small>
          {cardTypes[question.type]}{" "}
          {question.type === "multi" ? "· Choose every correct answer" : ""}
        </small>
      </div>
      <div
        className={`question-card ${feedback ? (feedback.correct ? "answered-correct" : "answered-wrong") : ""}`}
      >
        <div className="question-label">
          {classic
            ? revealed
              ? "Answer"
              : "Question"
            : `Question ${Math.min(session.cursor + (feedback ? 0 : 1), session.total)}`}
          <span>{question.difficulty === "hard" ? "Challenging" : ""}</span>
        </div>
        {question.mediaId && (
          <img
            className="study-image"
            src={`/api/media?id=${question.mediaId}`}
            alt="Study material for this question"
            onError={(e) => {
              e.currentTarget.alt =
                "Study image unavailable. Upload the original image again.";
            }}
          />
        )}
        {classic ? (
          <button
            className="flip-surface"
            onClick={() => setRevealed(!revealed)}
            aria-label={revealed ? "Show question" : "Reveal answer"}
          >
            <RichText
              text={
                revealed
                  ? correctAnswers.join("\n")
                  : question.type === "cloze"
                    ? question.front.replace(/\[[^\]]+\]/g, "________")
                    : question.front
              }
            />
            <small>
              <RotateCcw size={14} />{" "}
              {revealed ? "Tap to see the question" : "Tap to reveal · Space"}
            </small>
          </button>
        ) : (
          <>
            <h2>
              <RichText
                text={
                  question.type === "cloze"
                    ? question.front.replace(/\[[^\]]+\]/g, "________")
                    : question.front
                }
              />
            </h2>
            {!revealed && !feedback && (
              <div className="answer-controls">
                {["qa", "image"].includes(question.type) && (
                  <Field label="Your answer">
                    <input
                      autoFocus
                      placeholder="Type your answer"
                      value={response[0] || ""}
                      onChange={(e) => setResponse([e.target.value])}
                      autoComplete="off"
                    />
                  </Field>
                )}
                {question.type === "cloze" &&
                  correctAnswers.map((_, i) => (
                    <Field label={`Blank ${i + 1}`} key={i}>
                      <input
                        autoFocus={i === 0}
                        value={response[i] || ""}
                        onChange={(e) =>
                          setResponse((prev) => {
                            const a = [...prev];
                            a[i] = e.target.value;
                            return a;
                          })
                        }
                        autoComplete="off"
                        placeholder="What belongs here?"
                      />
                    </Field>
                  ))}
                {["choice", "multi", "boolean"].includes(question.type) && (
                  <div className="quiz-options">
                    {(question.type === "boolean"
                      ? ["True", "False"]
                      : question.options
                    ).map((option, i) => (
                      <button
                        key={option}
                        className={response.includes(option) ? "selected" : ""}
                        onClick={() =>
                          setResponse(
                            question.type === "multi"
                              ? response.includes(option)
                                ? response.filter((x) => x !== option)
                                : [...response, option]
                              : [option],
                          )
                        }
                        aria-pressed={response.includes(option)}
                      >
                        <span>
                          {question.type === "multi" ? (
                            response.includes(option) ? (
                              <Check size={13} />
                            ) : null
                          ) : (
                            String.fromCharCode(65 + i)
                          )}
                        </span>
                        <RichText text={option} />
                      </button>
                    ))}
                  </div>
                )}
                {question.type === "matching" && (
                  <div className="matching-list">
                    {question.options.map((term, i) => (
                      <Field label={term} key={term}>
                        <select
                          value={response[i] || ""}
                          onChange={(e) =>
                            setResponse((prev) => {
                              const a = [...prev];
                              a[i] = e.target.value;
                              return a;
                            })
                          }
                        >
                          <option value="">Match with…</option>
                          {matchOptions.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ))}
                  </div>
                )}
                {question.type === "ordering" && (
                  <div className="ordering-list">
                    {order.map((item, i) => (
                      <div key={item}>
                        <span>{i + 1}</span>
                        <p>{item}</p>
                        <IconButton
                          label={`Move step ${i + 1} up`}
                          disabled={i === 0}
                          onClick={() =>
                            setOrder((prev) => {
                              const a = [...prev];
                              [a[i - 1], a[i]] = [a[i], a[i - 1]];
                              return a;
                            })
                          }
                        >
                          <ChevronUp size={17} />
                        </IconButton>
                        <IconButton
                          label={`Move step ${i + 1} down`}
                          disabled={i === order.length - 1}
                          onClick={() =>
                            setOrder((prev) => {
                              const a = [...prev];
                              [a[i + 1], a[i]] = [a[i], a[i + 1]];
                              return a;
                            })
                          }
                        >
                          <ChevronDown size={17} />
                        </IconButton>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
        {hint && question.hint && (
          <p className="hint-box">
            <Lightbulb size={16} />
            {question.hint}
          </p>
        )}
        {revealed && !classic && (
          <div className="revealed-answer">
            <small>Correct answer</small>
            <RichText text={correctAnswers.join("\n")} />
          </div>
        )}
        {revealed && question.explanation && !feedback && (
          <p className="answer-explanation">{question.explanation}</p>
        )}
        {feedback && (
          <div
            className={`answer-feedback ${feedback.correct ? "correct" : "incorrect"}`}
            role="status"
          >
            <div>
              <span>
                {feedback.correct ? (
                  <Check size={20} />
                ) : (
                  <RotateCcw size={20} />
                )}
              </span>
              <h3>
                {feedback.correct ? "Correct answer" : "Incorrect answer"}
              </h3>
              <b>
                {feedback.xp
                  ? `+${feedback.xp} XP`
                  : feedback.correct
                    ? "Already rewarded today"
                    : ""}
              </b>
            </div>
            <p>
              <strong>Correct answer:</strong> {feedback.answer.join(" · ")}
            </p>
            {feedback.explanation && <p>{feedback.explanation}</p>}
            <small>
              {feedback.manual ? "Self graded · " : ""}Next review{" "}
              {formatDue(feedback.nextReview)}
            </small>
          </div>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error} <button onClick={load}>Resume latest session</button>
        </p>
      )}
      <div className="study-bottom">
        {feedback ? (
          <Button
            busy={busy}
            className="continue-btn"
            onClick={() => advance()}
          >
            {feedback.session.cursor >= feedback.session.total
              ? "View results"
              : "Next card"}
            <ArrowRight size={18} />
          </Button>
        ) : browsing ? (
          <Button
            variant="secondary"
            onClick={() => {
              setBrowse(session.cursor);
              setCard(session.card);
              setRevealed(false);
            }}
          >
            Back to the next review <ArrowRight size={17} />
          </Button>
        ) : revealed ? (
          <div className="rating-controls">
            {[
              [1, "Again", "In a minute"],
              [2, "Hard", "Sooner"],
              [3, "Good", "Longer interval"],
              [4, "Easy", "Even longer"],
            ].map(([n, label, sub]) => (
              <button
                key={n}
                disabled={busy}
                className={`rating rating-${n}`}
                onClick={() => submit(+n, true)}
              >
                <strong>{label}</strong>
                <small>{sub}</small>
                <kbd>{n}</kbd>
              </button>
            ))}
          </div>
        ) : classic ? (
          <Button className="continue-btn" onClick={() => setRevealed(true)}>
            Reveal answer <RotateCcw size={17} />
          </Button>
        ) : (
          <>
            <div className="study-helpers">
              {question.hint && (
                <Button variant="ghost" onClick={() => setHint(!hint)}>
                  <Lightbulb size={16} /> {hint ? "Hide hint" : "Show hint"}
                </Button>
              )}
              {session.mode !== "test" && session.mode !== "speed" && (
                <Button variant="ghost" onClick={() => setRevealed(true)}>
                  Reveal & self grade
                </Button>
              )}
            </div>
            <Button
              busy={busy}
              onClick={() => submit()}
              disabled={
                question.type !== "ordering" &&
                (!response.length ||
                  response.some((x) => !x?.trim()) ||
                  (question.type === "cloze" &&
                    response.length !== correctAnswers.length) ||
                  (question.type === "matching" &&
                    response.length !== question.options.length))
              }
            >
              Check answer <ArrowRight size={17} />
            </Button>
          </>
        )}
      </div>
      {classic && (
        <div className="classic-navigation">
          <IconButton
            label="Shuffle remaining flashcards"
            disabled={busy || !!feedback}
            onClick={async () => {
              setBusy(true);
              try {
                const s = await api<Session>("shuffle", { id });
                setSession(s);
                setCard(s.card);
                setBrowse(s.cursor);
                setRevealed(false);
                a.toast("Remaining flashcards shuffled.");
              } catch (e: any) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Shuffle size={18} />
          </IconButton>
          <IconButton
            label="Previous flashcard"
            disabled={browse === 0}
            onClick={() => {
              setBrowse(browse - 1);
              setRevealed(false);
            }}
          >
            <ChevronLeft size={19} />
          </IconButton>
          <span>
            {browse + 1} / {session.total}
          </span>
          <IconButton
            label="Next flashcard"
            disabled={browse >= session.total - 1}
            onClick={() => {
              setBrowse(browse + 1);
              setRevealed(false);
            }}
          >
            <ChevronRight size={19} />
          </IconButton>
        </div>
      )}
      <p className="study-reassurance">
        {a.data.settings.keyboard ? (
          <>
            <Keyboard size={13} /> Enter to check or continue · 1–4 to self
            grade
          </>
        ) : (
          <>
            <Check size={13} /> Your answers save as you go.
          </>
        )}
      </p>
    </div>
  );
}
function formatDue(ms: number) {
  if (!ms) return "after your next review";
  const diff = ms - Date.now();
  if (diff < 120000) return "in about a minute";
  if (diff < 3600000) return `in about ${Math.round(diff / 60000)} minutes`;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(ms);
}
