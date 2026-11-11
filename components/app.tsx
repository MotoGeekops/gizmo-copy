"use client";
import { useEffect, useState, useCallback, type ReactNode } from "react";
import {
  House,
  BookOpen,
  Layers,
  Brain,
  CalendarDays,
  ChartNoAxesCombined,
  Trophy,
  Settings2,
  Search,
  Plus,
  Flame,
  ArrowRight,
  ArrowUpRight,
  Upload,
  Target,
  Clock,
  Check,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  LockKeyhole,
  Menu,
  Sparkles,
  BookMarked,
  GraduationCap,
  LogOut,
  X,
  Loader2,
} from "lucide-react";
import {
  Button,
  IconButton,
  ForgeMark,
  SectionTitle,
  Empty,
  Progress,
  Ring,
  Modal,
  Field,
} from "./ui";
import { request, api } from "../lib/client";
import { type AppData, dayIndex, colors, manilaDate } from "../lib/types";
import Library, { DeckDialog, SubjectDialog } from "./library";
import Dashboard from "./dashboard";
import { CardEditor } from "./card-editor";
import { StudyHome, StudySession } from "./study";
import SmartImport from "./smart-import";
import { Exams, Statistics, Achievements, Settings, Tutor } from "./pages";
import { samples } from "../lib/samples";
const nav = [
  ["dashboard", "Dashboard", House],
  ["library", "My Library", BookOpen],
  ["study", "Study", Layers],
  ["tutor", "AI Tutor", Brain],
  ["exams", "Exams", CalendarDays],
  ["statistics", "Statistics", ChartNoAxesCombined],
  ["achievements", "Achievements", Trophy],
] as const;
export type AppActions = {
  data: AppData;
  reload: () => Promise<void>;
  toast: (s: string) => void;
  go: (s: string) => void;
  createDeck: () => void;
  importDeck: (id?: string) => void;
  editCard: (card?: any, deckId?: string) => void;
  createSubject: () => void;
};
export default function RecallForge() {
  const [data, setData] = useState<AppData | null>(null),
    [error, setError] = useState(""),
    [route, setRoute] = useState("dashboard"),
    [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState(""),
    [modal, setModal] = useState<any>(null),
    [refreshing, setRefreshing] = useState(false);
  const reload = useCallback(async () => {
    const next = await request<AppData>("/api/app");
    setData(next);
    setError("");
  }, []);
  useEffect(() => {
    reload().catch((e) => setError(e.message));
    const update = () => {
      setRoute(location.hash.slice(1) || "dashboard");
      setMobile(false);
      setSearch("");
      window.scrollTo(0, 0);
    };
    update();
    addEventListener("hashchange", update);
    return () => removeEventListener("hashchange", update);
  }, [reload]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!data) return;
    const settings = data.settings;
    const m = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        settings.theme === "system"
          ? m.matches
            ? "dark"
            : "light"
          : settings.theme;
      document.documentElement.dataset.motion = settings.reducedMotion
        ? "reduced"
        : "normal";
    };
    apply();
    m.addEventListener("change", apply);
    return () => m.removeEventListener("change", apply);
  }, [data?.settings]);
  const go = (s: string) => {
    location.hash = s;
  };
  const toast = (s: string) => setNotice(s);
  if (!data)
    return (
      <div className="boot">
        <ForgeMark />
        <h1>RecallForge</h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <a
              className="btn"
              href="/signin-with-chatgpt?return_to=/"
              target="_top"
            >
              Sign in with ChatGPT <ArrowRight size={17} />
            </a>
            <Button
              variant="secondary"
              onClick={() => reload().catch((e) => setError(e.message))}
            >
              Try again
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="spin" size={22} />
            <p>Opening your study space…</p>
          </>
        )}
      </div>
    );
  const a: AppActions = {
    data,
    reload,
    toast,
    go,
    createDeck: () => setModal({ type: "deck" }),
    createSubject: () => setModal({ type: "subject" }),
    importDeck: (id) => setModal({ type: "import", deckId: id }),
    editCard: (card, deckId) => setModal({ type: "card", card, deckId }),
  };
  const section = route.split("/")[0];
  const active =
    section === "deck" ? "library" : section === "session" ? "study" : section;
  const name = data.user.name.split(" ")[0];
  const results = search.trim()
    ? data.decks
        .filter(
          (d) =>
            !d.archived &&
            (
              d.title +
              " " +
              d.description +
              " " +
              data.subjects.find((s) => s.id === d.subjectId)?.name +
              " " +
              d.tags.join(" ") +
              " " +
              data.cards
                .filter((c) => c.deckId === d.id)
                .map((c) => c.front + " " + c.answer.join(" "))
                .join(" ")
            )
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .slice(0, 8)
    : [];
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      {mobile && (
        <button
          className="mobile-scrim"
          aria-label="Close menu"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <a href="#dashboard" className="brand">
          <ForgeMark />
          <span>
            Recall<span>Forge</span>
          </span>
        </a>
        <div className="workspace-pill">
          <span className="workspace-avatar">{name[0]?.toUpperCase()}</span>
          <div>
            <strong>{data.user.name}</strong>
            <small>Personal account</small>
          </div>
          <LockKeyhole size={13} />
        </div>
        <nav aria-label="Main navigation">
          {nav.map(([id, label, Icon]) => (
            <a
              key={id}
              href={`#${id}`}
              className={active === id ? "active" : ""}
              aria-current={active === id ? "page" : undefined}
              title={label}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === "study" && data.stats.due > 0 && <b>{data.stats.due}</b>}
              {id === "tutor" && <small className="ai-pill">AI</small>}
            </a>
          ))}
        </nav>
        <div className="sidebar-subjects">
          <div className="nav-label">
            Subjects
            <IconButton label="Add subject" onClick={a.createSubject}>
              <Plus size={14} />
            </IconButton>
          </div>
          {data.subjects.slice(0, 5).map((s) => (
            <a href={`#library/${s.id}`} key={s.id}>
              <i style={{ background: s.color }} />
              <span>{s.name}</span>
            </a>
          ))}
          {!data.subjects.length && (
            <button onClick={a.createSubject} className="add-subject">
              <Plus size={14} /> Add your first subject
            </button>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-review">
            <span>Daily review</span>
            <strong>
              {data.stats.today}{" "}
              <small>/ {data.settings.dailyGoal} cards</small>
            </strong>
            <Progress
              value={(data.stats.today / data.settings.dailyGoal) * 100}
            />
            <a href="#study">
              Open study modes
              <ChevronRight size={14} />
            </a>
          </div>
          <a
            href="#settings"
            className={
              active === "settings" ? "settings-link active" : "settings-link"
            }
          >
            <Settings2 size={19} />
            <span>Settings</span>
          </a>
          <button
            className="collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={17} />
            ) : (
              <>
                <PanelLeftClose size={17} />
                <span>Collapse sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="topbar-left">
            <IconButton
              label="Open menu"
              className="mobile-menu"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </IconButton>
            <span className="breadcrumb">
              My workspace <ChevronRight size={14} />
              <strong>
                {section === "deck"
                  ? "My Library"
                  : nav.find((n) => n[0] === active)?.[1] || "Settings"}
              </strong>
            </span>
          </div>
          <div className="topbar-right">
            <div className="global-search">
              <Search size={17} />
              <input
                aria-label="Search your library"
                placeholder="Search your library…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <IconButton label="Clear search" onClick={() => setSearch("")}>
                  <X size={13} />
                </IconButton>
              )}
              {search && (
                <div className="search-results">
                  {results.length ? (
                    results.map((d) => (
                      <button key={d.id} onClick={() => go(`deck/${d.id}`)}>
                        <BookOpen size={17} />
                        <div>
                          <strong>{d.title}</strong>
                          <small>
                            {d.count} cards ·{" "}
                            {
                              data.subjects.find((s) => s.id === d.subjectId)
                                ?.name
                            }
                          </small>
                        </div>
                        <ArrowUpRight size={15} />
                      </button>
                    ))
                  ) : (
                    <p>No matching decks or cards.</p>
                  )}
                </div>
              )}
            </div>
            {!data.settings.hideStreak && (
              <span
                className="header-streak"
                title="Study streak in Asia/Manila"
              >
                <Flame size={18} />
                <b>{data.stats.streak.current}</b>
                <span>day streak</span>
              </span>
            )}
            <button
              className="profile-avatar"
              aria-label="Open settings"
              onClick={() => go("settings")}
            >
              {name[0]?.toUpperCase()}
            </button>
          </div>
        </header>
        <main
          className={`content ${section === "session" ? "session-content" : ""}`}
          id="main-content"
          tabIndex={-1}
        >
          {section === "dashboard" && <Dashboard a={a} />}
          {(section === "library" || section === "deck") && (
            <Library a={a} route={route} />
          )}
          {section === "study" && <StudyHome a={a} />}
          {section === "session" && (
            <StudySession a={a} id={route.split("/")[1]} />
          )}
          {section === "tutor" && <Tutor a={a} />}
          {section === "exams" && <Exams a={a} />}
          {section === "statistics" && <Statistics a={a} />}
          {section === "achievements" && <Achievements a={a} />}
          {section === "settings" && <Settings a={a} />}
          {![
            "dashboard",
            "library",
            "deck",
            "study",
            "session",
            "tutor",
            "exams",
            "statistics",
            "achievements",
            "settings",
          ].includes(section) && (
            <Empty
              title="Let’s head back to your desk"
              action={
                <Button onClick={() => go("dashboard")}>Open dashboard</Button>
              }
            >
              This page is unavailable.
            </Empty>
          )}
          <footer className="app-footer">
            <span>
              <LockKeyhole size={12} /> Private workspace
            </span>
            <span>RecallForge · Study at your own pace</span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {nav
          .filter((n) =>
            ["dashboard", "library", "study", "exams"].includes(n[0]),
          )
          .map(([id, label, Icon]) => (
            <a
              key={id}
              href={`#${id}`}
              className={active === id ? "active" : ""}
            >
              <Icon size={21} />
              <span>
                {label === "Dashboard"
                  ? "Home"
                  : label === "My Library"
                    ? "Library"
                    : label}
              </span>
            </a>
          ))}
        <button onClick={() => setMobile(true)}>
          <Menu size={21} />
          <span>More</span>
        </button>
      </nav>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{notice}</span>
          <IconButton
            label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </IconButton>
        </div>
      )}
      {modal?.type === "deck" && (
        <DeckDialog
          a={a}
          onClose={() => setModal(null)}
          onSaved={(id) => {
            setModal(null);
            go(`deck/${id}`);
          }}
        />
      )}
      {modal?.type === "subject" && (
        <SubjectDialog a={a} onClose={() => setModal(null)} />
      )}
      {modal?.type === "card" && (
        <CardEditor
          a={a}
          card={modal.card}
          deckId={modal.deckId}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "import" && (
        <SmartImport
          a={a}
          deckId={modal.deckId}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
export function DeckTile({
  deck,
  a,
  actions,
}: {
  deck: any;
  a: AppActions;
  actions?: ReactNode;
}) {
  return (
    <article
      className="deck-tile"
      style={{ "--deck-color": deck.color } as React.CSSProperties}
    >
      <div className="deck-tile-top">
        <span className="deck-icon">
          <BookOpen size={23} />
        </span>
        {actions || (
          <span className="deck-subject">
            {a.data.subjects.find((s) => s.id === deck.subjectId)?.name ||
              "Subject"}
          </span>
        )}
      </div>
      <a className="deck-title" href={`#deck/${deck.id}`}>
        {deck.title}
      </a>
      <p>{deck.description || "Add a description for this deck."}</p>
      <div className="deck-count">
        <Layers size={13} />
        {deck.count} cards{" "}
        {deck.sample && <span className="sample-label">Sample</span>}
      </div>
      <div className="deck-mastery">
        <Progress value={deck.mastery} />
        <span>{deck.mastery}%</span>
      </div>
      <div className="deck-tile-footer">
        <span>
          {deck.due ? (
            <>
              <i />
              {deck.due} due for review
            </>
          ) : deck.count ? (
            "Ready when you are"
          ) : (
            "Add your first card"
          )}
        </span>
        <a href={`#deck/${deck.id}`} aria-label={`Open ${deck.title}`}>
          <ArrowRight size={16} />
        </a>
      </div>
    </article>
  );
}
