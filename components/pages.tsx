"use client";
import { useState, useRef, type ReactNode } from "react";
import {
  Plus,
  CalendarDays,
  ArrowRight,
  Trash2,
  Pencil,
  Check,
  BookOpen,
  Target,
  Clock,
  Flame,
  Sparkles,
  Trophy,
  GraduationCap,
  Brain,
  LockKeyhole,
  Download,
  Upload,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  Loader2,
  RotateCcw,
  Layers,
  Star,
  CheckCircle2,
} from "lucide-react";
import type { AppActions } from "./app";
import {
  Button,
  IconButton,
  Modal,
  Field,
  Empty,
  Ring,
  Progress,
  SectionTitle,
} from "./ui";
import { api, request, download } from "../lib/client";
import {
  dayIndex,
  manilaDate,
  type Settings as Preferences,
} from "../lib/types";
import { RichText } from "./rich-text";
export function Exams({ a }: { a: AppActions }) {
  const [edit, setEdit] = useState<any>(null),
    [error, setError] = useState("");
  const d = a.data;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Exams</h1>
          <p>Connect decks to an exam date and plan your reviews.</p>
        </div>
        <Button onClick={() => setEdit({})}>
          <Plus size={17} /> Add an exam
        </Button>
      </div>
      {error && <p className="error">{error}</p>}
      {!d.exams.length ? (
        <Empty
          title="Add your first exam"
          icon={<CalendarDays size={28} />}
          action={
            <Button onClick={() => setEdit({})}>
              <Plus size={17} /> Plan your first exam
            </Button>
          }
        >
          Add an upcoming exam, connect your decks, and start making steady
          progress.
        </Empty>
      ) : (
        <div className="exams-grid">
          {d.exams.map((e) => {
            const cards = d.cards.filter((c) => e.deckIds.includes(c.deckId));
            const ready = cards.length
              ? Math.round(
                  cards.reduce((s, c) => s + c.mastery, 0) / cards.length,
                )
              : 0;
            const days = Math.ceil(
              (Date.parse(e.date + "T00:00:00+08:00") - Date.now()) / 86400000,
            );
            const mastered = cards.filter((c) => c.mastery >= 80).length;
            const due = cards.filter(
              (c) =>
                c.review &&
                c.review.state !== "new" &&
                c.review.due <= Date.now(),
            ).length;
            const daily = Math.min(
              200,
              Math.max(
                1,
                Math.ceil((cards.length - mastered + due) / Math.max(1, days)),
              ),
            );
            const goals = d.goals.filter((g) => g.exam_id === e.id);
            return (
              <article className="panel exam-card" key={e.id}>
                <div className="exam-card-top">
                  <span className="pill">
                    {days < 0
                      ? "IN THE REARVIEW"
                      : days === 0
                        ? "TODAY IS THE DAY"
                        : `${days} DAYS TO GO`}
                    {e.priority === "high" ? " · HIGH PRIORITY" : ""}
                  </span>
                  <div>
                    <IconButton
                      label={`Edit ${e.name}`}
                      onClick={() => setEdit(e)}
                    >
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton
                      label={`Delete ${e.name}`}
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `Delete the exam “${e.name}”? Your decks and study history stay saved.`,
                          )
                        )
                          return;
                        try {
                          await api("deleteExam", { id: e.id });
                          await a.reload();
                          a.toast("Exam removed.");
                        } catch (e: any) {
                          setError(e.message);
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </div>
                <h2>{e.name}</h2>
                <p>
                  <CalendarDays
                    size={13}
                    style={{ display: "inline", marginRight: 6 }}
                  />
                  {new Intl.DateTimeFormat("en", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "Asia/Manila",
                  }).format(Date.parse(e.date + "T12:00:00+08:00"))}
                </p>
                <div className="exam-readiness">
                  <Ring value={ready} size={108}>
                    <strong>{ready}%</strong>
                    <small>readiness estimate</small>
                  </Ring>
                  <div>
                    <strong>{cards.length} cards in your corner</strong>
                    <p>
                      {mastered} mastered · {due} due
                      <br />
                      {e.deckIds.length} connected decks
                    </p>
                  </div>
                </div>
                <p className="data-warning">
                  Readiness is a scheduling and mastery estimate, not a
                  prediction of your exam score.
                </p>
                <div className="data-actions">
                  <Button
                    disabled={!cards.length}
                    onClick={async () => {
                      try {
                        const s = await api("start", {
                          id: crypto.randomUUID(),
                          mode: "memorise",
                          deckIds: e.deckIds,
                          filter: "due",
                          count: daily,
                        });
                        a.go(`session/${s.id}`);
                      } catch (e: any) {
                        a.toast(e.message);
                      }
                    }}
                  >
                    Study for this exam <ArrowRight size={15} />
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!cards.length}
                    onClick={async () => {
                      try {
                        const s = await api("start", {
                          id: crypto.randomUUID(),
                          mode: "test",
                          deckIds: e.deckIds,
                          filter: "all",
                          count: Math.min(20, cards.length),
                        });
                        a.go(`session/${s.id}`);
                      } catch (e: any) {
                        a.toast(e.message);
                      }
                    }}
                  >
                    Practice test
                  </Button>
                </div>
                <details className="exam-details">
                  <summary>Your coverage & study plan</summary>
                  <p>
                    {e.topics ||
                      "Add your teacher’s coverage or official exam topics here."}
                  </p>
                  {e.notes && <p>{e.notes}</p>}
                  <p>
                    Suggested daily load: <b>{daily} cards</b>. This balances
                    remaining cards and today’s review workload over the days
                    available. Adjust the target to suit your time.
                  </p>
                  {goals.map((g) => (
                    <PlanRow key={g.id} goal={g} a={a} />
                  ))}
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await api("goal", {
                          examId: e.id,
                          day: manilaDate(),
                          target: daily,
                          done: false,
                        });
                        await a.reload();
                        a.toast("Today’s editable study target was added.");
                      } catch (e: any) {
                        a.toast(e.message);
                      }
                    }}
                  >
                    <Plus size={14} /> Add today’s target
                  </Button>
                </details>
              </article>
            );
          })}
        </div>
      )}
      {edit && <ExamDialog a={a} exam={edit} onClose={() => setEdit(null)} />}
    </>
  );
}
function PlanRow({ goal: g, a }: { goal: any; a: AppActions }) {
  const [target, setTarget] = useState(g.target);
  return (
    <div className="plan-row">
      <input
        aria-label={`Complete target for ${g.day}`}
        type="checkbox"
        checked={!!g.done}
        onChange={async (e) => {
          try {
            await api("goal", {
              id: g.id,
              examId: g.exam_id,
              day: g.day,
              target,
              done: e.target.checked,
            });
            await a.reload();
          } catch (e: any) {
            a.toast(e.message);
          }
        }}
      />
      <span>{g.day}</span>
      <input
        aria-label="Daily plan target"
        type="number"
        min={1}
        max={500}
        value={target}
        onChange={(e) => setTarget(+e.target.value)}
      />
      <small>cards</small>
      <Button
        variant="secondary"
        onClick={async () => {
          try {
            await api("goal", {
              id: g.id,
              examId: g.exam_id,
              day: g.day,
              target,
              done: !!g.done,
            });
            await a.reload();
            a.toast("Plan adjusted.");
          } catch (e: any) {
            a.toast(e.message);
          }
        }}
      >
        Save
      </Button>
    </div>
  );
}
function ExamDialog({
  a,
  exam: e,
  onClose,
}: {
  a: AppActions;
  exam: any;
  onClose: () => void;
}) {
  const [name, setName] = useState(e.name || ""),
    [date, setDate] = useState(e.date || manilaDate()),
    [topics, setTopics] = useState(e.topics || ""),
    [notes, setNotes] = useState(e.notes || ""),
    [priority, setPriority] = useState(e.priority || "normal"),
    [decks, setDecks] = useState<string[]>(e.deckIds || []),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      title={e.id ? "Edit exam" : "Create exam"}
      description="Use your teacher’s coverage or official materials to guide your plan."
      onClose={onClose}
    >
      <form
        onSubmit={async (ev) => {
          ev.preventDefault();
          setBusy(true);
          try {
            await api("exam", {
              id: e.id,
              name,
              date,
              topics,
              notes,
              priority,
              deckIds: decks,
            });
            await a.reload();
            onClose();
            a.toast("Your exam plan is saved.");
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Exam name">
          <input
            required
            autoFocus
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            placeholder="e.g. Filipino · Quarter 1"
          />
        </Field>
        <div className="form-grid">
          <Field label="Exam date · Asia/Manila">
            <input
              type="date"
              required
              value={date}
              onChange={(ev) => setDate(ev.target.value)}
            />
          </Field>
          <Field label="Priority">
            <select
              value={priority}
              onChange={(ev) => setPriority(ev.target.value)}
            >
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="low">Low</option>
            </select>
          </Field>
        </div>
        <Field label="Coverage / topics">
          <textarea
            rows={3}
            value={topics}
            onChange={(ev) => setTopics(ev.target.value)}
            placeholder="Topics from your class or official exam guide"
          />
        </Field>
        <Field label="Related decks">
          <div className="deck-checklist">
            {a.data.decks
              .filter((d) => !d.archived)
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
            {!a.data.decks.length && (
              <p>Create a deck in your library to connect it here later.</p>
            )}
          </div>
        </Field>
        <Field label="Notes (optional)">
          <textarea
            rows={2}
            value={notes}
            onChange={(ev) => setNotes(ev.target.value)}
          />
        </Field>
        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={busy}>
            Save exam plan <Check size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function Statistics({ a }: { a: AppActions }) {
  const d = a.data,
    s = d.stats,
    today = dayIndex(),
    daily = d.activity.find((a) => a.day === today);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Your progress</h1>
          <p>Review activity, retrieval accuracy, and estimated mastery.</p>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            download("recallforge-study-history.json", {
              format: "recallforge-history",
              version: 1,
              activity: d.activity,
              sessions: d.sessions,
            })
          }
        >
          <Download size={16} /> Export activity summary
        </Button>
      </div>
      <div className="stats-grid">
        {[
          [
            Target,
            "Recall accuracy",
            `${s.accuracy}%`,
            `${s.correct} correct / ${s.answers} attempts`,
          ],
          [Layers, "Cards reviewed", s.answers, `${s.today} attempts today`],
          [
            Clock,
            "Active study time",
            `${s.minutes} min`,
            "Sum of recorded answer time",
          ],
          [
            Flame,
            "Longest streak",
            `${s.streak.longest} days`,
            "Calendar days in Asia/Manila",
          ],
        ].map(([Icon, label, value, note]: any) => (
          <div className="panel stat-block" key={label}>
            <span>
              <Icon size={16} />
              {label}
            </span>
            <strong>{value}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <div className="stats-charts">
        <section className="panel">
          <SectionTitle
            title="A little, every day"
            subtitle="Your last 13 weeks of study activity · Asia/Manila"
          />
          <div
            className="heatmap"
            role="img"
            aria-label="Study activity over the last 91 days"
          >
            {Array.from({ length: 91 }, (_, i) => {
              const day = today - 90 + i,
                n = d.activity.find((a) => a.day === day)?.answers || 0;
              return (
                <div
                  key={day}
                  data-level={
                    n
                      ? Math.min(4, Math.ceil((n / d.settings.dailyGoal) * 4))
                      : 0
                  }
                  title={`${new Date(day * 86400000).toISOString().slice(0, 10)}: ${n} reviews`}
                  aria-label={`${n} reviews`}
                />
              );
            })}
          </div>
          <div className="heatmap-legend">
            Less
            <i />
            <i />
            <i />
            <i />
            More
          </div>
        </section>
        <section className="panel">
          <SectionTitle
            title="Your growing knowledge"
            subtitle="Mastery is a transparent interval × accuracy estimate."
          />
          <div className="mastery-bars">
            {[
              ["Not studied", d.cards.filter((c) => !c.review?.reviews).length],
              ["Learning", s.learning],
              ["Mastered (80%+)", s.mastered],
            ].map(([name, count]) => (
              <div className="mastery-bar" key={name}>
                <div>
                  <span>{name}</span>
                  <b>{count} cards</b>
                </div>
                <Progress
                  value={
                    d.cards.length ? (Number(count) / d.cards.length) * 100 : 0
                  }
                />
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel">
        <SectionTitle
          title="A closer look at your subjects"
          subtitle="Find where a little extra attention could help."
        />
        {d.subjects.length ? (
          d.subjects.map((sub) => {
            const ids = d.decks
                .filter((x) => x.subjectId === sub.id && !x.archived)
                .map((x) => x.id),
              cards = d.cards.filter((c) => ids.includes(c.deckId)),
              reviews = cards.reduce((s, c) => s + (c.review?.reviews || 0), 0),
              correct = cards.reduce(
                (s, c) => s + (c.review?.successes || 0),
                0,
              ),
              mastery = cards.length
                ? Math.round(
                    cards.reduce((s, c) => s + c.mastery, 0) / cards.length,
                  )
                : 0;
            return (
              <div className="subject-stat" key={sub.id}>
                <i style={{ background: sub.color }} />
                <div>
                  <h3>{sub.name}</h3>
                  <p>
                    {cards.length} cards · {reviews} attempts ·{" "}
                    {reviews ? Math.round((correct / reviews) * 100) : 0}%
                    retrieval success
                  </p>
                  <Progress value={mastery} />
                </div>
                <strong>{mastery}% mastery</strong>
                <a className="text-link" href={`#library/${sub.id}`}>
                  Open <ArrowRight size={13} />
                </a>
              </div>
            );
          })
        ) : (
          <p className="muted">
            Your subjects will appear as your library grows.
          </p>
        )}
      </section>
      {s.answers > 0 && (
        <div className="info-note" style={{ marginTop: 22 }}>
          {s.accuracy < 70
            ? "Some concepts could use another look. Weakness review will prioritize cards you have missed."
            : "Your next useful step is to review due cards, then add a few new ones within your daily limit."}
        </div>
      )}
    </>
  );
}
const achievementList = [
  [
    "first-card",
    "First little spark",
    "Create your first flashcard.",
    BookOpen,
  ],
  [
    "first-session",
    "Off to a good start",
    "Complete a study session.",
    GraduationCap,
  ],
  [
    "hundred-correct",
    "A hundred connections",
    "Recall 100 answers correctly.",
    Brain,
  ],
  [
    "seven-days",
    "Seven-day scholar",
    "Study on seven consecutive days.",
    Flame,
  ],
  ["thousand-xp", "Knowledge in the making", "Earn 1,000 total XP.", Sparkles],
  [
    "hundred-mastered",
    "A lasting library",
    "Reach 80% mastery on 100 cards.",
    Layers,
  ],
  [
    "perfect-test",
    "A moment of clarity",
    "Get every answer right in a practice test of 5+ questions.",
    Target,
  ],
] as const;
export function Achievements({ a }: { a: AppActions }) {
  const earned = a.data.unlocks;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Achievements</h1>
          <p>
            {earned.length} of {achievementList.length} milestones reached. Keep
            going at your own pace.
          </p>
        </div>
      </div>
      <div className="achievement-grid">
        {achievementList.map(([id, title, description, Icon]) => {
          const unlocked = earned.find((e) => e.key === id);
          return (
            <article
              className={`panel achievement-card ${unlocked ? "earned" : ""}`}
              key={id}
            >
              {unlocked && (
                <span className="earned-label">
                  <Check size={11} /> EARNED
                </span>
              )}
              <div>
                <Icon size={30} />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
              <small>
                {unlocked
                  ? `Reached ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "Asia/Manila" }).format(unlocked.created)}`
                  : "A little something to grow toward"}
              </small>
            </article>
          );
        })}
      </div>
    </>
  );
}
function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (b: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      className={`switch ${value ? "on" : ""}`}
      onClick={() => onChange(!value)}
    >
      <span />
    </button>
  );
}
function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="setting-row">
      <div>
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function Settings({ a }: { a: AppActions }) {
  const [draft, setDraft] = useState<Preferences>({ ...a.data.settings }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [restore, setRestore] = useState<any>(null),
    [confirm, setConfirm] = useState(""),
    [erase, setErase] = useState(false),
    [recovery, setRecovery] = useState<any[] | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(a.data.settings);
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await api("settings", { data: draft, version: a.data.settingsVersion });
      await a.reload();
      a.toast("Your study space, just the way you like it.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const backup = async () => {
    try {
      const b = await request("/api/app?backup=1");
      download(`recallforge-backup-${manilaDate()}.json`, b);
      a.toast("Backup downloaded. Keep original study images separately.");
    } catch (e: any) {
      setError(e.message);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Settings</h1>
          <p>Set study goals, appearance, and data preferences.</p>
        </div>
      </div>
      <div className="settings-layout">
        <div>
          <section className="panel settings-section">
            <h2>Profile and appearance</h2>
            <p>Personalize your own corner of knowledge.</p>
            <Field label="What should we call you?">
              <input
                value={draft.displayName}
                maxLength={60}
                placeholder="Your name"
                onChange={(e) => set("displayName", e.target.value)}
              />
            </Field>
            <SettingRow
              title="Appearance"
              description="Choose a light, dark, or system theme."
            >
              <select
                aria-label="Appearance"
                value={draft.theme}
                onChange={(e) => set("theme", e.target.value as any)}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </SettingRow>
            <SettingRow
              title="Tutor language"
              description="Used for optional AI explanations and card generation."
            >
              <select
                aria-label="Tutor language"
                value={draft.language}
                onChange={(e) => set("language", e.target.value as any)}
              >
                <option>English</option>
                <option>Filipino</option>
              </select>
            </SettingRow>
            <SettingRow
              title="Study calendar"
              description="Daily limits, streaks, and goals use the Philippines calendar."
            >
              <span className="subtle-chip">Asia/Manila · UTC+8</span>
            </SettingRow>
          </section>
          <section className="panel settings-section">
            <h2>Study preferences</h2>
            <p>A manageable goal is a goal you can come back to.</p>
            {(
              [
                [
                  "dailyGoal",
                  "Daily card target",
                  "Completed answer attempts per day.",
                  1,
                  500,
                ],
                [
                  "xpGoal",
                  "Daily XP target",
                  "Your personal target for meaningful practice.",
                  10,
                  5000,
                ],
                [
                  "newLimit",
                  "New cards per day",
                  "Applies to due + new and new-card sessions.",
                  0,
                  200,
                ],
                [
                  "reviewLimit",
                  "Scheduled reviews per day",
                  "Applies to your default due-card queue.",
                  1,
                  1000,
                ],
              ] as const
            ).map(([key, title, description, min, max]) => (
              <SettingRow key={key} title={title} description={description}>
                <input
                  aria-label={title}
                  type="number"
                  min={min}
                  max={max}
                  value={draft[key]}
                  onChange={(e) => set(key, +e.target.value)}
                />
              </SettingRow>
            ))}
            {(
              [
                [
                  "randomize",
                  "Shuffle practice",
                  "Randomize All cards sessions. Due cards stay in priority order.",
                ],
                [
                  "autoAdvance",
                  "Auto-advance correct answers",
                  "Move to the next card after a short feedback pause.",
                ],
                [
                  "keyboard",
                  "Keyboard shortcuts",
                  "Enter checks an answer; 1–4 rate a revealed card.",
                ],
                ["sound", "A little sound", "Play a soft cue after an answer."],
                [
                  "reducedMotion",
                  "Reduce motion",
                  "Keep transitions calm and immediate.",
                ],
                [
                  "hideStreak",
                  "Hide your streak",
                  "Leave streaks out of the dashboard header.",
                ],
              ] as const
            ).map(([key, title, description]) => (
              <SettingRow title={title} description={description} key={key}>
                <Toggle
                  label={title}
                  value={draft[key]}
                  onChange={(b) => set(key, b)}
                />
              </SettingRow>
            ))}
            <div className="notification-note" style={{ marginTop: 18 }}>
              Scheduler: SM-2 inspired, implemented in Rust. Again brings a card
              back in about a minute. Successful reviews gradually lengthen its
              interval. This version does not use FSRS or a desired-retention
              setting.
            </div>
          </section>
          <section className="panel settings-section">
            <h2>AI preferences</h2>
            <p>Basic study features work without a paid service or API key.</p>
            <SettingRow
              title="Enable AI features"
              description="Allow explicitly requested study material to be sent to your configured provider."
            >
              <Toggle
                label="Enable AI features"
                value={draft.aiEnabled}
                onChange={(b) => set("aiEnabled", b)}
              />
            </SettingRow>
            <SettingRow
              title="Provider status"
              description={
                a.data.ai.available
                  ? `${a.data.ai.provider} · ${a.data.ai.model}`
                  : "No provider key is configured. Your ChatGPT subscription does not supply API access."
              }
            >
              <span className="subtle-chip">
                {a.data.ai.available ? "CONFIGURED" : "NOT CONFIGURED"}
              </span>
            </SettingRow>
            <p className="data-warning">
              A server-side GEMINI_API_KEY or OPENROUTER_API_KEY can be
              configured in Sites before deployment. Keys never belong in this
              form. AI requests are limited to 10 per day; provider charges may
              apply. There is no dollar-based spending cap in this version.
            </p>
          </section>
          <section className="panel settings-section">
            <h2>Your data</h2>
            <p>
              Keep a copy of your decks, review schedules, settings, and study
              history.
            </p>
            <div className="data-actions">
              <Button variant="secondary" onClick={backup}>
                <Download size={16} /> Complete data backup
              </Button>
              <Button variant="secondary" onClick={() => file.current?.click()}>
                <Upload size={16} /> Restore backup
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  download("recallforge-decks.json", {
                    format: "recallforge-library",
                    version: 1,
                    decks: a.data.decks,
                    cards: a.data.cards,
                    attachmentsIncluded: false,
                  })
                }
              >
                Export library
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    setRecovery(await request("/api/app?recovery=1"));
                  } catch (e: any) {
                    setError(e.message);
                  }
                }}
              >
                <RotateCcw size={15} /> Recover deleted decks
              </Button>
            </div>
            <input
              ref={file}
              hidden
              style={{ display: "none" }}
              type="file"
              accept=".json"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  if (f.size > 20_000_000)
                    throw new Error("Choose a backup under 20 MB.");
                  const b = JSON.parse(await f.text());
                  if (b.format !== "recallforge-backup" || b.version !== 1)
                    throw new Error(
                      "Choose a complete RecallForge version 1 backup.",
                    );
                  setRestore(b);
                  setConfirm("");
                } catch (e: any) {
                  setError(e.message);
                }
                e.target.value = "";
              }}
            />
            <p className="data-warning">
              Backups include image metadata, not binary attachments. Keep the
              original images separately. Restore replaces the current account’s
              data in one database transaction. Local preview and hosted data
              are separate.
            </p>
          </section>
          <section className="panel settings-section danger-zone">
            <h2>Delete study data</h2>
            <p>
              Erase your library, exams, progress, and history. Download a
              backup first.
            </p>
            <Button
              variant="danger"
              onClick={() => {
                setErase(true);
                setConfirm("");
              }}
            >
              <Trash2 size={15} /> Delete all study data
            </Button>
          </section>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="settings-save">
            <span>
              {dirty
                ? "A few personal touches are ready to save."
                : "Your preferences are up to date."}
            </span>
            <Button busy={busy} disabled={!dirty} onClick={save}>
              <Save size={16} /> Save preferences
            </Button>
          </div>
        </div>
        <aside className="panel settings-aside">
          <ShieldCheck size={27} className="violet" />
          <h3>A private place to learn.</h3>
          <p>
            Your records belong to your signed-in account. No advertising,
            tracking pixels, subscriptions, or leaderboards.
          </p>
          <hr />
          <h3>Built for remembering.</h3>
          <p>
            Rust handles answer evaluation, review intervals, session
            transitions, XP, streaks, levels, and mastery.
          </p>
          <a
            className="btn secondary"
            style={{ marginTop: 23 }}
            href="/signout-with-chatgpt?return_to=/"
            target="_top"
          >
            Sign out
          </a>
        </aside>
      </div>
      {(restore || erase) && (
        <Modal
          title={
            erase ? "Ready for a fresh start?" : "Restore your study space"
          }
          description={
            erase
              ? "This permanently erases your database records. Keep a backup if you may need them again."
              : "This replaces your current library, schedules, settings, and history. Image bytes are not included."
          }
          onClose={() => {
            setRestore(null);
            setErase(false);
          }}
        >
          <Field label={`Type ${erase ? "DELETE ALL" : "RESTORE"} to confirm`}>
            <input
              autoFocus
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setRestore(null);
                setErase(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              busy={busy}
              disabled={confirm !== (erase ? "DELETE ALL" : "RESTORE")}
              onClick={async () => {
                setBusy(true);
                try {
                  await api(
                    erase ? "deleteAll" : "restore",
                    erase
                      ? { confirmation: confirm }
                      : { backup: restore, confirmation: confirm },
                  );
                  setRestore(null);
                  setErase(false);
                  await a.reload();
                  a.go("dashboard");
                  a.toast(
                    erase
                      ? "Your data was erased. A fresh page is ready."
                      : "Backup restored. Re-upload any missing study images.",
                  );
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {erase ? "Erase my study data" : "Restore backup"}
            </Button>
          </div>
        </Modal>
      )}
      {recovery && (
        <Modal
          title="Bring a little knowledge back"
          onClose={() => setRecovery(null)}
        >
          {recovery.length ? (
            recovery.map((r) => (
              <div key={r.id} className="recovery-row">
                <span>{r.title}</span>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await api("decks", { operation: "recover", ids: [r.id] });
                      await a.reload();
                      setRecovery(recovery.filter((x) => x.id !== r.id));
                      a.toast("Deck recovered.");
                    } catch (e: any) {
                      setError(e.message);
                    }
                  }}
                >
                  Recover
                </Button>
              </div>
            ))
          ) : (
            <p className="muted">No deleted decks to recover.</p>
          )}
        </Modal>
      )}
    </>
  );
}
const prompts = [
  "Explain a concept from this deck",
  "Summarize the key ideas in my notes",
  "Ask me one question at a time",
  "Help me understand a mistake",
  "Create a short lesson with an example",
];
export function Tutor({ a }: { a: AppActions }) {
  const [deck, setDeck] = useState(""),
    [message, setMessage] = useState(""),
    [messages, setMessages] = useState<{ role: string; text: string }[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const available = a.data.ai.available && a.data.settings.aiEnabled;
  const send = async (text = message) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await api("ai", {
        kind: "tutor",
        message: text,
        deckIds: deck ? [deck] : [],
        language: a.data.settings.language,
      });
      setMessages((m) => [
        ...m,
        { role: "user", text },
        { role: "assistant", text: r.message },
      ]);
      setMessage("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>AI tutor</h1>
          <p>
            A study companion for the moments when you’d like another
            explanation.
          </p>
        </div>
      </div>
      <div className="tutor-layout">
        <aside className="panel tutor-sidebar">
          <h3>Give your tutor some context</h3>
          <Field label="Study deck">
            <select value={deck} onChange={(e) => setDeck(e.target.value)}>
              <option value="">General topic</option>
              {a.data.decks
                .filter((d) => !d.archived)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
            </select>
          </Field>
          <h3>Suggested questions</h3>
          <div className="tutor-prompts">
            {prompts.map((p) => (
              <button key={p} onClick={() => setMessage(p)}>
                {p}
              </button>
            ))}
          </div>
          <p className="tutor-disclosure">
            When you send a message, selected deck cards and source references
            go to {a.data.ai.provider}. Provider charges may apply. AI can make
            mistakes; check important facts against your materials.
          </p>
        </aside>
        <div className="tutor-main">
          <div
            style={{
              padding: "15px 20px",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <Field label="Conversation context">
              <select
                aria-label="Tutor context"
                value={deck}
                onChange={(e) => setDeck(e.target.value)}
              >
                <option value="">General topic</option>
                {a.data.decks
                  .filter((d) => !d.archived)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
              </select>
            </Field>
            <small className="muted">
              Each request includes your current question and selected deck.
              Chat messages stay on this page during this visit.
            </small>
          </div>
          <div className="tutor-messages">
            {!messages.length ? (
              <div className="tutor-welcome">
                <span>
                  <Brain size={30} />
                </span>
                <h2>{available ? "Ask a study question" : "AI tutor setup"}</h2>
                <p>
                  {available
                    ? "Bring a question, a tricky concept, or a little uncertainty. We’ll work through it step by step."
                    : !a.data.ai.available
                      ? "No AI provider is configured yet. Set a server-side provider key to enable real explanations. Your flashcards and study sessions already work without one."
                      : "Enable AI in Settings to request explanations from your configured provider."}
                </p>
                {!available && (
                  <Button variant="secondary" onClick={() => a.go("settings")}>
                    <Settings2 size={15} /> Open AI settings
                  </Button>
                )}
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`chat-message ${m.role}`}>
                  <small>
                    {m.role === "user" ? "YOU" : "RECALLFORGE · AI"}
                  </small>
                  <RichText text={m.text} />
                </div>
              ))
            )}
            {busy && (
              <p className="muted" role="status">
                <Loader2
                  size={15}
                  className="spin"
                  style={{ display: "inline", marginRight: 7 }}
                />{" "}
                Working through your question…
              </p>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
          <form
            className="tutor-compose"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              aria-label="Message your AI tutor"
              rows={2}
              maxLength={6000}
              placeholder={
                available
                  ? "What would you like to understand?"
                  : "AI is waiting for a configured provider."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={!available || busy}
            />
            <Button
              aria-label="Send message"
              busy={busy}
              disabled={!available || !message.trim()}
            >
              <Send size={18} />
            </Button>
          </form>
        </div>
      </div>
      <p className="data-warning">
        AI requests send the chosen context to an external provider and are
        limited to 10 per day. Generated explanations are suggestions to verify,
        not a replacement for your class sources.
      </p>
    </>
  );
}
