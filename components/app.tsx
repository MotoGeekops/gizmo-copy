"use client";
import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import {
  BookOpen, Layers, Brain, CalendarDays, ChartNoAxesCombined, Trophy,
  Settings2, ArrowRight, ChevronDown, SlidersHorizontal, Check, X, Loader2,
} from "lucide-react";
import { Button, IconButton, ForgeMark, Empty, Progress } from "./ui";
import { request } from "../lib/client";
import { type AppData } from "../lib/types";
import Library, { DeckDialog, SubjectDialog } from "./library";
import Dashboard from "./dashboard";
import { CardEditor } from "./card-editor";
import { StudyHome, StudySession } from "./study";
import SmartImport from "./smart-import";
import { Exams, Statistics, Achievements, Settings, Tutor } from "./pages";

const extraTools = [
  ["study-options", "Study options", SlidersHorizontal],
  ["exams", "Exams", CalendarDays],
  ["statistics", "Statistics", ChartNoAxesCombined],
  ["achievements", "Achievements", Trophy],
  ["tutor", "AI Tutor", Brain],
  ["settings", "Settings", Settings2],
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
    [route, setRoute] = useState("study"),
    [notice, setNotice] = useState(""),
    [modal, setModal] = useState<any>(null);
  const more = useRef<HTMLDetailsElement>(null);
  const reload = useCallback(async () => {
    const next = await request<AppData>("/api/app");
    setData(next);
    setError("");
  }, []);
  useEffect(() => {
    reload().catch((e) => setError(e.message));
    const update = () => {
      setRoute(location.hash.slice(1) || "study");
      more.current?.removeAttribute("open");
      window.scrollTo(0, 0);
    };
    update();
    addEventListener("hashchange", update);
    return () => removeEventListener("hashchange", update);
  }, [reload]);
  useEffect(() => {
    const dismiss = (e: PointerEvent) => {
      document.querySelectorAll<HTMLDetailsElement>(".quiet-more[open]").forEach((menu) => {
        if (!menu.contains(e.target as Node)) menu.removeAttribute("open");
      });
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && more.current?.open) {
        more.current.removeAttribute("open");
        more.current.querySelector("summary")?.focus();
      }
    };
    addEventListener("pointerdown", dismiss);
    addEventListener("keydown", escape);
    return () => {
      removeEventListener("pointerdown", dismiss);
      removeEventListener("keydown", escape);
    };
  }, []);
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
      document.documentElement.dataset.theme = settings.theme === "system"
        ? m.matches ? "dark" : "light" : settings.theme;
      document.documentElement.dataset.motion = settings.reducedMotion ? "reduced" : "normal";
    };
    apply();
    m.addEventListener("change", apply);
    return () => m.removeEventListener("change", apply);
  }, [data?.settings]);
  const go = (s: string) => { location.hash = s; };
  if (!data) return (
    <div className="boot">
      <ForgeMark /><h1>RecallForge</h1>
      {error ? <>
        <p role="alert">{error}</p>
        <a className="btn" href="/signin-with-chatgpt?return_to=/" target="_top">
          Sign in with ChatGPT <ArrowRight size={17} />
        </a>
        <Button variant="secondary" onClick={() => reload().catch((e) => setError(e.message))}>Try again</Button>
      </> : <><Loader2 className="spin" size={22} /><p>Opening your study space…</p></>}
    </div>
  );
  const a: AppActions = {
    data, reload, toast: setNotice, go,
    createDeck: () => setModal({ type: "deck" }),
    createSubject: () => setModal({ type: "subject" }),
    importDeck: (id) => setModal({ type: "import", deckId: id }),
    editCard: (card, deckId) => setModal({ type: "card", card, deckId }),
  };
  const section = route.split("/")[0];
  const home = section === "study" || section === "dashboard";
  const library = section === "library" || section === "deck";
  const session = section === "session";
  const secondary = extraTools.some(([id]) => id === section);
  return (
    <div className={`app-shell quiet-shell ${session ? "focus-session" : ""}`}>
      <a className="skip-link" href="#main-content" onClick={(e) => {
        e.preventDefault(); document.getElementById("main-content")?.focus();
      }}>Skip to content</a>
      {!session && <header className="quiet-header">
        <a href="#study" className="quiet-brand" aria-label="RecallForge home">
          <ForgeMark /><span>RecallForge</span>
        </a>
        <nav className="quiet-nav" aria-label="Main navigation">
          <a href="#study" aria-current={home ? "page" : undefined}><Layers size={18} /><span>Study</span></a>
          <a href="#library" aria-current={library ? "page" : undefined}><BookOpen size={18} /><span>Library</span></a>
          <details className="quiet-more" ref={more}>
            <summary aria-current={secondary ? "page" : undefined}>More <ChevronDown size={15} /></summary>
            <nav className="quiet-menu" aria-label="More tools">
              {extraTools.map(([id, label, Icon]) => (
                <a key={id} href={`#${id}`} aria-current={section === id ? "page" : undefined}>
                  <Icon size={18} /><span>{label}</span>
                </a>
              ))}
            </nav>
          </details>
        </nav>
      </header>}
      <main className={`content quiet-content ${home ? "home-content" : ""} ${session ? "session-content" : ""}`}
        id="main-content" tabIndex={-1}>
        {home && <Dashboard a={a} />}
        {library && <Library a={a} route={route} />}
        {section === "study-options" && <StudyHome a={a} />}
        {session && <StudySession key={route} a={a} id={route.split("/")[1]} />}
        {section === "tutor" && <Tutor a={a} />}
        {section === "exams" && <Exams a={a} />}
        {section === "statistics" && <Statistics a={a} />}
        {section === "achievements" && <Achievements a={a} />}
        {section === "settings" && <Settings a={a} />}
        {!home && !library && !session && !secondary && (
          <Empty title="This page is unavailable" action={<Button onClick={() => go("study")}>Back to study</Button>}>
            Your decks are on your study page.
          </Empty>
        )}
      </main>
      {notice && <div className="toast" role="status">
        <Check size={17} /><span>{notice}</span>
        <IconButton label="Dismiss notification" onClick={() => setNotice("")}><X size={15} /></IconButton>
      </div>}
      {modal?.type === "deck" && <DeckDialog a={a} onClose={() => setModal(null)} onSaved={(id) => { setModal(null); go(`deck/${id}`); }} />}
      {modal?.type === "subject" && <SubjectDialog a={a} onClose={() => setModal(null)} />}
      {modal?.type === "card" && <CardEditor a={a} card={modal.card} deckId={modal.deckId} onClose={() => setModal(null)} />}
      {modal?.type === "import" && <SmartImport a={a} deckId={modal.deckId} onClose={() => setModal(null)} />}
    </div>
  );
}

export function DeckTile({ deck, a, actions }: { deck: any; a: AppActions; actions?: ReactNode }) {
  return (
    <article className="deck-tile" style={{ "--deck-color": deck.color } as React.CSSProperties}>
      <div className="deck-tile-top">
        <span className="deck-icon"><BookOpen size={23} /></span>
        {actions || <span className="deck-subject">{a.data.subjects.find((s) => s.id === deck.subjectId)?.name || "Subject"}</span>}
      </div>
      <a className="deck-title" href={`#deck/${deck.id}`}>{deck.title}</a>
      <p>{deck.description || "Add a description for this deck."}</p>
      <div className="deck-count"><Layers size={13} />{deck.count} cards {deck.sample && <span className="sample-label">Sample</span>}</div>
      <div className="deck-mastery"><Progress value={deck.mastery} /><span>{deck.mastery}%</span></div>
      <div className="deck-tile-footer">
        <span>{deck.due ? <><i />{deck.due} due for review</> : deck.count ? "Ready when you are" : "Add your first card"}</span>
        <a href={`#deck/${deck.id}`} aria-label={`Open ${deck.title}`}><ArrowRight size={16} /></a>
      </div>
    </article>
  );
}
